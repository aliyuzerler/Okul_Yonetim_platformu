package auth

import (
        "context"
        "errors"
        "time"

        "github.com/google/uuid"
        "github.com/jackc/pgx/v5"
        "github.com/jackc/pgx/v5/pgconn"
        "github.com/jackc/pgx/v5/pgxpool"
        "github.com/openschool-org/openschool/internal/platform/models"
)

// DB is the subset of pgx pool/tx used by this repository, so writes can run
// inside one transaction.
type DB interface {
        Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
        Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
        QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// Repository reads and writes platform auth data.
type Repository struct {
        pool *pgxpool.Pool
}

// NewRepository builds a Repository on the given pool.
func NewRepository(pool *pgxpool.Pool) *Repository {
        return &Repository{pool: pool}
}

// Pool exposes the pool for services that need to open transactions.
func (r *Repository) Pool() *pgxpool.Pool { return r.pool }

// EmailExists reports whether any platform user already uses the address.
func (r *Repository) EmailExists(ctx context.Context, email string) (bool, error) {
        var exists bool
        err := r.pool.QueryRow(ctx,
                `SELECT EXISTS (SELECT 1 FROM platform_users WHERE email = $1)`, email,
        ).Scan(&exists)
        return exists, err
}

// CreateTenantWithUser inserts the tenant and its owner inside one
// transaction; both rows or neither.
func (r *Repository) CreateTenantWithUser(ctx context.Context, tenant *models.Tenant, planID uuid.UUID, user *models.User) error {
        tx, err := r.pool.Begin(ctx)
        if err != nil {
                return err
        }
        defer tx.Rollback(ctx)

        _, err = tx.Exec(ctx, `
                INSERT INTO platform_tenants (id, name, slug, city, phone, contact_name, selected_plan_id, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                tenant.ID, tenant.Name, tenant.Slug, tenant.City, tenant.Phone, tenant.ContactName,
                planID, tenant.Status)
        if err != nil {
                return err
        }

        _, err = tx.Exec(ctx, `
                INSERT INTO platform_users (id, tenant_id, email, full_name, password_hash, role, email_verified, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                user.ID, user.TenantID, user.Email, user.FullName, user.PasswordHash, user.Role,
                user.EmailVerified, user.Status)
        if err != nil {
                return err
        }

        return tx.Commit(ctx)
}

// UserByEmail loads a user row; pgx.ErrNoRows when absent.
func (r *Repository) UserByEmail(ctx context.Context, email string) (models.User, error) {
        row := r.pool.QueryRow(ctx, `
                SELECT id, tenant_id, email, full_name, password_hash, role, email_verified, status, last_login_at, created_at
                FROM platform_users WHERE email = $1`, email)
        return scanUser(row)
}

// UserByID loads a user row by primary key.
func (r *Repository) UserByID(ctx context.Context, id uuid.UUID) (models.User, error) {
        row := r.pool.QueryRow(ctx, `
                SELECT id, tenant_id, email, full_name, password_hash, role, email_verified, status, last_login_at, created_at
                FROM platform_users WHERE id = $1`, id)
        return scanUser(row)
}

func scanUser(row pgx.Row) (models.User, error) {
        var u models.User
        var tenantID *uuid.UUID
        var lastLogin *time.Time
        if err := row.Scan(&u.ID, &tenantID, &u.Email, &u.FullName, &u.PasswordHash, &u.Role,
                &u.EmailVerified, &u.Status, &lastLogin, &u.CreatedAt); err != nil {
                return models.User{}, err
        }
        if tenantID != nil {
                u.TenantID = *tenantID
                u.HasTenant = true
        }
        u.LastLoginAt = lastLogin
        return u, nil
}

// TouchLogin records a successful sign-in.
func (r *Repository) TouchLogin(ctx context.Context, userID uuid.UUID) error {
        _, err := r.pool.Exec(ctx,
                `UPDATE platform_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`, userID)
        return err
}

// MarkEmailVerified flips the verification flag.
func (r *Repository) MarkEmailVerified(ctx context.Context, userID uuid.UUID) error {
        _, err := r.pool.Exec(ctx,
                `UPDATE platform_users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1`, userID)
        return err
}

// SetPassword stores a freshly derived password hash.
func (r *Repository) SetPassword(ctx context.Context, userID uuid.UUID, hash string) error {
        _, err := r.pool.Exec(ctx,
                `UPDATE platform_users SET password_hash = $2, updated_at = NOW() WHERE id = $1`, userID, hash)
        return err
}

// SlugTaken reports whether the tenant slug is already in use.
func (r *Repository) SlugTaken(ctx context.Context, slug string) (bool, error) {
        var exists bool
        err := r.pool.QueryRow(ctx,
                `SELECT EXISTS (SELECT 1 FROM platform_tenants WHERE slug = $1)`, slug,
        ).Scan(&exists)
        return exists, err
}

// TenantByID loads a tenant row.
func (r *Repository) TenantByID(ctx context.Context, id uuid.UUID) (models.Tenant, error) {
        row := r.pool.QueryRow(ctx, `
                SELECT id, name, slug, city, phone, contact_name, status,
                       trial_ends_at, access_state, access_changed_at, created_at, updated_at
                FROM platform_tenants WHERE id = $1`, id)
        return scanTenant(row)
}

// TenantByUserID loads the tenant belonging to a platform user.
func (r *Repository) TenantByUserID(ctx context.Context, userID uuid.UUID) (models.Tenant, error) {
        row := r.pool.QueryRow(ctx, `
                SELECT t.id, t.name, t.slug, t.city, t.phone, t.contact_name, t.status,
                       t.trial_ends_at, t.access_state, t.access_changed_at, t.created_at, t.updated_at
                FROM platform_tenants t
                JOIN platform_users u ON u.tenant_id = t.id
                WHERE u.id = $1`, userID)
        return scanTenant(row)
}

func scanTenant(row pgx.Row) (models.Tenant, error) {
        var t models.Tenant
        if err := row.Scan(&t.ID, &t.Name, &t.Slug, &t.City, &t.Phone, &t.ContactName, &t.Status,
                &t.TrialEndsAt, &t.AccessState, &t.AccessChangedAt, &t.CreatedAt, &t.UpdatedAt); err != nil {
                return models.Tenant{}, err
        }
        return t, nil
}

// InsertEmailToken stores the SHA-256 hash of a one-time email token.
func (r *Repository) InsertEmailToken(ctx context.Context, id uuid.UUID, userID uuid.UUID, tokenType, tokenHash string, expiresAt time.Time) error {
        _, err := r.pool.Exec(ctx, `
                INSERT INTO platform_email_tokens (id, user_id, token_type, token_hash, expires_at)
                VALUES ($1, $2, $3, $4, $5)`, id, userID, tokenType, tokenHash, expiresAt)
        return err
}

// ClaimEmailToken atomically converts an unused, unexpired token into a used
// one and returns its owner. Concurrent callers cannot both succeed.
func (r *Repository) ClaimEmailToken(ctx context.Context, tokenHash, tokenType string) (uuid.UUID, error) {
        var userID uuid.UUID
        err := r.pool.QueryRow(ctx, `
                UPDATE platform_email_tokens
                SET used_at = NOW()
                WHERE token_hash = $1 AND token_type = $2 AND used_at IS NULL AND expires_at > NOW()
                RETURNING user_id`, tokenHash, tokenType).Scan(&userID)
        if errors.Is(err, pgx.ErrNoRows) {
                return uuid.Nil, ErrTokenInvalid
        }
        return userID, err
}

// PlanByCode loads an active plan by its catalog code.
func (r *Repository) PlanByCode(ctx context.Context, code string) (models.Plan, error) {
        row := r.pool.QueryRow(ctx, `
                SELECT id, code, name, description, max_students, price_monthly_kurus, price_annual_kurus,
                       trial_days, is_active, sort_order
                FROM platform_plans WHERE code = $1`, code)
        return scanPlan(row)
}

// PlanByTenantSelection loads the plan the tenant chose at registration.
func (r *Repository) PlanByTenantSelection(ctx context.Context, tenantID uuid.UUID) (models.Plan, error) {
        row := r.pool.QueryRow(ctx, `
                SELECT p.id, p.code, p.name, p.description, p.max_students, p.price_monthly_kurus,
                       p.price_annual_kurus, p.trial_days, p.is_active, p.sort_order
                FROM platform_plans p
                JOIN platform_tenants t ON t.selected_plan_id = p.id
                WHERE t.id = $1`, tenantID)
        return scanPlan(row)
}

func scanPlan(row pgx.Row) (models.Plan, error) {
        var p models.Plan
        if err := row.Scan(&p.ID, &p.Code, &p.Name, &p.Description, &p.MaxStudents,
                &p.PriceMonthlyKurus, &p.PriceAnnualKurus, &p.TrialDays, &p.IsActive, &p.SortOrder); err != nil {
                return models.Plan{}, err
        }
        return p, nil
}

// StartTrial flips a pending tenant into its trial and creates the trialing
// subscription row, inside one transaction.
func (r *Repository) StartTrial(ctx context.Context, tenantID, planID uuid.UUID, trialEnds time.Time) error {
        tx, err := r.pool.Begin(ctx)
        if err != nil {
                return err
        }
        defer tx.Rollback(ctx)

        _, err = tx.Exec(ctx, `
                UPDATE platform_tenants
                SET status = 'trial', trial_ends_at = $2, access_state = 'ok', access_changed_at = NOW(), updated_at = NOW()
                WHERE id = $1`, tenantID, trialEnds)
        if err != nil {
                return err
        }

        _, err = tx.Exec(ctx, `
                INSERT INTO platform_subscriptions (id, tenant_id, plan_id, status, trial_ends_at)
                VALUES ($1, $2, $3, 'trialing', $4)`, uuid.New(), tenantID, planID, trialEnds)
        if err != nil {
                return err
        }

        return tx.Commit(ctx)
}


func (r *Repository) CountSuperAdmins(ctx context.Context) (int64, error) {
        var n int64
        err := r.pool.QueryRow(ctx,
                `SELECT COUNT(*) FROM platform_users WHERE role = 'super_admin'`).Scan(&n)
        return n, err
}

// CreateSuperAdmin inserts a platform staff account.
func (r *Repository) CreateSuperAdmin(ctx context.Context, id uuid.UUID, email, fullName, passwordHash string) error {
        _, err := r.pool.Exec(ctx, `
                INSERT INTO platform_users (id, tenant_id, email, full_name, password_hash, role, email_verified, status)
                VALUES ($1, NULL, $2, $3, $4, 'super_admin', TRUE, 'active')`, id, email, fullName, passwordHash)
        return err
}
