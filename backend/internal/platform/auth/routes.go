// Package auth wires the platform's own account lifecycle endpoints:
// public school signup (kayıt olma), email verification with trial start,
// login, forgot/reset password. It is served by the control-plane binary
// (cmd/platform), never by a school instance.
package auth

import (
        "github.com/gin-gonic/gin"
        "github.com/jackc/pgx/v5/pgxpool"
        "github.com/openschool-org/openschool/internal/mailer"
        "github.com/openschool-org/openschool/internal/middleware"
)

// RegisterRoutes wires public and authenticated platform auth endpoints.
//
// Rate limits follow the school instance's rules: unauthenticated endpoints
// that check a caller-supplied secret must be expensive to brute-force.
func RegisterRoutes(public, protected *gin.RouterGroup, pool *pgxpool.Pool, mailSender mailer.Mailer, jwtSecret []byte, frontendURL string) {
        service := NewService(NewRepository(pool), mailSender, jwtSecret, frontendURL)
        handler := NewHandler(service)

        // Public account lifecycle.
        public.POST("/auth/register", middleware.RateLimit(0.1, 5), handler.Register)
        public.POST("/auth/verify-email", middleware.RateLimit(0.5, 10), handler.VerifyEmail)
        public.POST("/auth/resend-verification", middleware.RateLimit(0.1, 3), handler.ResendVerification)
        public.POST("/auth/login", middleware.RateLimit(0.5, 10), handler.Login)
        public.POST("/auth/forgot-password", middleware.RateLimit(0.1, 3), handler.ForgotPassword)
        public.POST("/auth/reset-password", middleware.RateLimit(0.5, 10), handler.ResetPassword)

        protected.GET("/auth/me", handler.Me)
}
