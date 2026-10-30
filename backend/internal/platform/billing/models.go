// Package billing owns the platform's money surface: plan catalog reads,
// subscription status with access-state computation (ok / read_only /
// locked), iyzico checkout orchestration (hybrid: monthly auto-renew
// subscription + annual one-shot, ADR 0012) and webhook handling.
package billing

import (
        "errors"
        "time"

        "github.com/openschool-org/openschool/internal/platform/models"
)

// Domain errors mapped to HTTP responses by the handler.
var (
        ErrNoTenant           = errors.New("billing: caller has no tenant")
        ErrPlanNotFound       = errors.New("billing: plan not found")
        ErrSubscriptionState  = errors.New("billing: subscription state does not allow checkout")
        ErrCheckoutNotFound   = errors.New("billing: checkout token unknown")
        ErrPlanNotMapped      = errors.New("billing: plan not mapped to iyzico pricing plan")
        ErrProviderFailure    = errors.New("billing: payment provider returned an error")
        ErrTenantPending      = errors.New("billing: tenant still pending email verification")
)

// SubscriptionStatusResponse is the tenant panel's billing snapshot.
type SubscriptionStatusResponse struct {
        Tenant          TenantBrief      `json:"tenant"`
        Subscription    *SubscriptionView `json:"subscription"`
        AccessState     string           `json:"access_state"`
        CheckoutAllowed bool             `json:"checkout_allowed"`
        PlanOptions     []PlanView       `json:"plan_options"`
        Payments        []PaymentView    `json:"payments"`
}

// TenantBrief is the tenant part of billing responses.
type TenantBrief struct {
        ID          string     `json:"id"`
        Name        string     `json:"name"`
        Slug        string     `json:"slug"`
        Status      string     `json:"status"`
        TrialEndsAt *time.Time `json:"trial_ends_at,omitempty"`
}

// SubscriptionView is the live subscription (nil when none exists).
type SubscriptionView struct {
        ID                string     `json:"id"`
        Status            string     `json:"status"`
        BillingCycle      string     `json:"billing_cycle,omitempty"`
        TrialEndsAt       *time.Time `json:"trial_ends_at,omitempty"`
        DaysRemaining     *int       `json:"days_remaining,omitempty"`
        CurrentPeriodEnd  *time.Time `json:"current_period_end,omitempty"`
        CancelAtPeriodEnd bool       `json:"cancel_at_period_end"`
        Plan              PlanView   `json:"plan"`
}

// PlanView is the customer-facing plan card.
type PlanView struct {
        Code              string `json:"code"`
        Name              string `json:"name"`
        Description       string `json:"description"`
        MaxStudents       int    `json:"max_students"`
        PriceMonthlyKurus int64  `json:"price_monthly_kurus"`
        PriceAnnualKurus  int64  `json:"price_annual_kurus"`
        TrialDays         int    `json:"trial_days"`
}

// PaymentView is one row of the tenant's payment history.
type PaymentView struct {
        ID          string     `json:"id"`
        BillingCycle string    `json:"billing_cycle"`
        AmountKurus int64      `json:"amount_kurus"`
        Currency    string     `json:"currency"`
        Status      string     `json:"status"`
        FailureReason string   `json:"failure_reason,omitempty"`
        PaidAt      *time.Time `json:"paid_at,omitempty"`
        CreatedAt   time.Time  `json:"created_at"`
}

// CheckoutRequest selects plan and cycle for the hybrid model.
type CheckoutRequest struct {
        PlanCode     string `json:"plan_code" validate:"required,min=2,max=32"`
        BillingCycle string `json:"billing_cycle" validate:"required,oneof=monthly annual"`
}

// CheckoutResponse points the browser at the payment page.
type CheckoutResponse struct {
        PaymentID    string `json:"payment_id"`
        CheckoutURL  string `json:"checkout_url"`
        Provider     string `json:"provider"` // "iyzico" | "mock"
        AmountKurus  int64  `json:"amount_kurus"`
        BillingCycle string `json:"billing_cycle"`
}

// CheckoutResultResponse is the post-payment outcome shown on the result page.
type CheckoutResultResponse struct {
        Status      string `json:"status"` // pending | succeeded | failed
        Message     string `json:"message"`
        AmountKurus int64  `json:"amount_kurus,omitempty"`
        BillingCycle string `json:"billing_cycle,omitempty"`
        PaymentID   string `json:"payment_id,omitempty"`
}

// planViewFrom maps the internal plan to the customer card.
func planViewFrom(p models.Plan) PlanView {
        return PlanView{
                Code:              p.Code,
                Name:              p.Name,
                Description:       p.Description,
                MaxStudents:       p.MaxStudents,
                PriceMonthlyKurus: p.PriceMonthlyKurus,
                PriceAnnualKurus:  p.PriceAnnualKurus,
                TrialDays:         p.TrialDays,
        }
}

// amountFor returns the plan price for the billing cycle in kuruş.
func amountFor(p models.Plan, cycle string) int64 {
        if cycle == models.CycleAnnual {
                return p.PriceAnnualKurus
        }
        return p.PriceMonthlyKurus
}

// CheckoutAllowed reports whether the tenant may start a new checkout.
// Active tenants already pay; plan changes are a later phase (ADR 0012).
func checkoutAllowed(tenantStatus string) bool {
        switch tenantStatus {
        case models.TenantTrial, models.TenantExpired, models.TenantPastDue, models.TenantCancelled:
                return true
        default:
                return false
        }
}

// AccessStateFor computes the school instance's access state from its live
// subscription. This is the rule the kilit+uyarı system (Faz 3 school-side
// banner) will poll.
//
//      trial running            -> ok
//      trial ended              -> read_only (veriler okunur, yazım kilitli)
//      past_due                 -> read_only
//      expired / cancelled      -> locked
func AccessStateFor(sub *models.Subscription, now time.Time) string {
        if sub == nil {
                return models.AccessLocked
        }
        switch sub.Status {
        case models.SubActive:
                return models.AccessOK
        case models.SubTrialing:
                if sub.TrialEndsAt != nil && sub.TrialEndsAt.After(now) {
                        return models.AccessOK
                }
                return models.AccessReadOnly
        case models.SubPastDue:
                return models.AccessReadOnly
        default: // expired, cancelled, unknown
                return models.AccessLocked
        }
}

// daysRemaining counts whole days left in the trial.
func daysRemaining(until *time.Time, now time.Time) *int {
        if until == nil {
                return nil
        }
        days := int(until.Sub(now).Hours() / 24)
        if until.Before(now) {
                days = 0
        }
        return &days
}
