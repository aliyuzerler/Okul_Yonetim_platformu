package auth

import (
        "errors"
        "time"
)

// Domain errors mapped to distinct HTTP responses by the handler.
var (
        ErrEmailTaken         = errors.New("auth: email taken")
        ErrEmailNotVerified   = errors.New("auth: email not verified")
        ErrInvalidCredentials = errors.New("auth: invalid credentials")
        ErrAccountDisabled    = errors.New("auth: account disabled")
        ErrTokenInvalid       = errors.New("auth: token invalid")
        ErrTenantMissingPlan  = errors.New("auth: tenant has no selected plan")
)

// RegisterRequest is the public school-signup payload.
type RegisterRequest struct {
        SchoolName  string `json:"school_name" validate:"required,min=3,max=255"`
        City        string `json:"city" validate:"omitempty,max=128"`
        Phone       string `json:"phone" validate:"omitempty,max=32"`
        FullName    string `json:"full_name" validate:"required,min=3,max=255"`
        Email       string `json:"email" validate:"required,email,max=255"`
        Password    string `json:"password" validate:"required,min=10,max=128"`
        PlanCode    string `json:"plan_code" validate:"required,min=2,max=32"`
        AcceptTerms bool   `json:"accept_terms"`
}

// ErrTermsNotAccepted is returned when signup arrives without KVKK consent.
var ErrTermsNotAccepted = errors.New("auth: terms not accepted")

// LoginRequest authenticates a platform user.
type LoginRequest struct {
        Email    string `json:"email" validate:"required,email,max=255"`
        Password string `json:"password" validate:"required,max=128"`
}

// ForgotPasswordRequest starts the reset flow.
type ForgotPasswordRequest struct {
        Email string `json:"email" validate:"required,email,max=255"`
}

// ResetPasswordRequest completes the reset flow with the emailed token.
type ResetPasswordRequest struct {
        Token       string `json:"token" validate:"required,max=128"`
        NewPassword string `json:"new_password" validate:"required,min=10,max=128"`
}

// VerifyEmailRequest confirms the signup email with the emailed token.
type VerifyEmailRequest struct {
        Token string `json:"token" validate:"required,max=128"`
}

// ResendVerificationRequest asks for a fresh verification email.
type ResendVerificationRequest struct {
        Email string `json:"email" validate:"required,email,max=255"`
}

// RegisterResponse is returned after a successful signup. It never contains
// a session: the owner must verify the email first.
type RegisterResponse struct {
        TenantID string `json:"tenant_id"`
        Email    string `json:"email"`
        Message  string `json:"message"`
}

// LoginResponse carries the HS256 session token plus the account context.
type LoginResponse struct {
        Token     string    `json:"token"`
        ExpiresAt time.Time `json:"expires_at"`
        Role      string    `json:"role"`
        Email     string    `json:"email"`
        FullName  string    `json:"full_name"`
        Tenant    *TenantView `json:"tenant,omitempty"`
}

// TenantView is the tenant snapshot embedded in auth responses.
type TenantView struct {
        ID     string `json:"id"`
        Name   string `json:"name"`
        Slug   string `json:"slug"`
        Status string `json:"status"`
}

// MeResponse describes the signed-in platform user.
type MeResponse struct {
        ID       string      `json:"id"`
        Email    string      `json:"email"`
        FullName string      `json:"full_name"`
        Role     string      `json:"role"`
        Tenant   *TenantView `json:"tenant,omitempty"`
}

// GenericAcknowledgement is the constant response for forgot-password and
// resend-verification: it must not reveal whether the address exists.
type GenericAcknowledgement struct {
        Message string `json:"message"`
}
