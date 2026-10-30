// Package config loads the platform (control plane) service configuration.
//
// The platform service is a separate deployment from any school instance
// (docs/adr/0011): it owns the commercial relationship — registration, trial,
// iyzico billing, the super-admin panel — and therefore has its own database
// and its own environment namespace (PLATFORM_*, IYZICO_*).
package config

import (
        "errors"
        "fmt"
        "net/url"
        "os"
        "strconv"
        "strings"

        "github.com/joho/godotenv"
)

// Config is the platform service configuration, read once at startup.
type Config struct {
        Port        string
        CorsOrigins []string

        // JWT signing secret for platform sessions (HS256). Required.
        JWTSecret []byte

        // Frontend base URL used to build links inside transactional emails
        // (verification, password reset) and checkout redirects.
        FrontendURL string

        // Backend base URL used for provider callback endpoints (iyzico
        // checkout result posts here).
        BackendURL string

        // Bootstrap super-admin account, created on first start when no
        // super admin exists yet. PLATFORM_ADMIN_PASSWORD is required together
        // with PLATFORM_ADMIN_EMAIL.
        AdminEmail    string
        AdminPassword string

        // Iyzico checkout configuration. Mode "mock" runs the whole billing
        // flow without any network call — for development, the sandbox demo
        // and CI. Mode "sandbox"/"live" talk to the real iyzico API.
        Iyzico IyzicoConfig
}

// IyzicoConfig holds the payment provider settings.
type IyzicoConfig struct {
        Mode      string // mock | sandbox | live
        BaseURL   string
        APIKey    string
        SecretKey string
}

// LoadEnv loads the .env file next to the working directory, mirroring
// internal/config.LoadEnv so both binaries behave the same in development.
func LoadEnv() {
        if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
                fmt.Printf("config: failed to load .env: %v\n", err)
        }
}

// Load reads and validates every platform setting from the environment.
func Load() (Config, error) {
        cfg := Config{
                Port:          envOr("PLATFORM_PORT", envOr("PORT", "8090")),
                FrontendURL:   strings.TrimRight(envOr("PLATFORM_FRONTEND_URL", "http://localhost:5174"), "/"),
                BackendURL:    strings.TrimRight(envOr("PLATFORM_BACKEND_URL", "http://localhost:8090"), "/"),
                AdminEmail:    strings.ToLower(strings.TrimSpace(os.Getenv("PLATFORM_ADMIN_EMAIL"))),
                AdminPassword: os.Getenv("PLATFORM_ADMIN_PASSWORD"),
        }

        cfg.CorsOrigins = splitList(os.Getenv("CORS_ORIGINS"))
        if len(cfg.CorsOrigins) == 0 {
                cfg.CorsOrigins = []string{cfg.FrontendURL}
        }

        secret := os.Getenv("PLATFORM_JWT_SECRET")
        if len(secret) < 32 {
                return Config{}, errors.New("PLATFORM_JWT_SECRET must be set and at least 32 characters long")
        }
        cfg.JWTSecret = []byte(secret)

        iyzico, err := loadIyzico()
        if err != nil {
                return Config{}, err
        }
        cfg.Iyzico = iyzico

        if (cfg.AdminEmail == "") != (cfg.AdminPassword == "") {
                return Config{}, errors.New("PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD must be set together (or both left empty)")
        }
        if cfg.AdminPassword != "" && len(cfg.AdminPassword) < 10 {
                return Config{}, errors.New("PLATFORM_ADMIN_PASSWORD must be at least 10 characters")
        }

        return cfg, nil
}

// BuildDSN builds the platform database connection string from PLATFORM_DB_*
// variables, mirroring internal/database.BuildDSN.
func BuildDSN() string {
        u := url.URL{
                Scheme:   "postgres",
                User:     url.UserPassword(os.Getenv("PLATFORM_DB_USER"), os.Getenv("PLATFORM_DB_PASSWORD")),
                Host:     fmt.Sprintf("%s:%s", envOr("PLATFORM_DB_HOST", "localhost"), envOr("PLATFORM_DB_PORT", "5432")),
                Path:     "/" + envOr("PLATFORM_DB_NAME", "openschool_platform"),
                RawQuery: "sslmode=" + envOr("PLATFORM_DB_SSLMODE", "disable"),
        }
        return u.String()
}

func loadIyzico() (IyzicoConfig, error) {
        mode := strings.ToLower(strings.TrimSpace(os.Getenv("IYZICO_MODE")))
        apiKey := strings.TrimSpace(os.Getenv("IYZICO_API_KEY"))
        secretKey := strings.TrimSpace(os.Getenv("IYZICO_SECRET_KEY"))

        switch {
        case mode == "mock":
        case mode == "live" || mode == "sandbox":
                if apiKey == "" || secretKey == "" {
                        return IyzicoConfig{}, fmt.Errorf("IYZICO_MODE=%s requires IYZICO_API_KEY and IYZICO_SECRET_KEY", mode)
                }
        case mode == "":
                // Default: real credentials present means sandbox; otherwise mock.
                if apiKey != "" && secretKey != "" {
                        mode = "sandbox"
                } else {
                        mode = "mock"
                }
        default:
                return IyzicoConfig{}, fmt.Errorf("IYZICO_MODE must be mock, sandbox or live, not %q", mode)
        }

        base := envOr("IYZICO_BASE_URL", "https://sandbox-api.iyzipay.com")
        if _, err := url.Parse(base); err != nil {
                return IyzicoConfig{}, fmt.Errorf("IYZICO_BASE_URL is not a valid URL: %w", err)
        }

        return IyzicoConfig{Mode: mode, BaseURL: base, APIKey: apiKey, SecretKey: secretKey}, nil
}

// IntEnv parses an integer environment variable, returning fallback when
// unset or invalid.
func IntEnv(key string, fallback int) int {
        v := strings.TrimSpace(os.Getenv(key))
        if v == "" {
                return fallback
        }
        n, err := strconv.Atoi(v)
        if err != nil {
                return fallback
        }
        return n
}

func envOr(key, fallback string) string {
        if v := strings.TrimSpace(os.Getenv(key)); v != "" {
                return v
        }
        return fallback
}

func splitList(v string) []string {
        v = strings.TrimSpace(v)
        if v == "" {
                return nil
        }
        parts := strings.Split(v, ",")
        out := make([]string, 0, len(parts))
        for _, p := range parts {
                if p = strings.TrimSpace(p); p != "" {
                        out = append(out, p)
                }
        }
        return out
}
