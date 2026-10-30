package billing

import (
	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/platform/authx"
	"github.com/openschool-org/openschool/internal/platform/models"
)

// RegisterRoutes wires billing endpoints. Public routes serve the landing
// page and the provider; tenant routes require a tenant_admin session.
func RegisterRoutes(public, protected *gin.RouterGroup, service *Service, frontendURL string) {
	handler := NewHandler(service, frontendURL)

	public.GET("/plans", handler.Plans)
	public.POST("/webhooks/iyzico", handler.Webhook)
	// The provider posts the checkout result here (browser redirect); the
	// result page also polls it via GET. Both are token-scoped.
	public.POST("/billing/checkout/result", handler.CheckoutCallback)
	public.GET("/billing/checkout/result", handler.CheckoutResult)
	public.POST("/billing/mock/pay", handler.MockSettle)

	protected.GET("/billing/subscription", authx.RequireRole(models.RoleTenantAdmin), handler.Subscription)
	protected.POST("/billing/checkout", authx.RequireRole(models.RoleTenantAdmin), handler.StartCheckout)
}
