// Package admin exposes the super-admin (platform staff) surface: tenant
// directory with search, tenant detail with lifecycle history, manual
// overrides, payment ledger and the revenue summary that powers the
// platform dashboard.
package admin

import (
	"time"

	"github.com/google/uuid"
)

// TenantListItem is one row of the tenant directory.
type TenantListItem struct {
	ID              string     `json:"id"`
	Name            string     `json:"name"`
	Slug            string     `json:"slug"`
	City            string     `json:"city"`
	Status          string     `json:"status"`
	AccessState     string     `json:"access_state"`
	OwnerEmail      string     `json:"owner_email"`
	PlanName        string     `json:"plan_name,omitempty"`
	SubStatus       string     `json:"sub_status,omitempty"`
	BillingCycle    string     `json:"billing_cycle,omitempty"`
	TrialEndsAt     *time.Time `json:"trial_ends_at,omitempty"`
	CurrentPeriodEnd *time.Time `json:"current_period_end,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

// TenantDetail is the full tenant dossier for the admin drawer.
type TenantDetail struct {
	Tenant       TenantListItem `json:"tenant"`
	ContactName  string         `json:"contact_name"`
	Phone        string         `json:"phone"`
	Subscription *SubView       `json:"subscription,omitempty"`
	Payments     []PaymentRow   `json:"payments"`
	Events       []EventRow     `json:"events"`
}

// SubView is the admin-facing subscription snapshot.
type SubView struct {
	ID                string     `json:"id"`
	Status            string     `json:"status"`
	BillingCycle      string     `json:"billing_cycle,omitempty"`
	PlanName          string     `json:"plan_name,omitempty"`
	TrialEndsAt       *time.Time `json:"trial_ends_at,omitempty"`
	CurrentPeriodEnd  *time.Time `json:"current_period_end,omitempty"`
	CancelAtPeriodEnd bool       `json:"cancel_at_period_end"`
	IyzicoSubRef      string     `json:"iyzico_subscription_ref,omitempty"`
}

// PaymentRow is one payment ledger entry.
type PaymentRow struct {
	ID           string     `json:"id"`
	TenantName   string     `json:"tenant_name,omitempty"`
	AmountKurus  int64      `json:"amount_kurus"`
	Currency     string     `json:"currency"`
	BillingCycle string     `json:"billing_cycle"`
	Status       string     `json:"status"`
	FailureReason string    `json:"failure_reason,omitempty"`
	PaidAt       *time.Time `json:"paid_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

// EventRow is one lifecycle log entry.
type EventRow struct {
	ID        uuid.UUID `json:"id"`
	EventType string    `json:"event_type"`
	Actor     string    `json:"actor"`
	Data      string    `json:"data,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// TenantListResponse is a page of the directory.
type TenantListResponse struct {
	Items    []TenantListItem `json:"items"`
	Total    int64            `json:"total"`
	Page     int              `json:"page"`
	PageSize int              `json:"page_size"`
}

// PaymentListResponse is a page of the ledger.
type PaymentListResponse struct {
	Items    []PaymentRow `json:"items"`
	Total    int64        `json:"total"`
	Page     int          `json:"page"`
	PageSize int          `json:"page_size"`
}

// SummaryResponse powers the platform dashboard cards.
type SummaryResponse struct {
	TenantCounts   TenantCounts `json:"tenant_counts"`
	MRRKurus       int64        `json:"mrr_kurus"`
	ARRKurus       int64        `json:"arr_kurus"`
	Revenue30dKurus int64       `json:"revenue_30d_kurus"`
	TrialConversion float64     `json:"trial_conversion_rate"`
	RevenueByMonth []MonthPoint `json:"revenue_by_month"`
}

// TenantCounts aggregates tenants per status.
type TenantCounts struct {
	Active    int64 `json:"active"`
	Trial     int64 `json:"trial"`
	PastDue   int64 `json:"past_due"`
	Expired   int64 `json:"expired"`
	Cancelled int64 `json:"cancelled"`
	Pending   int64 `json:"pending_verification"`
}

// MonthPoint is one month of collected revenue.
type MonthPoint struct {
	Month       string `json:"month"` // YYYY-MM
	AmountKurus int64  `json:"amount_kurus"`
}

// TenantAction is a manual operator override.
type TenantAction struct {
	Action        string `json:"action" validate:"required,oneof=extend_trial set_status"`
	TrialDays     int    `json:"trial_days,omitempty"`
	NewStatus     string `json:"new_status,omitempty" validate:"omitempty,oneof=active past_due expired cancelled"`
}
