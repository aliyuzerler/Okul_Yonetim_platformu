package billing

import (
        "encoding/json"
        "errors"
        "net/http"
        "strings"

        "github.com/gin-gonic/gin"
        "github.com/openschool-org/openschool/internal/apierror"
        "github.com/openschool-org/openschool/internal/platform/authx"
        "github.com/openschool-org/openschool/internal/platform/httpx"
)

// Handler exposes billing endpoints.
type Handler struct {
        service     *Service
        frontendURL string
}

// NewHandler builds the billing handler.
func NewHandler(service *Service, frontendURL string) *Handler {
        return &Handler{service: service, frontendURL: frontendURL}
}

// IsMock reports whether the provider runs offline.
func (h *Handler) IsMock() bool { return h.service.provider.Mock() }

// Plans lists the purchasable catalog (public: the landing page uses it).
func (h *Handler) Plans(c *gin.Context) {
        plans, err := h.service.Plans(c.Request.Context())
        if err != nil {
                apierror.Respond(c, err)
                return
        }
        c.JSON(http.StatusOK, gin.H{"plans": plans})
}

// Subscription returns the signed-in tenant's billing snapshot.
func (h *Handler) Subscription(c *gin.Context) {
        tenantID, ok := authx.TenantIDFromContext(c)
        if !ok {
                c.JSON(http.StatusForbidden, gin.H{"error": "Bu hesap bir okula bağlı değil."})
                return
        }
        resp, err := h.service.Status(c.Request.Context(), tenantID)
        if err != nil {
                apierror.Respond(c, err)
                return
        }
        c.JSON(http.StatusOK, resp)
}

// StartCheckout opens a payment page for the chosen plan and cycle.
func (h *Handler) StartCheckout(c *gin.Context) {
        tenantID, ok := authx.TenantIDFromContext(c)
        if !ok {
                c.JSON(http.StatusForbidden, gin.H{"error": "Bu hesap bir okula bağlı değil."})
                return
        }

        var req CheckoutRequest
        if err := httpx.BindStrict(c, &req); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Paket veya ödeme dönemi seçimi geçersiz."})
                return
        }

        resp, err := h.service.StartCheckout(c.Request.Context(), tenantID, req)
        if err != nil {
                switch {
                case errors.Is(err, ErrTenantPending):
                        c.JSON(http.StatusForbidden, gin.H{"error": "Önce e-posta adresinizi doğrulamanız gerekiyor."})
                case errors.Is(err, ErrSubscriptionState):
                        c.JSON(http.StatusConflict, gin.H{"error": "Aboneliğiniz şu anda etkin. Paket değişikliği destek üzerinden yapılır."})
                case errors.Is(err, ErrPlanNotFound):
                        c.JSON(http.StatusBadRequest, gin.H{"error": "Seçilen paket bulunamadı."})
                case errors.Is(err, ErrPlanNotMapped):
                        c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Bu paketin iyzico aylık abonelik eşlemesi yapılmamış. IYZICO_PP_* ortam değişkenlerini ayarlayın."})
                case errors.Is(err, ErrProviderFailure):
                        c.JSON(http.StatusBadGateway, gin.H{"error": "Ödeme sağlayıcısına şu anda ulaşılamıyor. Lütfen kısa süre sonra tekrar deneyin."})
                default:
                        apierror.Respond(c, err)
                }
                return
        }

        c.JSON(http.StatusCreated, resp)
}

// CheckoutCallback is the browser redirect target iyzico posts back to.
// It settles the payment server-side and forwards the user to the frontend
// result page. Accepts both JSON ({token}) and form-encoded callbacks.
func (h *Handler) CheckoutCallback(c *gin.Context) {
        token := callbackToken(c)
        if token == "" {
                c.JSON(http.StatusBadRequest, gin.H{"error": "Ödeme sonucu belirteci bulunamadı."})
                return
        }

        if _, err := h.service.HandleCallback(c.Request.Context(), token); err != nil {
                // Even on failure the browser must land somewhere useful.
                c.Redirect(http.StatusFound, h.frontendURL+"/panel/odeme-sonuc?token="+token+"&settled=0")
                return
        }
        c.Redirect(http.StatusFound, h.frontendURL+"/panel/odeme-sonuc?token="+token+"&settled=1")
}

// CheckoutResult lets the result page poll the settled outcome by token.
func (h *Handler) CheckoutResult(c *gin.Context) {
        token := strings.TrimSpace(c.Query("token"))
        if token == "" {
                c.JSON(http.StatusBadRequest, gin.H{"error": "token zorunlu."})
                return
        }
        resp, err := h.service.ResultByToken(c.Request.Context(), token)
        if err != nil {
                if errors.Is(err, ErrCheckoutNotFound) {
                        c.JSON(http.StatusNotFound, gin.H{"error": "Bu belirteçle bir ödeme bulunamadı."})
                        return
                }
                apierror.Respond(c, err)
                return
        }
        c.JSON(http.StatusOK, resp)
}

// MockSettle settles a mock checkout; only active in mock mode. It stands
// in for the provider-hosted payment page, so it takes the checkout token,
// not a session.
func (h *Handler) MockSettle(c *gin.Context) {
        if !h.IsMock() {
                c.JSON(http.StatusNotFound, gin.H{"error": "Bu uç yalnızca mock ödeme modunda kullanılabilir."})
                return
        }

        var req struct {
                Token   string `json:"token" validate:"required,max=128"`
                Success *bool  `json:"success" validate:"required"`
        }
        if err := httpx.BindStrict(c, &req); err != nil {
                c.JSON(http.StatusBadRequest, gin.H{"error": "token ve success zorunludur."})
                return
        }

        payment, err := h.service.MockSettle(c.Request.Context(), req.Token, *req.Success)
        if err != nil {
                if errors.Is(err, ErrCheckoutNotFound) {
                        c.JSON(http.StatusNotFound, gin.H{"error": "Bu belirteçle bir ödeme bulunamadı."})
                        return
                }
                apierror.Respond(c, err)
                return
        }
        status := "failed"
        if payment != nil {
                status = payment.Status
        }
        c.JSON(http.StatusOK, gin.H{"status": status})
}

// Webhook receives iyzico subscription/payment events.
func (h *Handler) Webhook(c *gin.Context) {
        body, err := c.GetRawData()
        if err != nil || len(body) == 0 {
                c.JSON(http.StatusBadRequest, gin.H{"error": "boş gövde"})
                return
        }

        var payload struct {
                IyziEventToken string `json:"iyziEventToken"`
        }
        _ = json.Unmarshal(body, &payload)

        if err := h.service.HandleWebhook(c.Request.Context(), body, payload.IyziEventToken, c.GetHeader("x-iyzi-signature")); err != nil {
                if errors.Is(err, ErrWebhookSignature) {
                        c.JSON(http.StatusUnauthorized, gin.H{"error": "imza doğrulanamadı"})
                        return
                }
                // Never leak internals to the provider; retry semantics stay intact.
                c.JSON(http.StatusInternalServerError, gin.H{"error": "webhook işlenemedi"})
                return
        }
        c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// callbackToken extracts the checkout token from a JSON or form callback.
func callbackToken(c *gin.Context) string {
        if ct := c.GetHeader("Content-Type"); strings.Contains(ct, "application/json") {
                var body struct {
                        Token string `json:"token"`
                }
                if err := c.ShouldBindJSON(&body); err == nil && body.Token != "" {
                        return strings.TrimSpace(body.Token)
                }
        } else {
                if token := c.PostForm("token"); token != "" {
                        return strings.TrimSpace(token)
                }
        }
        // Last resort: query string (some integrations redirect with GET-style params).
        return strings.TrimSpace(c.Query("token"))
}
