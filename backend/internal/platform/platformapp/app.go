// Package platformapp is the control-plane composition root: it mounts the
// platform auth, billing and admin modules on one router with the same
// middleware stack discipline as the school API (cmd/api).
package platformapp

import (
        "log"
        "strings"

        "github.com/gin-gonic/gin"
        "github.com/jackc/pgx/v5/pgxpool"
        "github.com/openschool-org/openschool/internal/mailer"
        adminmodule "github.com/openschool-org/openschool/internal/platform/admin"
        authmodule "github.com/openschool-org/openschool/internal/platform/auth"
        authx "github.com/openschool-org/openschool/internal/platform/authx"
        billingmodule "github.com/openschool-org/openschool/internal/platform/billing"
        "github.com/openschool-org/openschool/internal/platform/config"
        "github.com/openschool-org/openschool/internal/platform/iyzico"
)

// Setup composes the platform API and returns the billing handler pieces
// owned by the process lifecycle (none for now — kept for symmetry).
func Setup(router *gin.Engine, pool *pgxpool.Pool, cfg config.Config, mailSender mailer.Mailer) {
        // iyzico pricing-plan mapping for monthly auto-renewal, read from the
        // IYZICO_PP_<PLAN_CODE>_MONTHLY environment variables.
        monthlyRefs := iyzico.PricingPlanRefsFromEnv()

        provider := iyzico.New(iyzico.Config{
                Mode:            cfg.Iyzico.Mode,
                BaseURL:         cfg.Iyzico.BaseURL,
                APIKey:          cfg.Iyzico.APIKey,
                SecretKey:       cfg.Iyzico.SecretKey,
                FrontendURL:     cfg.FrontendURL,
                PricingPlanRefs: monthlyRefs,
        })
        log.Printf("platform billing: iyzico mode=%s mapped_plans=%d", cfg.Iyzico.Mode, len(monthlyRefs))

        api := router.Group("/platform/v1")
        public := api.Group("")
        protected := api.Group("")
        protected.Use(authx.RequireAuth(cfg.JWTSecret))
        admin := api.Group("/admin")
        admin.Use(authx.RequireAuth(cfg.JWTSecret), authx.RequireRole(authx.RoleSuperAdmin))

        authmodule.RegisterRoutes(public, protected, pool, mailSender, cfg.JWTSecret, cfg.FrontendURL)
        billingmodule.RegisterRoutes(public, protected, billingmodule.NewService(
                billingmodule.NewRepository(pool), provider, cfg.BackendURL, monthlyRefs,
        ), cfg.FrontendURL)
        adminmodule.RegisterRoutes(admin, pool)

        router.GET("/platform/v1/health", func(c *gin.Context) {
                c.JSON(200, gin.H{"status": "ok", "service": "platform"})
        })
}

// CORSOriginsFrom splits the CORS_ORIGINS list; shared helper kept here so
// cmd/platform mirrors cmd/api's middleware wiring.
func CORSOriginsFrom(cfg config.Config) []string {
        if len(cfg.CorsOrigins) > 0 {
                return cfg.CorsOrigins
        }
        return strings.Split(cfg.FrontendURL, ",")
}
