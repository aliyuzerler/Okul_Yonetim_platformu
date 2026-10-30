package admin

import (
        "context"
        "database/sql"
        "time"

        "github.com/google/uuid"
        "github.com/jackc/pgx/v5"
        "github.com/jackc/pgx/v5/pgxpool"
)

// Repository reads platform-wide data for the super-admin panel.
type Repository struct {
        pool *pgxpool.Pool
}

// NewRepository builds the admin repository.
func NewRepository(pool *pgxpool.Pool) *Repository {
        return &Repository{pool: pool}
}

// ListTenants returns one page of the directory with owner and subscription.
func (r *Repository) ListTenants(ctx context.Context, query, status string, limit, offset int) ([]TenantListItem, int64, error) {
        where := `
                WHERE ($1 = '' OR t.name ILIKE '%' || $1 || '%' OR t.slug ILIKE '%' || $1 || '%'
                       OR EXISTS (SELECT 1 FROM platform_users u0
                                  WHERE u0.tenant_id = t.id AND u0.role = 'tenant_admin'
                                    AND u0.email ILIKE '%' || $1 || '%'))
                  AND ($2 = '' OR t.status = $2)`

        var total int64
        if err := r.pool.QueryRow(ctx,
                `SELECT COUNT(*) FROM platform_tenants t `+where, query, status).Scan(&total); err != nil {
                return nil, 0, err
        }

        rows, err := r.pool.Query(ctx, `
                SELECT t.id, t.name, t.slug, t.city, t.status, t.access_state, t.created_at,
                       COALESCE(u.email, ''),
                       COALESCE(p.name, ''),
                       COALESCE(s.status, ''),
                       COALESCE(s.billing_cycle, ''),
                       s.trial_ends_at, s.current_period_end
                FROM platform_tenants t
                LEFT JOIN LATERAL (
                    SELECT email FROM platform_users
                    WHERE tenant_id = t.id AND role = 'tenant_admin'
                    ORDER BY created_at LIMIT 1
                ) u ON TRUE
                LEFT JOIN LATERAL (
                    SELECT status, billing_cycle, trial_ends_at, current_period_end, plan_id
                    FROM platform_subscriptions
                    WHERE tenant_id = t.id
                    ORDER BY created_at DESC LIMIT 1
                ) s ON TRUE
                LEFT JOIN platform_plans p ON p.id = s.plan_id
                `+where+`
                ORDER BY t.created_at DESC
                LIMIT $3 OFFSET $4`, query, status, limit, offset)
        if err != nil {
                return nil, 0, err
        }
        defer rows.Close()

        items := make([]TenantListItem, 0)
        for rows.Next() {
                var it TenantListItem
                if err := rows.Scan(&it.ID, &it.Name, &it.Slug, &it.City, &it.Status, &it.AccessState,
                        &it.CreatedAt, &it.OwnerEmail, &it.PlanName, &it.SubStatus, &it.BillingCycle,
                        &it.TrialEndsAt, &it.CurrentPeriodEnd); err != nil {
                        return nil, 0, err
                }
                items = append(items, it)
        }
        if err := rows.Err(); err != nil {
                return nil, 0, err
        }
        return items, total, nil
}

// TenantBase loads the detail header for one tenant: the directory row
// plus the owner's contact fields.
func (r *Repository) TenantBase(ctx context.Context, id uuid.UUID) (TenantListItem, string, string, error) {
        row := r.pool.QueryRow(ctx, `
                SELECT t.id, t.name, t.slug, t.city, t.status, t.access_state, t.created_at,
                       COALESCE(u.email, ''), COALESCE(u.full_name, ''), t.phone,
                       COALESCE(p.name, ''), COALESCE(s.status, ''), COALESCE(s.billing_cycle, ''),
                       s.trial_ends_at, s.current_period_end
                FROM platform_tenants t
                LEFT JOIN LATERAL (
                    SELECT email, full_name FROM platform_users
                    WHERE tenant_id = t.id AND role = 'tenant_admin'
                    ORDER BY created_at LIMIT 1
                ) u ON TRUE
                LEFT JOIN LATERAL (
                    SELECT status, billing_cycle, trial_ends_at, current_period_end, plan_id
                    FROM platform_subscriptions
                    WHERE tenant_id = t.id
                    ORDER BY created_at DESC LIMIT 1
                ) s ON TRUE
                LEFT JOIN platform_plans p ON p.id = s.plan_id
                WHERE t.id = $1`, id)

        var it TenantListItem
        var contact, phone string
        if err := row.Scan(&it.ID, &it.Name, &it.Slug, &it.City, &it.Status, &it.AccessState,
                &it.CreatedAt, &it.OwnerEmail, &contact, &phone, &it.PlanName, &it.SubStatus,
                &it.BillingCycle, &it.TrialEndsAt, &it.CurrentPeriodEnd); err != nil {
                return TenantListItem{}, "", "", err
        }
        return it, contact, phone, nil
}

// TenantContact returns contact fields kept out of the list row.
func (r *Repository) TenantContact(ctx context.Context, id uuid.UUID) (contactName, phone string, err error) {
        err = r.pool.QueryRow(ctx,
                `SELECT contact_name, phone FROM platform_tenants WHERE id = $1`, id).Scan(&contactName, &phone)
        return contactName, phone, err
}

// TenantSubscription loads the latest subscription for the detail view.
func (r *Repository) TenantSubscription(ctx context.Context, id uuid.UUID) (*SubView, error) {
        row := r.pool.QueryRow(ctx, `
                SELECT s.id, s.status, COALESCE(s.billing_cycle, ''), COALESCE(p.name, ''),
                       s.trial_ends_at, s.current_period_end, s.cancel_at_period_end,
                       COALESCE(s.iyzico_subscription_ref, '')
                FROM platform_subscriptions s
                JOIN platform_plans p ON p.id = s.plan_id
                WHERE s.tenant_id = $1
                ORDER BY s.created_at DESC LIMIT 1`, id)

        var v SubView
        var cycle, planName, subRef *string
        if err := row.Scan(&v.ID, &v.Status, &cycle, &planName, &v.TrialEndsAt,
                &v.CurrentPeriodEnd, &v.CancelAtPeriodEnd, &subRef); err != nil {
                if err == pgx.ErrNoRows {
                        return nil, nil
                }
                return nil, err
        }
        if cycle != nil {
                v.BillingCycle = *cycle
        }
        if planName != nil {
                v.PlanName = *planName
        }
        if subRef != nil {
                v.IyzicoSubRef = *subRef
        }
        return &v, nil
}

// TenantPayments lists the tenant's payments.
func (r *Repository) TenantPayments(ctx context.Context, id uuid.UUID, limit int) ([]PaymentRow, error) {
        rows, err := r.pool.Query(ctx, `
                SELECT id, amount_kurus, currency, billing_cycle, status, failure_reason, paid_at, created_at
                FROM platform_payments WHERE tenant_id = $1
                ORDER BY created_at DESC LIMIT $2`, id, limit)
        return scanPayments(rows, err)
}

// ListPayments pages the whole ledger, optionally filtered by status.
func (r *Repository) ListPayments(ctx context.Context, status string, limit, offset int) ([]PaymentRow, int64, error) {
        where := `WHERE ($1 = '' OR status = $1)`

        var total int64
        if err := r.pool.QueryRow(ctx,
                `SELECT COUNT(*) FROM platform_payments `+where, status).Scan(&total); err != nil {
                return nil, 0, err
        }

        rows, err := r.pool.Query(ctx, `
                SELECT p.id, p.amount_kurus, p.currency, p.billing_cycle, p.status, p.failure_reason,
                       p.paid_at, p.created_at, t.name
                FROM platform_payments p
                JOIN platform_tenants t ON t.id = p.tenant_id
                `+where+`
                ORDER BY p.created_at DESC
                LIMIT $2 OFFSET $3`, status, limit, offset)
        if err != nil {
                return nil, 0, err
        }
        defer rows.Close()

        items := make([]PaymentRow, 0)
        for rows.Next() {
                var it PaymentRow
                if err := rows.Scan(&it.ID, &it.AmountKurus, &it.Currency, &it.BillingCycle, &it.Status,
                        &it.FailureReason, &it.PaidAt, &it.CreatedAt, &it.TenantName); err != nil {
                        return nil, 0, err
                }
                items = append(items, it)
        }
        if err := rows.Err(); err != nil {
                return nil, 0, err
        }
        return items, total, nil
}

func scanPayments(rows pgx.Rows, err error) ([]PaymentRow, error) {
        if err != nil {
                return nil, err
        }
        defer rows.Close()

        items := make([]PaymentRow, 0)
        for rows.Next() {
                var it PaymentRow
                if err := rows.Scan(&it.ID, &it.AmountKurus, &it.Currency, &it.BillingCycle, &it.Status,
                        &it.FailureReason, &it.PaidAt, &it.CreatedAt); err != nil {
                        return nil, err
                }
                items = append(items, it)
        }
        return items, rows.Err()
}

// TenantEvents lists the lifecycle log.
func (r *Repository) TenantEvents(ctx context.Context, id uuid.UUID, limit int) ([]EventRow, error) {
        rows, err := r.pool.Query(ctx, `
                SELECT id, event_type, actor, COALESCE(data::text, ''), created_at
                FROM platform_events WHERE tenant_id = $1
                ORDER BY created_at DESC LIMIT $2`, id, limit)
        if err != nil {
                return nil, err
        }
        defer rows.Close()

        items := make([]EventRow, 0)
        for rows.Next() {
                var it EventRow
                if err := rows.Scan(&it.ID, &it.EventType, &it.Actor, &it.Data, &it.CreatedAt); err != nil {
                        return nil, err
                }
                items = append(items, it)
        }
        return items, rows.Err()
}

// ExtendTrial pushes the trial end on both rows by the given days; the
// tenant flips back to 'trial' with full access. Returns the new end.
func (r *Repository) ExtendTrial(ctx context.Context, tenantID uuid.UUID, days int) (newEnd *time.Time, err error) {
        tx, err := r.pool.Begin(ctx)
        if err != nil {
                return nil, err
        }
        defer tx.Rollback(ctx)

        if err := tx.QueryRow(ctx, `
                UPDATE platform_subscriptions
                SET trial_ends_at = GREATEST(trial_ends_at, NOW()) + make_interval(days => $2),
                    status = 'trialing', updated_at = NOW()
                WHERE tenant_id = $1 AND status IN ('trialing', 'expired')
                RETURNING trial_ends_at`, tenantID, days).Scan(&newEnd); err != nil {
                return nil, err
        }

        if _, err := tx.Exec(ctx, `
                UPDATE platform_tenants
                SET trial_ends_at = $2, status = 'trial', access_state = 'ok',
                    access_changed_at = NOW(), updated_at = NOW()
                WHERE id = $1`, tenantID, newEnd); err != nil {
                return nil, err
        }

        return newEnd, tx.Commit(ctx)
}

// SetTenantStatus applies a manual override to tenant and its latest
// subscription, recomputing the access state.
func (r *Repository) SetTenantStatus(ctx context.Context, tenantID uuid.UUID, newStatus, accessState string) error {
        tx, err := r.pool.Begin(ctx)
        if err != nil {
                return err
        }
        defer tx.Rollback(ctx)

        if _, err := tx.Exec(ctx, `
                UPDATE platform_tenants
                SET status = $2, access_state = $3, access_changed_at = NOW(), updated_at = NOW()
                WHERE id = $1`, tenantID, newStatus, accessState); err != nil {
                return err
        }

        subStatus, ok := tenantToSubStatus(newStatus)
        if ok {
                if _, err := tx.Exec(ctx, `
                        UPDATE platform_subscriptions
                        SET status = $2, updated_at = NOW()
                        WHERE tenant_id = $1 AND status IN ('trialing', 'active', 'past_due')`, tenantID, subStatus); err != nil {
                        return err
                }
        }

        return tx.Commit(ctx)
}

// RecordEvent appends an operator action to the lifecycle log.
func (r *Repository) RecordEvent(ctx context.Context, tenantID uuid.UUID, eventType, data, actor string) error {
        _, err := r.pool.Exec(ctx, `
                INSERT INTO platform_events (id, tenant_id, event_type, data, actor)
                VALUES ($1, $2, $3, $4::jsonb, $5)`, uuid.New(), tenantID, eventType, data, actor)
        return err
}

// Summary aggregates the dashboard numbers in one pass.
func (r *Repository) Summary(ctx context.Context) (SummaryResponse, error) {
        var out SummaryResponse

        var mrrMonthly, mrrAnnual sql.NullInt64
        err := r.pool.QueryRow(ctx, `
                SELECT
                    COALESCE(SUM(CASE WHEN s.billing_cycle = 'monthly' THEN p.price_monthly_kurus ELSE 0 END), 0),
                    COALESCE(SUM(CASE WHEN s.billing_cycle = 'annual' THEN p.price_annual_kurus ELSE 0 END), 0)
                FROM platform_subscriptions s
                JOIN platform_plans p ON p.id = s.plan_id
                WHERE s.status = 'active'`).Scan(&mrrMonthly, &mrrAnnual)
        if err != nil {
                return out, err
        }
        out.MRRKurus = mrrMonthly.Int64 + mrrAnnual.Int64/12
        out.ARRKurus = out.MRRKurus * 12

        counts := []struct {
                status string
                dst    *int64
        }{
                {"active", &out.TenantCounts.Active},
                {"trial", &out.TenantCounts.Trial},
                {"past_due", &out.TenantCounts.PastDue},
                {"expired", &out.TenantCounts.Expired},
                {"cancelled", &out.TenantCounts.Cancelled},
                {"pending_verification", &out.TenantCounts.Pending},
        }
        for _, c := range counts {
                if err := r.pool.QueryRow(ctx,
                        `SELECT COUNT(*) FROM platform_tenants WHERE status = $1`, c.status).Scan(c.dst); err != nil {
                        return out, err
                }
        }

        if err := r.pool.QueryRow(ctx, `
                SELECT COALESCE(SUM(amount_kurus), 0) FROM platform_payments
                WHERE status = 'succeeded' AND paid_at > NOW() - INTERVAL '30 days'`).Scan(&out.Revenue30dKurus); err != nil {
                return out, err
        }

        rows, err := r.pool.Query(ctx, `
                SELECT to_char(date_trunc('month', paid_at), 'YYYY-MM'), COALESCE(SUM(amount_kurus), 0)
                FROM platform_payments
                WHERE status = 'succeeded' AND paid_at > NOW() - INTERVAL '6 months'
                GROUP BY 1 ORDER BY 1`)
        if err != nil {
                return out, err
        }
        defer rows.Close()
        for rows.Next() {
                var pt MonthPoint
                if err := rows.Scan(&pt.Month, &pt.AmountKurus); err != nil {
                        return out, err
                }
                out.RevenueByMonth = append(out.RevenueByMonth, pt)
        }
        if err := rows.Err(); err != nil {
                return out, err
        }

        // Trial → paid conversion: tenants with any successful payment over all
        // tenants that ever had a subscription.
        var converted, trialed int64
        if err := r.pool.QueryRow(ctx, `
                SELECT
                    COUNT(DISTINCT CASE WHEN pay.status = 'succeeded' THEN pay.tenant_id END),
                    COUNT(DISTINCT pay.tenant_id)
                FROM platform_payments pay`).Scan(&converted, &trialed); err != nil {
                return out, err
        }
        if trialed > 0 {
                out.TrialConversion = float64(converted) / float64(trialed)
        }

        return out, nil
}

func tenantToSubStatus(tenantStatus string) (string, bool) {
        switch tenantStatus {
        case "active":
                return "active", true
        case "past_due":
                return "past_due", true
        case "expired":
                return "expired", true
        case "cancelled":
                return "cancelled", true
        default:
                return "", false
        }
}
