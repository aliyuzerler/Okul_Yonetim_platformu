package iyzico

import (
        "bytes"
        "context"
        "encoding/base64"
        "encoding/json"
        "errors"
        "fmt"
        "io"
        "log"
        "net/http"
        "strings"
        "time"

        "github.com/google/uuid"
        "github.com/openschool-org/openschool/internal/platform/authx"
)

// Client talks to the iyzico REST v2 API. In mock mode it never touches the
// network and settles checkouts through SettleMock.
type Client struct {
        cfg        Config
        http       *http.Client
        mockTokens map[string]mockCheckout
}

// New builds a client for the given configuration.
func New(cfg Config) *Client {
        return &Client{
                cfg: cfg,
                http: &http.Client{
                        Timeout: 30 * time.Second,
                },
                mockTokens: map[string]mockCheckout{},
        }
}

// Mock reports whether the client runs without the real provider.
func (c *Client) Mock() bool { return c.cfg.Mode == "mock" }

type mockCheckout struct {
        conversationID string
        amountKurus    int64
        subscription   bool
}

// ---------- public API ----------

// StartSubscriptionCheckout opens a subscription checkout form (monthly
// auto-renewal: iyzico stores the card and charges each period).
func (c *Client) StartSubscriptionCheckout(ctx context.Context, req CheckoutRequest) (CheckoutInit, error) {
        if c.Mock() {
                return c.startMock(req, true)
        }

        body := map[string]any{
                "locale":                    "tr",
                "conversationId":            req.ConversationID,
                "callbackUrl":               req.CallbackURL,
                "pricingPlanReferenceCode":  req.PricingPlanReferenceCode,
                "customer":                  c.customerPayload(req.Customer),
        }
        return c.post(ctx, "/v2/subscriptions/initialize/checkout-form", body)
}

// StartPaymentCheckout opens a one-shot payment checkout (annual), with
// card registration enabled so renewals can later be automated (Faz 4).
func (c *Client) StartPaymentCheckout(ctx context.Context, req CheckoutRequest) (CheckoutInit, error) {
        if c.Mock() {
                return c.startMock(req, false)
        }

        price := fmt.Sprintf("%.2f", float64(req.AmountKurus)/100.0)
        body := map[string]any{
                "locale":                "tr",
                "conversationId":        req.ConversationID,
                "callbackUrl":           req.CallbackURL,
                "price":                 price,
                "paidPrice":             price,
                "currency":              "TRY",
                "paymentGroup":          "SUBSCRIPTION",
                "payWithRegistration":   1,
                "buyer":                 c.buyerPayload(req.Customer),
                "basketItems":           c.basketPayload(req),
                "enabledInstallments":   []int{1, 2, 3, 6, 9, 12},
        }
        return c.post(ctx, "/v2/payment/iyzipos/checkoutform/initialize/auth3d/ecom", body)
}

// RetrieveCheckout fetches the settled result for a checkout token. Both
// checkout flavors are attempted: subscription forms and payment forms use
// different endpoints, and the token alone does not say which one created it.
func (c *Client) RetrieveCheckout(ctx context.Context, token string) (CheckoutResult, error) {
        if c.Mock() {
                return CheckoutResult{}, errors.New("iyzico: RetrieveCheckout is not available in mock mode; settle with SettleMock")
        }

        // Subscription checkout result.
        subBody, err := c.call(ctx, "POST", "/v2/subscriptions/checkout-form/"+token, nil)
        if err == nil {
                if res, ok := parseSubscriptionResult(subBody); ok {
                        return res, nil
                }
        } else if !isNotFound(err) {
                return CheckoutResult{}, err
        }

        // One-shot payment checkout result.
        payBody, err := c.call(ctx, "POST", "/v2/payment/iyzipos/checkoutform/auth/ecom/detail", map[string]any{
                "locale": "tr",
                "token":  token,
        })
        if err != nil {
                return CheckoutResult{}, err
        }
        return parsePaymentResult(payBody)
}

// SettleMock completes a mock checkout, standing in for the provider's
// payment page and webhook.
func (c *Client) SettleMock(token string, success bool) (CheckoutResult, error) {
        mc, ok := c.mockTokens[token]
        if !ok {
                return CheckoutResult{}, errors.New("iyzico: unknown mock token")
        }
        delete(c.mockTokens, token)

        res := CheckoutResult{ConversationID: mc.conversationID}
        if success {
                res.Status = ResultSuccess
                res.PaymentID = "mock-pay-" + uuid.NewString()[:8]
                if mc.subscription {
                        res.SubscriptionReference = "mock-sub-" + uuid.NewString()[:8]
                }
        } else {
                res.Status = ResultFailure
                res.FailureMessage = "Mock ödeme reddedildi (test senaryosu)"
        }
        return res, nil
}

// VerifyWebhook checks the x-iyzi-signature header: HMAC-SHA256 keyed by the
// secret key over (secretKey + iyziEventToken).
func (c *Client) VerifyWebhook(eventToken, signature string) bool {
        if eventToken == "" || signature == "" || c.cfg.SecretKey == "" {
                return false
        }
        expected := authx.SignHS256(c.cfg.SecretKey, c.cfg.SecretKey+eventToken)
        return authx.EqualConstTime(expected, signature)
}

// ---------- internals ----------

func (c *Client) startMock(req CheckoutRequest, subscription bool) (CheckoutInit, error) {
        token := "mock-" + uuid.NewString()
        c.mockTokens[token] = mockCheckout{
                conversationID: req.ConversationID,
                amountKurus:    req.AmountKurus,
                subscription:   subscription,
        }
        return CheckoutInit{
                Token:   token,
                PageURL: c.cfg.FrontendURL + "/panel/odeme-sonuc?token=" + token + "&mock=1",
        }, nil
}

func (c *Client) post(ctx context.Context, path string, body map[string]any) (CheckoutInit, error) {
        raw, err := c.call(ctx, "POST", path, body)
        if err != nil {
                return CheckoutInit{}, err
        }

        var resp struct {
                Status             string `json:"status"`
                Token              string `json:"token"`
                PaymentPageURL     string `json:"paymentPageUrl"`
                TokenExpireTime    string `json:"tokenExpireTime"`
                ErrorMessage       string `json:"errorMessage"`
                ErrorCode          string `json:"errorCode"`
        }
        if err := json.Unmarshal(raw, &resp); err != nil {
                return CheckoutInit{}, fmt.Errorf("iyzico: cannot parse response: %w", err)
        }
        if resp.Status != "success" || resp.Token == "" {
                return CheckoutInit{}, fmt.Errorf("iyzico: %s %s: %s", resp.ErrorCode, resp.Status, resp.ErrorMessage)
        }
        return CheckoutInit{Token: resp.Token, PageURL: resp.PaymentPageURL, ExpiresAt: resp.TokenExpireTime}, nil
}

// call performs one signed iyzico v2 request and returns the raw body.
func (c *Client) call(ctx context.Context, method, path string, body map[string]any) ([]byte, error) {
        payload := []byte("")
        if body != nil {
                encoded, err := json.Marshal(body)
                if err != nil {
                        return nil, err
                }
                payload = encoded
        }

        rnd := fmt.Sprintf("%d", time.Now().UnixNano())
        signature := authx.SignHS256(c.cfg.SecretKey, rnd+path+string(payload))
        authorization := "IYZWSv2 " + base64.StdEncoding.EncodeToString(
                []byte(c.cfg.APIKey + ":" + rnd + ":" + signature))

        req, err := http.NewRequestWithContext(ctx, method, c.cfg.BaseURL+path, bytes.NewReader(payload))
        if err != nil {
                return nil, err
        }
        req.Header.Set("Content-Type", "application/json")
        req.Header.Set("Authorization", authorization)
        req.Header.Set("x-iyzi-rnd", rnd)
        req.Header.Set("x-iyzi-client-version", "openschool-platform")

        resp, err := c.http.Do(req)
        if err != nil {
                return nil, fmt.Errorf("iyzico: request failed: %w", err)
        }
        defer resp.Body.Close()

        raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
        if err != nil {
                return nil, err
        }
        if resp.StatusCode >= 400 {
                return raw, fmt.Errorf("iyzico: HTTP %d for %s: %s", resp.StatusCode, path, truncateForLog(string(raw), 300))
        }
        return raw, nil
}

func (c *Client) customerPayload(cu Customer) map[string]any {
        return map[string]any{
                "name":     fallback(cu.Name, "Okul"),
                "surname":  fallback(cu.Surname, "Yöneticisi"),
                "email":    cu.Email,
                "gsmNumber": normalizeGSM(cu.GSM),
                "billingAddress": map[string]any{
                        "address":       fallback(cu.Address, "Adres belirtilmedi"),
                        "city":          fallback(cu.City, "İstanbul"),
                        "country":       "Türkiye",
                        "contactName":   strings.TrimSpace(cu.Name + " " + cu.Surname),
                },
        }
}

func (c *Client) buyerPayload(cu Customer) map[string]any {
        return map[string]any{
                "id":       cu.Email,
                "name":     fallback(cu.Name, "Okul"),
                "surname":  fallback(cu.Surname, "Yöneticisi"),
                "email":    cu.Email,
                "gsmNumber": normalizeGSM(cu.GSM),
                "city":     fallback(cu.City, "İstanbul"),
                "country":  "Türkiye",
                "address":  fallback(cu.Address, "Adres belirtilmedi"),
                "ip":       "85.34.78.112", // iyzico validates the shape; see ADR 0012 notes
        }
}

func (c *Client) basketPayload(req CheckoutRequest) []map[string]any {
        price := fmt.Sprintf("%.2f", float64(req.AmountKurus)/100.0)
        return []map[string]any{{
                "id":        req.ConversationID,
                "name":      fallback(req.BasketName, "OpenSchool Aboneliği"),
                "category1": "Yazılım",
                "itemType":  "VIRTUAL",
                "price":     price,
        }}
}

// parseSubscriptionResult normalizes the subscription checkout-form result.
func parseSubscriptionResult(raw []byte) (CheckoutResult, bool) {
        var resp struct {
                Status                string `json:"status"`
                Token                 string `json:"token"`
                SubscriptionReference string `json:"subscriptionReference"`
                PaymentStatus         string `json:"paymentStatus"`
                ErrorMessage          string `json:"errorMessage"`
        }
        if err := json.Unmarshal(raw, &resp); err != nil {
                return CheckoutResult{}, false
        }
        if resp.SubscriptionReference == "" && resp.Token == "" {
                return CheckoutResult{}, false
        }

        res := CheckoutResult{
                SubscriptionReference: resp.SubscriptionReference,
                FailureMessage:        resp.ErrorMessage,
        }
        switch strings.ToUpper(resp.PaymentStatus) {
        case "SUCCESS":
                res.Status = ResultSuccess
        default:
                res.Status = ResultFailure
        }
        return res, true
}

// parsePaymentResult normalizes the one-shot checkout-form result.
func parsePaymentResult(raw []byte) (CheckoutResult, error) {
        var resp struct {
                Status         string `json:"status"`
                PaymentStatus  string `json:"paymentStatus"`
                PaymentID      string `json:"paymentId"`
                ConversationID string `json:"conversationId"`
                ErrorMessage   string `json:"errorMessage"`
        }
        if err := json.Unmarshal(raw, &resp); err != nil {
                return CheckoutResult{}, fmt.Errorf("iyzico: cannot parse checkout result: %w", err)
        }

        res := CheckoutResult{
                PaymentID:      resp.PaymentID,
                ConversationID: resp.ConversationID,
                FailureMessage: resp.ErrorMessage,
        }
        if strings.EqualFold(resp.PaymentStatus, "SUCCESS") || (resp.PaymentStatus == "" && strings.EqualFold(resp.Status, "success")) {
                res.Status = ResultSuccess
        } else {
                res.Status = ResultFailure
        }
        return res, nil
}

func isNotFound(err error) bool {
        return err != nil && strings.Contains(err.Error(), "HTTP 404")
}

func normalizeGSM(gsm string) string {
        gsm = strings.TrimSpace(gsm)
        if gsm == "" {
                return "+900000000000"
        }
        if !strings.HasPrefix(gsm, "+") {
                gsm = "+90" + strings.TrimPrefix(strings.TrimPrefix(gsm, "0"), "90")
        }
        return gsm
}

func fallback(s, def string) string {
        if strings.TrimSpace(s) == "" {
                return def
        }
        return s
}

func truncateForLog(s string, n int) string {
        if len(s) <= n {
                return s
        }
        return s[:n] + "..."
}

// LogWebhookEvent keeps a single safe log line for unverified/unmapped
// webhook payloads; never log the raw payload (may contain buyer data).
func LogWebhookEvent(eventType, summary string) {
        log.Printf("iyzico webhook: type=%s %s", eventType, summary)
}
