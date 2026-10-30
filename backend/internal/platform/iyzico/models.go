// Package iyzico implements the subset of the iyzico REST v2 API the
// platform needs: subscription checkout forms (monthly auto-renewal),
// one-shot payment checkout forms with card registration (annual), result
// retrieval and webhook signature verification.
//
// It is intentionally dependency-free (net/http + stdlib crypto), following
// the same discipline as the Expo push client in internal/modules/notifications.
// Authentication is iyzico v2: an HMAC-SHA256 signature over
// randomString + uriPath + requestBody, keyed by the secret key, packaged as
// "IYZWSv2 base64(apiKey:randomString:signature)".
//
// NOTE: request/response field names follow docs.iyzipay.com (REST v2).
// The mock mode runs the identical state machine without network access so
// the whole billing flow is exercisable in development and CI; the sandbox
// mode should be validated against real iyzico sandbox credentials before
// enabling live mode (see docs/adr/0012 "Consequences").
package iyzico

// Config carries provider credentials and the pricing-plan mapping.
type Config struct {
	Mode      string // mock | sandbox | live
	BaseURL   string
	APIKey    string
	SecretKey string
	// FrontendURL builds mock payment page URLs in mock mode.
	FrontendURL string
	// PricingPlanRefs maps our plan code to the iyzico subscription
	// pricing-plan reference code (monthly auto-renew), e.g. from
	// IYZICO_PP_STANDART_MONTHLY. Annual plans never need one.
	PricingPlanRefs map[string]string
}

// Customer is the minimal buyer/billing identity iyzico requires.
type Customer struct {
	Name    string
	Surname string
	Email   string
	GSM     string
	City    string
	Address string
}

// CheckoutRequest is shared by both checkout flavors.
type CheckoutRequest struct {
	ConversationID           string // our platform_payments.id
	CallbackURL              string
	PricingPlanReferenceCode string // monthly only
	AmountKurus              int64  // annual only
	BasketName               string
	Customer                 Customer
}

// CheckoutInit is a started checkout: redirect the browser to PageURL.
type CheckoutInit struct {
	Token     string
	PageURL   string
	ExpiresAt string
}

// CheckoutResult is the settled outcome of a checkout form.
type CheckoutResult struct {
	Status                string // "success" | "failure"
	PaymentID             string
	SubscriptionReference string
	ConversationID        string
	FailureMessage        string
}

// Result status constants normalized for the platform.
const (
	ResultSuccess = "success"
	ResultFailure = "failure"
)
