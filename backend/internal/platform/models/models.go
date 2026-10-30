// Package models holds the control plane's shared domain types. Handlers
// never serialize them directly; each module maps to its own response
// shapes so internal columns (e.g. password hashes) cannot leak.
package models

import (
	"time"

	"github.com/google/uuid"
)

// Tenant lifecycle states (platform_tenants.status).
const (
	TenantPendingVerification = "pending_verification"
	TenantTrial               = "trial"
	TenantActive              = "active"
	TenantPastDue             = "past_due"
	TenantExpired             = "expired"
	TenantCancelled           = "cancelled"
)

// Subscription lifecycle states (platform_subscriptions.status).
const (
	SubTrialing = "trialing"
	SubActive   = "active"
	SubPastDue  = "past_due"
	SubExpired  = "expired"
	SubCancelled = "cancelled"
)

// Billing cycles.
const (
	CycleMonthly = "monthly"
	CycleAnnual  = "annual"
)

// Access states returned to the school instance and panels (ADR 0012).
const (
	AccessOK       = "ok"
	AccessReadOnly = "read_only"
	AccessLocked   = "locked"
)

// Platform roles.
const (
	RoleSuperAdmin  = "super_admin"
	RoleTenantAdmin = "tenant_admin"
)

// Plan is one subscription tier.
type Plan struct {
	ID                uuid.UUID `json:"id"`
	Code              string    `json:"code"`
	Name              string    `json:"name"`
	Description       string    `json:"description"`
	MaxStudents       int       `json:"max_students"` // 0 = unlimited
	PriceMonthlyKurus int64     `json:"price_monthly_kurus"`
	PriceAnnualKurus  int64     `json:"price_annual_kurus"`
	TrialDays         int       `json:"trial_days"`
	IsActive          bool      `json:"is_active"`
	SortOrder         int       `json:"sort_order"`
}

// Tenant is one customer school in the control plane.
type Tenant struct {
	ID              uuid.UUID
	Name            string
	Slug            string
	City            string
	Phone           string
	ContactName     string
	Status          string
	TrialEndsAt     *time.Time
	AccessState     string
	AccessChangedAt *time.Time
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// User is a platform account (tenant owner or super admin).
type User struct {
	ID            uuid.UUID
	TenantID      uuid.UUID // nil for super admins
	HasTenant     bool
	Email         string
	FullName      string
	PasswordHash  string
	Role          string
	EmailVerified bool
	Status        string
	LastLoginAt   *time.Time
	CreatedAt     time.Time
}

// Subscription is the commercial state of a tenant.
type Subscription struct {
	ID                     uuid.UUID
	TenantID               uuid.UUID
	PlanID                 uuid.UUID
	Status                 string
	BillingCycle           string // "" while trialing
	TrialEndsAt            *time.Time
	CurrentPeriodStart     *time.Time
	CurrentPeriodEnd       *time.Time
	CancelAtPeriodEnd      bool
	IyzicoCustomerRef      string
	IyzicoProductRef       string
	IyzicoSubscriptionRef  string
	CreatedAt              time.Time
	UpdatedAt              time.Time
}

// Payment is one payment or payment attempt.
type Payment struct {
	ID                   uuid.UUID
	TenantID             uuid.UUID
	SubscriptionID       uuid.UUID
	HasSubscription      bool
	BillingCycle         string
	AmountKurus          int64
	Currency             string
	Status               string
	FailureReason        string
	IyzicoToken          string
	IyzicoPaymentID      string
	IyzicoConversationID string
	PaidAt               *time.Time
	CreatedAt            time.Time
}

// Event is one control-plane lifecycle record.
type Event struct {
	ID        uuid.UUID
	TenantID  uuid.UUID
	HasTenant bool
	EventType string
	Data      []byte
	Actor     string
	CreatedAt time.Time
}

// IsLive reports whether the subscription still governs the tenant's access.
func (s *Subscription) IsLive() bool {
	return s.Status == SubTrialing || s.Status == SubActive || s.Status == SubPastDue
}
