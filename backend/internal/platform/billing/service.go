package billing

import (
        "context"
        "encoding/json"
        "errors"
        "log"
        "strings"
        "time"

        "github.com/google/uuid"
        "github.com/jackc/pgx/v5"
        "github.com/openschool-org/openschool/internal/platform/iyzico"
        "github.com/openschool-org/openschool/internal/platform/models"
)

// Provider is the payment-provider seam. The real implementation is
// *iyzico.Client; mock mode runs the same state machine offline.
type Provider interface {
        StartSubscriptionCheckout(ctx context.Context, req iyzico.CheckoutRequest) (iyzico.CheckoutInit, error)
        StartPaymentCheckout(ctx context.Context, req iyzico.CheckoutRequest) (iyzico.CheckoutInit, error)
        RetrieveCheckout(ctx context.Context, token string) (iyzico.CheckoutResult, error)
        SettleMock(token string, success bool) (iyzico.CheckoutResult, error)
        VerifyWebhook(eventToken, signature string) bool
        Mock() bool
}

// Service orchestrates plans, subscriptions, checkout and webhooks.
type Service struct {
        repo       *Repository
        provider   Provider
        backendURL string
        // monthlyRefs maps our plan code to the iyzico subscription pricing-plan
        // reference for monthly auto-renewal. Empty in mock mode.
        monthlyRefs map[string]string

        now func() time.Time
}

// NewService wires the billing service.
func NewService(repo *Repository, provider Provider, backendURL string, monthlyRefs map[string]string) *Service {
        return &Service{
                repo:        repo,
                provider:    provider,
                backendURL:  backendURL,
                monthlyRefs: monthlyRefs,
                now:         time.Now,
        }
}

// Plans returns the purchasable catalog.
func (s *Service) Plans(ctx context.Context) ([]PlanView, error) {
        plans, err := s.repo.ActivePlans(ctx)
        if err != nil {
                return nil, err
        }
        out := make([]PlanView, 0, len(plans))
        for _, p := range plans {
                out = append(out, planViewFrom(p))
        }
        return out, nil
}

// Status is the tenant panel snapshot; it also lazily expires a finished
// trial, so no separate cron is needed for correctness (a webhookless
// deployment stays consistent).
func (s *Service) Status(ctx context.Context, tenantID uuid.UUID) (*SubscriptionStatusResponse, error) {
        tenant, err := s.repo.TenantByID(ctx, tenantID)
        if err != nil {
                return nil, err
        }

        sub, err := s.ensureFreshSubscription(ctx, tenant)
        if err != nil {
                return nil, err
        }

        now := s.now()
        state := AccessStateFor(sub, now)
        if tenant.AccessState != state {
                if err := s.repo.SyncAccessState(ctx, tenantID, state); err != nil {
                        return nil, err
                }
        }

        resp := &SubscriptionStatusResponse{
                AccessState:     state,
                CheckoutAllowed: checkoutAllowed(tenant.Status),
        }

        resp.Tenant = TenantBrief{
                ID:          tenant.ID.String(),
                Name:        tenant.Name,
                Slug:        tenant.Slug,
                Status:      tenant.Status,
                TrialEndsAt: tenant.TrialEndsAt,
        }

        if sub != nil {
                plan, err := s.repo.PlanByID(ctx, sub.PlanID)
                if err != nil {
                        return nil, err
                }
                resp.Subscription = &SubscriptionView{
                        ID:                sub.ID.String(),
                        Status:            sub.Status,
                        BillingCycle:      sub.BillingCycle,
                        TrialEndsAt:       sub.TrialEndsAt,
                        DaysRemaining:     daysRemaining(sub.TrialEndsAt, now),
                        CurrentPeriodEnd:  sub.CurrentPeriodEnd,
                        CancelAtPeriodEnd: sub.CancelAtPeriodEnd,
                        Plan:              planViewFrom(plan),
                }
        }

        options, err := s.repo.ActivePlans(ctx)
        if err != nil {
                return nil, err
        }
        resp.PlanOptions = make([]PlanView, 0, len(options))
        for _, p := range options {
                resp.PlanOptions = append(resp.PlanOptions, planViewFrom(p))
        }

        payments, err := s.repo.RecentPaymentsByTenant(ctx, tenantID, 20)
        if err != nil {
                return nil, err
        }
        resp.Payments = make([]PaymentView, 0, len(payments))
        for _, p := range payments {
                resp.Payments = append(resp.Payments, PaymentView{
                        ID:            p.ID.String(),
                        BillingCycle:  p.BillingCycle,
                        AmountKurus:   p.AmountKurus,
                        Currency:      p.Currency,
                        Status:        p.Status,
                        FailureReason: p.FailureReason,
                        PaidAt:        p.PaidAt,
                        CreatedAt:     p.CreatedAt,
                })
        }

        return resp, nil
}

// StartCheckout begins the payment flow for the hybrid model:
// monthly → iyzico subscription checkout (stored card, auto-renewal),
// annual → one-shot checkout with card registration.
func (s *Service) StartCheckout(ctx context.Context, tenantID uuid.UUID, req CheckoutRequest) (CheckoutResponse, error) {
        tenant, err := s.repo.TenantByID(ctx, tenantID)
        if err != nil {
                return CheckoutResponse{}, err
        }
        if tenant.Status == models.TenantPendingVerification {
                return CheckoutResponse{}, ErrTenantPending
        }

        sub, err := s.repo.LiveSubscriptionByTenant(ctx, tenantID)
        if err != nil {
                return CheckoutResponse{}, err
        }
        if sub != nil && sub.Status == models.SubActive {
                return CheckoutResponse{}, ErrSubscriptionState
        }

        plan, err := s.repo.PlanByCode(ctx, req.PlanCode)
        if err != nil {
                if errors.Is(err, pgx.ErrNoRows) {
                        return CheckoutResponse{}, ErrPlanNotFound
                }
                return CheckoutResponse{}, err
        }
        if !plan.IsActive {
                return CheckoutResponse{}, ErrPlanNotFound
        }

        amount := amountFor(plan, req.BillingCycle)

        payment := &models.Payment{
                ID:             uuid.New(),
                TenantID:       tenantID,
                HasSubscription: sub != nil,
                BillingCycle:   req.BillingCycle,
                AmountKurus:    amount,
                Currency:       "TRY",
                Status:         "pending",
        }
        if sub != nil {
                payment.SubscriptionID = sub.ID
        }
        if err := s.repo.CreatePayment(ctx, payment); err != nil {
                return CheckoutResponse{}, err
        }

        ownerEmail, err := s.repo.OwnerEmail(ctx, tenantID)
        if err != nil {
                return CheckoutResponse{}, err
        }

        checkoutReq := iyzico.CheckoutRequest{
                ConversationID: payment.ID.String(),
                CallbackURL:    s.backendURL + "/platform/v1/billing/checkout/result",
                AmountKurus:    amount,
                BasketName:     "OpenSchool " + plan.Name + " (" + cycleLabel(req.BillingCycle) + ")",
                Customer: iyzico.Customer{
                        Name:    firstToken(tenant.ContactName),
                        Surname: lastToken(tenant.ContactName),
                        Email:   ownerEmail,
                        GSM:     tenant.Phone,
                        City:    tenant.City,
                        Address: tenant.City,
                },
        }

        var init iyzico.CheckoutInit
        if req.BillingCycle == models.CycleMonthly {
                if !s.provider.Mock() {
                        ref := s.monthlyRefs[plan.Code]
                        if ref == "" {
                                _ = s.repo.SetPaymentFailed(ctx, payment.ID, "plan has no iyzico pricing-plan mapping")
                                return CheckoutResponse{}, ErrPlanNotMapped
                        }
                        checkoutReq.PricingPlanReferenceCode = ref
                }
                init, err = s.provider.StartSubscriptionCheckout(ctx, checkoutReq)
        } else {
                init, err = s.provider.StartPaymentCheckout(ctx, checkoutReq)
        }
        if err != nil {
                log.Printf("platform billing: checkout init failed for tenant %s: %v", tenantID, err)
                _ = s.repo.SetPaymentFailed(ctx, payment.ID, "checkout init failed")
                return CheckoutResponse{}, ErrProviderFailure
        }

        if err := s.repo.SetPaymentToken(ctx, payment.ID, init.Token); err != nil {
                return CheckoutResponse{}, err
        }

        _ = s.repo.RecordEvent(ctx, tenantID, "payment.checkout_started", marshal(map[string]any{
                "payment_id": payment.ID, "plan_code": plan.Code,
                "billing_cycle": req.BillingCycle, "amount_kurus": amount,
                "provider_mode": providerMode(s.provider),
        }), "tenant")

        return CheckoutResponse{
                PaymentID:    payment.ID.String(),
                CheckoutURL:  init.PageURL,
                Provider:     providerMode(s.provider),
                AmountKurus:  amount,
                BillingCycle: req.BillingCycle,
        }, nil
}

// HandleCallback settles a checkout after the provider redirects back to
// /billing/checkout/result. Idempotent: settled payments short-circuit.
func (s *Service) HandleCallback(ctx context.Context, checkoutToken string) (*models.Payment, error) {
        payment, err := s.repo.PaymentByToken(ctx, checkoutToken)
        if err != nil {
                return nil, err
        }
        if payment == nil {
                return nil, ErrCheckoutNotFound
        }
        if payment.Status != "pending" || s.provider.Mock() {
                return payment, nil
        }

        res, err := s.provider.RetrieveCheckout(ctx, checkoutToken)
        if err != nil {
                return nil, ErrProviderFailure
        }
        return s.applyResult(ctx, payment, res)
}

// MockSettle stands in for the provider payment page in mock mode.
func (s *Service) MockSettle(ctx context.Context, checkoutToken string, success bool) (*models.Payment, error) {
        if !s.provider.Mock() {
                return nil, ErrProviderFailure
        }
        payment, err := s.repo.PaymentByToken(ctx, checkoutToken)
        if err != nil {
                return nil, err
        }
        if payment == nil {
                return nil, ErrCheckoutNotFound
        }
        if payment.Status != "pending" {
                return payment, nil
        }
        res, err := s.provider.SettleMock(checkoutToken, success)
        if err != nil {
                return nil, err
        }
        return s.applyResult(ctx, payment, res)
}

// ResultByToken powers the result page polling after redirect.
func (s *Service) ResultByToken(ctx context.Context, checkoutToken string) (CheckoutResultResponse, error) {
        payment, err := s.repo.PaymentByToken(ctx, checkoutToken)
        if err != nil {
                return CheckoutResultResponse{}, err
        }
        if payment == nil {
                return CheckoutResultResponse{}, ErrCheckoutNotFound
        }

        resp := CheckoutResultResponse{
                Status:       payment.Status,
                PaymentID:    payment.ID.String(),
                AmountKurus:  payment.AmountKurus,
                BillingCycle: payment.BillingCycle,
        }
        switch payment.Status {
        case "succeeded":
                resp.Message = "Ödemeniz alındı. Aboneliğiniz etkinleştirildi."
        case "failed":
                resp.Message = "Ödeme tamamlanamadı. " + payment.FailureReason
        default:
                resp.Message = "Ödeme henüz tamamlanmadı."
        }
        return resp, nil
}

// HandleWebhook verifies the provider signature and applies subscription
// lifecycle events (monthly renewals arrive here, not through the browser).
func (s *Service) HandleWebhook(ctx context.Context, body []byte, eventToken, signature string) error {
        if !s.provider.VerifyWebhook(eventToken, signature) {
                return ErrWebhookSignature
        }

        var payload struct {
                IyziEventToken        string `json:"iyziEventToken"`
                Status                string `json:"status"`
                SubscriptionReference string `json:"subscriptionReference"`
                EventType             string `json:"eventType"`
        }
        _ = json.Unmarshal(body, &payload)

        eventType := payload.EventType
        if eventType == "" {
                eventType = "unknown"
        }

        if payload.SubscriptionReference == "" {
                // Some event flavors only carry the token; without a reference we
                // can only log. Recording keeps the audit trail complete.
                s.record(ctx, uuid.Nil, "iyzico."+eventType, payload, "iyzico")
                return nil
        }

        sub, err := s.repo.SubscriptionByIyzicoRef(ctx, payload.SubscriptionReference)
        if err != nil {
                return err
        }
        if sub == nil {
                s.record(ctx, uuid.Nil, "iyzico."+eventType, payload, "iyzico")
                return nil
        }

        switch {
        case strings.EqualFold(payload.Status, "ACTIVE"), strings.EqualFold(payload.Status, "PAID"):
                periodEnd := s.now().AddDate(0, 1, 0)
                if sub.BillingCycle == models.CycleAnnual {
                        periodEnd = s.now().AddDate(1, 0, 0)
                }
                if err := s.repo.ActivateSubscription(ctx, sub.ID, sub.TenantID, sub.BillingCycle, periodEnd, payload.SubscriptionReference); err != nil {
                        return err
                }
                s.record(ctx, sub.TenantID, "subscription.renewed", map[string]any{
                        "subscription_reference": payload.SubscriptionReference,
                        "period_end":             periodEnd,
                }, "iyzico")

        case strings.EqualFold(payload.Status, "FAILED"), strings.EqualFold(payload.Status, "EXPIRED"):
                if err := s.repo.MarkPastDue(ctx, sub.ID, sub.TenantID); err != nil {
                        return err
                }
                s.record(ctx, sub.TenantID, "subscription.payment_failed", map[string]any{
                        "subscription_reference": payload.SubscriptionReference,
                }, "iyzico")

        default:
                s.record(ctx, sub.TenantID, "iyzico."+eventType, payload, "iyzico")
        }
        return nil
}

// ---------- internal state machine ----------

func (s *Service) applyResult(ctx context.Context, payment *models.Payment, res iyzico.CheckoutResult) (*models.Payment, error) {
        if res.Status == iyzico.ResultSuccess {
                return s.applySuccess(ctx, payment, res)
        }
        return s.applyFailure(ctx, payment, res.FailureMessage)
}

func (s *Service) applySuccess(ctx context.Context, payment *models.Payment, res iyzico.CheckoutResult) (*models.Payment, error) {
        if err := s.repo.SetPaymentSucceeded(ctx, payment.ID, res.PaymentID); err != nil {
                return nil, err
        }

        sub, err := s.repo.LiveSubscriptionByTenant(ctx, payment.TenantID)
        if err != nil {
                return nil, err
        }
        if sub != nil {
                periodEnd := s.now().AddDate(0, 1, 0)
                if payment.BillingCycle == models.CycleAnnual {
                        periodEnd = s.now().AddDate(1, 0, 0)
                }
                if err := s.repo.ActivateSubscription(ctx, sub.ID, payment.TenantID, payment.BillingCycle, periodEnd, res.SubscriptionReference); err != nil {
                        return nil, err
                }
        }

        _ = s.repo.RecordEvent(ctx, payment.TenantID, "payment.succeeded", marshal(map[string]any{
                "payment_id": payment.ID, "amount_kurus": payment.AmountKurus,
                "billing_cycle": payment.BillingCycle, "iyzico_payment_id": res.PaymentID,
                "subscription_reference": res.SubscriptionReference,
        }), "iyzico")
        _ = s.repo.RecordEvent(ctx, payment.TenantID, "subscription.activated", marshal(map[string]any{
                "billing_cycle": payment.BillingCycle,
        }), "system")

        updated, err := s.repo.PaymentByID(ctx, payment.ID)
        if err != nil {
                return payment, nil
        }
        return updated, nil
}

func (s *Service) applyFailure(ctx context.Context, payment *models.Payment, reason string) (*models.Payment, error) {
        if err := s.repo.SetPaymentFailed(ctx, payment.ID, reason); err != nil {
                return nil, err
        }
        _ = s.repo.RecordEvent(ctx, payment.TenantID, "payment.failed", marshal(map[string]any{
                "payment_id": payment.ID, "reason": reason,
        }), "iyzico")

        updated, err := s.repo.PaymentByID(ctx, payment.ID)
        if err != nil {
                return payment, nil
        }
        return updated, nil
}

// ensureFreshSubscription lazily expires a finished trial on read.
func (s *Service) ensureFreshSubscription(ctx context.Context, tenant models.Tenant) (*models.Subscription, error) {
        sub, err := s.repo.LiveSubscriptionByTenant(ctx, tenant.ID)
        if err != nil {
                return nil, err
        }
        if sub != nil && sub.Status == models.SubTrialing &&
                sub.TrialEndsAt != nil && !sub.TrialEndsAt.After(s.now()) {
                changed, err := s.repo.ExpireIfDue(ctx, sub.ID, tenant.ID, *sub.TrialEndsAt)
                if err != nil {
                        return nil, err
                }
                if changed {
                        _ = s.repo.RecordEvent(ctx, tenant.ID, "subscription.trial_expired", marshal(map[string]any{
                                "trial_ends_at": sub.TrialEndsAt,
                        }), "system")
                        return s.repo.LiveSubscriptionByTenant(ctx, tenant.ID)
                }
        }
        return sub, nil
}

func (s *Service) record(ctx context.Context, tenantID uuid.UUID, eventType string, payload any, actor string) {
        data, err := json.Marshal(payload)
        if err != nil {
                data = []byte("{}")
        }
        if actor == "" {
                actor = "iyzico"
        }
        if err := s.repo.RecordEvent(ctx, tenantID, eventType, data, actor); err != nil {
                log.Printf("platform billing: record event %s: %v", eventType, err)
        }
}

func marshal(v map[string]any) []byte {
        b, err := json.Marshal(v)
        if err != nil {
                return []byte("{}")
        }
        return b
}

func providerMode(p Provider) string {
        if p.Mock() {
                return "mock"
        }
        return "iyzico"
}

func cycleLabel(cycle string) string {
        if cycle == models.CycleAnnual {
                return "Yıllık"
        }
        return "Aylık"
}

func firstToken(name string) string {
        fields := strings.Fields(strings.TrimSpace(name))
        if len(fields) == 0 {
                return "Okul"
        }
        return fields[0]
}

func lastToken(name string) string {
        fields := strings.Fields(strings.TrimSpace(name))
        if len(fields) < 2 {
                return "Yöneticisi"
        }
        return fields[len(fields)-1]
}

var ErrWebhookSignature = errors.New("billing: webhook signature invalid")
