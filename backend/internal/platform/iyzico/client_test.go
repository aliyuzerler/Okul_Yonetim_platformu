package iyzico

import (
        "context"
        "encoding/base64"
        "strings"
        "testing"

        "github.com/openschool-org/openschool/internal/platform/authx"
)

func TestAuthorizationHeaderFormat(t *testing.T) {
        // The client construction is exercised elsewhere; this test pins the
        // header format the client must produce.
        rnd := "1698686400000000000"
        path := "/v2/subscriptions/initialize/checkout-form"
        body := `{"locale":"tr"}`
        signature := authx.SignHS256("test-secret", rnd+path+body)

        auth := "IYZWSv2 " + base64.StdEncoding.EncodeToString(
                []byte("test-api-key:"+rnd+":"+signature))

        if !strings.HasPrefix(auth, "IYZWSv2 ") {
                t.Fatalf("authorization must use the IYZWSv2 scheme: %q", auth)
        }
        decoded, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(auth, "IYZWSv2 "))
        if err != nil {
                t.Fatalf("authorization payload is not base64: %v", err)
        }
        parts := strings.Split(string(decoded), ":")
        if len(parts) != 3 || parts[0] != "test-api-key" || parts[1] != rnd {
                t.Fatalf("decoded authorization parts unexpected: %q", decoded)
        }
        if parts[2] != signature {
                t.Fatal("signature segment mismatch")
        }
}

func TestWebhookVerification(t *testing.T) {
        c := New(Config{Mode: "sandbox", SecretKey: "whsec"})

        good := authx.SignHS256("whsec", "whsec"+"event-token-123")
        if !c.VerifyWebhook("event-token-123", good) {
                t.Fatal("valid webhook signature rejected")
        }
        if c.VerifyWebhook("event-token-123", "bogus") {
                t.Fatal("invalid webhook signature accepted")
        }
        if c.VerifyWebhook("", good) || c.VerifyWebhook("event-token-123", "") {
                t.Fatal("empty inputs must not verify")
        }
}

func TestMockFlow(t *testing.T) {
        c := New(Config{Mode: "mock", FrontendURL: "http://localhost:5174"})

        init, err := c.StartSubscriptionCheckout(context.Background(), checkoutReq("pay-1"))
        if err != nil {
                t.Fatalf("mock subscription checkout: %v", err)
        }
        if !strings.HasPrefix(init.PageURL, "http://localhost:5174/panel/odeme-sonuc?token=mock-") {
                t.Fatalf("mock page URL unexpected: %q", init.PageURL)
        }

        res, err := c.SettleMock(init.Token, true)
        if err != nil {
                t.Fatalf("SettleMock: %v", err)
        }
        if res.Status != ResultSuccess || res.SubscriptionReference == "" {
                t.Fatalf("mock settle result unexpected: %+v", res)
        }

        // Token consumed: settling again must fail.
        if _, err := c.SettleMock(init.Token, true); err == nil {
                t.Fatal("mock token reused")
        }

        init2, _ := c.StartPaymentCheckout(context.Background(), checkoutReq("pay-2"))
        res2, err := c.SettleMock(init2.Token, false)
        if err != nil {
                t.Fatalf("SettleMock failure path: %v", err)
        }
        if res2.Status != ResultFailure || res2.FailureMessage == "" {
                t.Fatalf("mock failure result unexpected: %+v", res2)
        }
}

func TestMockRejectsRetrieve(t *testing.T) {
        c := New(Config{Mode: "mock"})
        if _, err := c.RetrieveCheckout(context.Background(), "mock-abc"); err == nil {
                t.Fatal("mock RetrieveCheckout must fail")
        }
}

func TestPricingPlanRefsFromEnv(t *testing.T) {
        t.Setenv("IYZICO_PP_STANDART_MONTHLY", "ref-standart")
        t.Setenv("IYZICO_PP_BASLANGIC_MONTHLY", "ref-baslangic")
        t.Setenv("IYZICO_PP_KURUMSAL_ANNUAL", "ignored")

        refs := PricingPlanRefsFromEnv()
        if refs["standart"] != "ref-standart" || refs["baslangic"] != "ref-baslangic" {
                t.Fatalf("refs unexpected: %v", refs)
        }
        if _, ok := refs["kurumsal"]; ok {
                t.Fatal("annual reference must not be mapped as monthly")
        }
}

func checkoutReq(conversationID string) CheckoutRequest {
        return CheckoutRequest{
                ConversationID: conversationID,
                CallbackURL:    "http://backend/platform/v1/billing/checkout/result",
                AmountKurus:    2990000,
                BasketName:     "OpenSchool Standart (Yıllık)",
                Customer:       Customer{Name: "Ali", Surname: "Veli", Email: "ali@okul.k12.tr", City: "Ankara"},
        }
}

// signForTest was replaced by the real authx.SignHS256 import.
