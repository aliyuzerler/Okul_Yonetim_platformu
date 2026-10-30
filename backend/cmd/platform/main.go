// Command platform runs the OpenSchool control plane: school registration
// (kayıt olma), trial subscriptions, iyzico billing and the super-admin
// panel API. It is a separate deployment from the school API (cmd/api) and
// uses its own database (PLATFORM_DB_*) — see docs/adr/0011.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	platformauth "github.com/openschool-org/openschool/internal/platform/auth"
	"github.com/openschool-org/openschool/internal/platform/authx"
	"github.com/openschool-org/openschool/internal/platform/config"
	platformdatabase "github.com/openschool-org/openschool/internal/platform/database"
	platformapp "github.com/openschool-org/openschool/internal/platform/platformapp"
	"github.com/openschool-org/openschool/internal/database"
	"github.com/openschool-org/openschool/internal/mailer"
	"github.com/openschool-org/openschool/internal/middleware"
)

func main() {
	config.LoadEnv()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("platform config: %v", err)
	}

	dsn := config.BuildDSN()
	if err := platformdatabase.RunMigrations(dsn); err != nil {
		log.Fatalf("platform migrations failed: %v", err)
	}
	log.Println("platform migrations ok")

	pool, err := database.Connect(dsn)
	if err != nil {
		log.Fatalf("platform database connection failed: %v", err)
	}
	defer pool.Close()
	log.Println("platform database connected")

	// Transactional mail (verification, reset links) reuses the school
	// mailer stack: MAIL_PROVIDER=resend|smtp, console in development.
	mailCfg, err := mailer.ConfigFromEnv()
	if err != nil {
		log.Fatalf("platform mail configuration: %v", err)
	}
	mailSender := mailer.New(mailCfg)
	log.Printf("platform mail: provider=%s from=%s", mailCfg.Provider, mailCfg.From.String())

	authRepo := platformauth.NewRepository(pool)
	if err := bootstrapSuperAdmin(authRepo, cfg); err != nil {
		log.Fatalf("platform bootstrap: %v", err)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.RequestID())
	r.Use(middleware.StructuredLogger())
	r.Use(middleware.Metrics())
	r.Use(middleware.RequestTimeout(15 * time.Second))

	r.SetTrustedProxies(nil)
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.BodySizeLimit())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     platformapp.CORSOriginsFrom(cfg),
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	// Platform traffic is one admin per school, not a school full of
	// students: a tighter default limit than the API's 30 rps is safe.
	r.Use(middleware.RateLimit(20, 40))

	r.GET("/healthz", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if err := pool.Ping(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unavailable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	platformapp.Setup(r, pool, cfg, mailSender)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("platform server failed: %v", err)
		}
	}()
	log.Printf("platform listening on :%s", cfg.Port)

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGTERM, syscall.SIGINT)
	<-stop
	log.Println("platform shutting down")

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("platform graceful shutdown failed: %v", err)
	}
}

// bootstrapSuperAdmin creates the first platform staff account from
// PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD when none exists. The
// password itself is never logged; only the derived hash is stored.
func bootstrapSuperAdmin(repo *platformauth.Repository, cfg config.Config) error {
	if cfg.AdminEmail == "" {
		log.Println("platform bootstrap: PLATFORM_ADMIN_EMAIL not set, skipping super admin bootstrap")
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	count, err := repo.CountSuperAdmins(ctx)
	if err != nil {
		return err
	}
	if count > 0 {
		log.Println("platform bootstrap: super admin already exists")
		return nil
	}

	hash, err := authx.HashPassword(cfg.AdminPassword)
	if err != nil {
		return err
	}
	if err := repo.CreateSuperAdmin(ctx, uuid.New(), cfg.AdminEmail, "Platform Yöneticisi", hash); err != nil {
		return err
	}
	log.Printf("platform bootstrap: super admin created for %s", cfg.AdminEmail)
	return nil
}
