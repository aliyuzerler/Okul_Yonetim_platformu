package billing

import (
        "context"
        "errors"
        "time"

        "github.com/google/uuid"
        "github.com/jackc/pgx/v5"
        "github.com/jackc/pgx/v5/pgxpool"
        "github.com/openschool-org/openschool/internal/platform/models"
)

// Repository reads and writes billing data on the platform database.
type Repository struct {
        pool *pgxpool.Pool
}

// NewRepository builds a billing Repository on the given pool.
func NewRepository(pool *pgxpool.Pool) *Repository {
        return &Repository{pool: pool}
}

// Pool exposes the pool for transactional service operations.
func (r *Repository) Pool() *pgxpool.Pool { return r.pool }

// ActivePlans returns the purchasable catalog ordered for display.
func (r *Repository) ActivePlans(ctx context.Context) ([]models.Plan, error) {
        rows, err := r.pool.Query(ctx, `
                SELECT id, code, name, description, max_students, price_monthly_kurus, price_annual_kurus,
                       trial_days, is_active, sort_order
                FROM platform_plans WHERE is_active = TRUE ORDER BY sort_order, price_monthly_kurus`)
        if err != nil {
                return nil, err
        }
        defer rows.Close()

        var plans []models.Plan
        for rows.Next() {
                var p models.Plan
                if err := rows.Scan(&p.ID, &p.Code, &p.Name, &p.Description, &p.MaxStudents,
                        &p.PriceMonthlyKurus, &p.PriceAnnualKurus, &p.TrialDays, &p.IsActive, &p.SortOrder); err != nil {
                        return nil, err
                }
                plans = append(plans, p)
        }
        return plans, rows.Err()
}

// PlanByCode loads one plan; pgx.ErrNoRows when unknown.
func (r *Repository) PlanByCode(ctx context.Context, code string) (models.Plan, error) {
        row := r.pool.QueryRow(ctx, `
                SELECT id, code, name, description, max_students, price_monthly_kurus, price_annual_kurus,
                       trial_days, is_active, sort_order
                FROM platform_plans WHERE code = $1`, code)
        var p models.Plan
        if err := row.Scan(&p.ID, &p.Code, &p.Name, &p.Description, &p.MaxStudents,
                &p.PriceMonthlyKurus, &p.PriceAnnualKurus, &p.TrialDays, &p.IsActive, &p.SortOrder); err != nil {
                return models.Plan{}, err
        }
        return p, nil
}

// PlanByID loads one plan by primary key.
func (r *Repository) PlanByID(ctx context.Context, id uuid.UUID) (models.Plan, error) {
        row := r.pool.QueryRow(ctx, `
                SELECT id, code, name, description, max_students, price_monthly_kurus, price_annual_kurus,
                       trial_days, is_active, sort_order
                FROM platform_plans WHERE id = $1`, id)
        var p models.Plan
        if err := row.Scan(&p.ID, &p.Code, &p.Name, &p.Description, &p.MaxStudents,
                &p.PriceMonthlyKurus, &p.PriceAnnualKurus, &p.TrialDays, &p.IsActive, &p.SortOrder); err != nil {
                return models.Plan{}, err
        }
        return p, nil
}

// TenantByID loads a tenant.
func (r *Repository) TenantByID(ctx context.Context, id uuid.UUID) (models.Tenant, error) {
        row := r.pool.QueryRow(ctx, `
                SELECT id, name, slug, city, phone, contact_name, status,
                       trial_ends_at, access_state, access_changed_at, created_at, updated_at
                FROM platform_tenants WHERE id = $1`, id)
        var t models.Tenant
        if err := row.Scan(&t.ID, &t.Name, &t.Slug, &t.City, &t.Phone, &t.ContactName, &t.Status,
                &t.TrialEndsAt, &t.AccessState, &t.AccessChangedAt, &t.CreatedAt, &t.UpdatedAt); err != nil {
                return models.Tenant{}, err
        }
        return t, nil
}

// LiveSubscriptionByTenant returns the governing subscription, or nil.
func (r *Repository) LiveSubscriptionByTenant(ctx context.Context, tenantID uuid.UUID) (*models.Subscription, error) {
        row := r.pool.QueryRow(ctx, `
                SELECT id, tenant_id, plan_id, status, billing_cycle, trial_ends_at,
                       current_period_start, current_period_end, cancel_at_period_end,
                       iyzico_customer_ref, iyzico_product_ref, iyzico_subscription_ref, created_at, updated_at
                FROM platform_subscriptions
                WHERE tenant_id = $1 AND status IN ('trialing', 'active', 'past_due')
                ORDER BY created_at DESC LIMIT 1`, tenantID)
        sub, err := scanSubscription(row)
        if errors.Is(err, pgx.ErrNoRows) {
                return nil, nil
        }
        return sub, err
}

// SubscriptionByIyzicoRef finds a subscription by its provider reference.
func (r *Repository) SubscriptionByIyzicoRef(ctx context.Context, ref string) (*models.Subscription, error) {
        row := r.pool.QueryRow(ctx, `
                SELECT id, tenant_id, plan_id, status, billing_cycle, trial_ends_at,
                       current_period_start, current_period_end, cancel_at_period_end,
                       iyzico_customer_ref, iyzico_product_ref, iyzico_subscription_ref, created_at, updated_at
                FROM platform_subscriptions WHERE iyzico_subscription_ref = $1`, ref)
        sub, err := scanSubscription(row)
        if errors.Is(err, pgx.ErrNoRows) {
                return nil, nil
        }
        return sub, err
}

func scanSubscription(row pgx.Row) (*models.Subscription, error) {
        var s models.Subscription
        var cycle *string
        var custRef, prodRef, subRef *string
        if err := row.Scan(&s.ID, &s.TenantID, &s.PlanID, &s.Status, &cycle, &s.TrialEndsAt,
                &s.CurrentPeriodStart, &s.CurrentPeriodEnd, &s.CancelAtPeriodEnd,
                &custRef, &prodRef, &subRef, &s.CreatedAt, &s.UpdatedAt); err != nil {
                return nil, err
        }
        if cycle != nil {
                s.BillingCycle = *cycle
        }
        if custRef != nil {
                s.IyzicoCustomerRef = *custRef
        }
        if prodRef != nil {
                s.IyzicoProductRef = *prodRef
        }
        if subRef != nil {
                s.IyzicoSubscriptionRef = *subRef
        }
        return &s, nil
}

// CreatePayment records a pending payment attempt.
func (r *Repository) CreatePayment(ctx context.Context, p *models.Payment) error {
        _, err := r.pool.Exec(ctx, `
                INSERT INTO platform_payments (id, tenant_id, subscription_id, billing_cycle, amount_kurus,
                                              currency, status, iyzico_token, iyzico_conversation_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                p.ID, p.TenantID, nullableUUID(p.SubscriptionID, p.HasSubscription), p.BillingCycle,
                p.AmountKurus, p.Currency, p.Status, nullableString(p.IyzicoToken), nullableString(p.IyzicoConversationID))
        return err
}

// PaymentByToken loads a payment by its iyzico checkout token.
func (r *Repository) PaymentByToken(ctx context.Context, token string) (*models.Payment, error) {
        row := r.pool.QueryRow(ctx, `
                SELECT id, tenant_id, subscription_id, billing_cycle, amount_kurus, currency, status,
                       failure_reason, iyzico_token, iyzico_payment_id, iyzico_conversation_id, paid_at, created_at
                FROM platform_payments WHERE iyzico_token = $1`, token)
        p, err := scanPayment(row)
        if errors.Is(err, pgx.ErrNoRows) {
                return nil, nil
        }
        return p, err
}

// PaymentByID loads a payment by primary key.
func (r *Repository) PaymentByID(ctx context.Context, id uuid.UUID) (*models.Payment, error) {
        row := r.pool.QueryRow(ctx, `
                SELECT id, tenant_id, subscription_id, billing_cycle, amount_kurus, currency, status,
                       failure_reason, iyzico_token, iyzico_payment_id, iyzico_conversation_id, paid_at, created_at
                FROM platform_payments WHERE id = $1`, id)
        p, err := scanPayment(row)
        if errors.Is(err, pgx.ErrNoRows) {
                return nil, nil
        }
        return p, err
}

func scanPayment(row pgx.Row) (*models.Payment, error) {
        var p models.Payment
        var subID *uuid.UUID
        var failureReason, token, paymentID, conversationID *string
        var paidAt *time.Time
        if err := row.Scan(&p.ID, &p.TenantID, &subID, &p.BillingCycle, &p.AmountKurus, &p.Currency,
                &p.Status, &failureReason, &token, &paymentID, &conversationID, &paidAt, &p.CreatedAt); err != nil {
                return nil, err
        }
        if subID != nil {
                p.SubscriptionID = *subID
                p.HasSubscription = true
        }
        if failureReason != nil {
                p.FailureReason = *failureReason
        }
        if token != nil {
                p.IyzicoToken = *token
        }
        if paymentID != nil {
                p.IyzicoPaymentID = *paymentID
        }
        if conversationID != nil {
                p.IyzicoConversationID = *conversationID
        }
        p.PaidAt = paidAt
        return &p, nil
}

// RecentPaymentsByTenant lists the tenant's latest payment attempts.
func (r *Repository) RecentPaymentsByTenant(ctx context.Context, tenantID uuid.UUID, limit int) ([]models.Payment, error) {
        rows, err := r.pool.Query(ctx, `
                SELECT id, tenant_id, subscription_id, billing_cycle, amount_kurus, currency, status,
                       failure_reason, iyzico_token, iyzico_payment_id, iyzico_conversation_id, paid_at, created_at
                FROM platform_payments WHERE tenant_id = $1
                ORDER BY created_at DESC LIMIT $2`, tenantID, limit)
        if err != nil {
                return nil, err
        }
        defer rows.Close()

        var out []models.Payment
        for rows.Next() {
                p, err := scanPayment(rows)
                if err != nil {
                        return nil, err
                }
                out = append(out, *p)
        }
        return out, rows.Err()
}

// SetPaymentSucceeded finalizes a successful payment.
func (r *Repository) SetPaymentSucceeded(ctx context.Context, paymentID uuid.UUID, iyzicoPaymentID string) error {
        _, err := r.pool.Exec(ctx, `
                UPDATE platform_payments
                SET status = 'succeeded', iyzico_payment_id = NULLIF($2, ''), paid_at = NOW(), updated_at = NOW()
                WHERE id = $1`, paymentID, iyzicoPaymentID)
        return err
}

// SetPaymentFailed finalizes a failed payment with a safe reason.
func (r *Repository) SetPaymentFailed(ctx context.Context, paymentID uuid.UUID, reason string) error {
        _, err := r.pool.Exec(ctx, `
                UPDATE platform_payments
                SET status = 'failed', failure_reason = $2, updated_at = NOW()
                WHERE id = $1`, paymentID, truncate(reason, 500))
        return err
}

// ActivateSubscription moves a subscription to active for one period and
// mirrors the state onto the tenant, in one transaction.
func (r *Repository) ActivateSubscription(ctx context.Context, subID, tenantID uuid.UUID, cycle string, periodEnd time.Time, iyzicoSubRef string) error {
        tx, err := r.pool.Begin(ctx)
        if err != nil {
                return err
        }
        defer tx.Rollback(ctx)

        _, err = tx.Exec(ctx, `
                UPDATE platform_subscriptions
                SET status = 'active', billing_cycle = $2, current_period_start = NOW(),
                    current_period_end = $3, iyzico_subscription_ref = NULLIF($4, ''),
                    cancel_at_period_end = FALSE, updated_at = NOW()
                WHERE id = $1`, subID, cycle, periodEnd, iyzicoSubRef)
        if err != nil {
                return err
        }

        _, err = tx.Exec(ctx, `
                UPDATE platform_tenants
                SET status = 'active', access_state = 'ok', access_changed_at = NOW(), updated_at = NOW()
                WHERE id = $1`, tenantID)
        if err != nil {
                return err
        }

        return tx.Commit(ctx)
}

// MarkPastDue flags both rows after a failed renewal.
func (r *Repository) MarkPastDue(ctx context.Context, subID, tenantID uuid.UUID) error {
        tx, err := r.pool.Begin(ctx)
        if err != nil {
                return err
        }
        defer tx.Rollback(ctx)

        _, err = tx.Exec(ctx, `
                UPDATE platform_subscriptions SET status = 'past_due', updated_at = NOW() WHERE id = $1`, subID)
        if err != nil {
                return err
        }
        _, err = tx.Exec(ctx, `
                UPDATE platform_tenants SET status = 'past_due', access_state = 'read_only',
                                            access_changed_at = NOW(), updated_at = NOW()
                WHERE id = $1`, tenantID)
        if err != nil {
                return err
        }
        return tx.Commit(ctx)
}

// ExpireIfDue moves a trialing subscription whose trial has ended into
// expired and locks the tenant. Idempotent; returns whether it changed.
func (r *Repository) ExpireIfDue(ctx context.Context, subID, tenantID uuid.UUID, trialEnds time.Time) (bool, error) {
        tx, err := r.pool.Begin(ctx)
        if err != nil {
                return false, err
        }
        defer tx.Rollback(ctx)

        tag, err := tx.Exec(ctx, `
                UPDATE platform_subscriptions SET status = 'expired', updated_at = NOW()
                WHERE id = $1 AND status = 'trialing'`, subID)
        if err != nil {
                return false, err
        }
        if tag.RowsAffected() == 0 {
                return false, nil
        }

        _, err = tx.Exec(ctx, `
                UPDATE platform_tenants SET status = 'expired', access_state = 'locked',
                                            access_changed_at = NOW(), updated_at = NOW()
                WHERE id = $1`, tenantID)
        if err != nil {
                return false, err
        }

        // Expire trial bookkeeping on the tenant row too.
        _, err = tx.Exec(ctx, `
                UPDATE platform_tenants SET trial_ends_at = $2 WHERE id = $1 AND trial_ends_at IS NULL`, tenantID, trialEnds)
        if err != nil {
                return false, err
        }

        return true, tx.Commit(ctx)
}

// SyncAccessState persists a recomputed access state when it changed.
func (r *Repository) SyncAccessState(ctx context.Context, tenantID uuid.UUID, state string) error {
        _, err := r.pool.Exec(ctx, `
                UPDATE platform_tenants
                SET access_state = $2, access_changed_at = CASE WHEN access_state <> $2 THEN NOW() ELSE access_changed_at END
                WHERE id = $1`, tenantID, state)
        return err
}

// SetPaymentToken attaches the provider's checkout token to a pending payment.
func (r *Repository) SetPaymentToken(ctx context.Context, paymentID uuid.UUID, token string) error {
        _, err := r.pool.Exec(ctx, `
                UPDATE platform_payments SET iyzico_token = $2, updated_at = NOW() WHERE id = $1`, paymentID, token)
        return err
}

// OwnerEmail returns the tenant owner's login email.
func (r *Repository) OwnerEmail(ctx context.Context, tenantID uuid.UUID) (string, error) {
        var email string
        err := r.pool.QueryRow(ctx, `
                SELECT email FROM platform_users
                WHERE tenant_id = $1 AND role = 'tenant_admin'
                ORDER BY created_at LIMIT 1`, tenantID).Scan(&email)
        if errors.Is(err, pgx.ErrNoRows) {
                return "", nil
        }
        return email, err
}

// RecordEvent appends a lifecycle event.
func (r *Repository) RecordEvent(ctx context.Context, tenantID uuid.UUID, eventType string, data []byte, actor string) error {
        _, err := r.pool.Exec(ctx, `
                INSERT INTO platform_events (id, tenant_id, event_type, data, actor)
                VALUES ($1, $2, $3, $4::jsonb, $5)`, uuid.New(), tenantID, eventType, data, actor)
        return err
}

func nullableUUID(id uuid.UUID, present bool) any {
        if !present {
                return nil
        }
        return id
}

func nullableString(s string) any {
        if s == "" {
                return nil
        }
        return s
}

func truncate(s string, n int) string {
        if len(s) <= n {
                return s
        }
        return s[:n]
}
