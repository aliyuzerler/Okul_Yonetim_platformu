package auth

import (
        "context"
        "errors"
        "fmt"
        "log"
        "strings"
        "time"

        "github.com/google/uuid"
        "github.com/jackc/pgx/v5"
        "github.com/openschool-org/openschool/internal/mailer"
        "github.com/openschool-org/openschool/internal/platform/authx"
        "github.com/openschool-org/openschool/internal/platform/models"
)

// Token lifetimes (ADR 0005 discipline: short, single-use, hash-only).
const (
        verifyTokenTTL = 24 * time.Hour
        resetTokenTTL  = 30 * time.Minute
        sessionTTL     = 12 * time.Hour
)

// Service implements the platform account lifecycle: registration, email
// verification (which starts the trial), login, and password reset.
type Service struct {
        repo        *Repository
        mailer      mailer.Mailer
        jwtSecret   []byte
        frontendURL string

        now func() time.Time // overridable in tests
}

// NewService wires the platform auth service.
func NewService(repo *Repository, mailSender mailer.Mailer, jwtSecret []byte, frontendURL string) *Service {
        return &Service{
                repo:        repo,
                mailer:      mailSender,
                jwtSecret:   jwtSecret,
                frontendURL: frontendURL,
                now:         time.Now,
        }
}

// Register creates the tenant (pending_verification) and its owner, then
// emails a verification link. The trial starts only after verification.
func (s *Service) Register(ctx context.Context, req RegisterRequest) (RegisterResponse, error) {
        if !req.AcceptTerms {
                return RegisterResponse{}, ErrTermsNotAccepted
        }
        email := normalizeEmail(req.Email)

        if taken, err := s.repo.EmailExists(ctx, email); err != nil {
                return RegisterResponse{}, err
        } else if taken {
                return RegisterResponse{}, ErrEmailTaken
        }

        plan, err := s.repo.PlanByCode(ctx, req.PlanCode)
        if err != nil {
                if errors.Is(err, pgx.ErrNoRows) {
                        return RegisterResponse{}, ErrTenantMissingPlan
                }
                return RegisterResponse{}, err
        }
        if !plan.IsActive {
                return RegisterResponse{}, ErrTenantMissingPlan
        }

        slug, err := s.uniqueSlug(ctx, req.SchoolName)
        if err != nil {
                return RegisterResponse{}, err
        }

        tenantID := uuid.New()
        userID := uuid.New()
        passwordHash, err := authx.HashPassword(req.Password)
        if err != nil {
                return RegisterResponse{}, err
        }

        tenant := &models.Tenant{
                ID:          tenantID,
                Name:        req.SchoolName,
                Slug:        slug,
                City:        req.City,
                Phone:       req.Phone,
                ContactName: req.FullName,
                Status:      models.TenantPendingVerification,
        }
        user := &models.User{
                ID:           userID,
                TenantID:     tenantID,
                HasTenant:    true,
                Email:        email,
                FullName:     req.FullName,
                PasswordHash: passwordHash,
                Role:         models.RoleTenantAdmin,
                Status:       "active",
        }

        if err := s.repo.CreateTenantWithUser(ctx, tenant, plan.ID, user); err != nil {
                return RegisterResponse{}, err
        }

        if err := s.issueEmailToken(ctx, userID, email, req.FullName, "email_verify", verifyTokenTTL); err != nil {
                return RegisterResponse{}, err
        }

        _ = s.recordEvent(ctx, tenantID, "tenant.registered", map[string]any{
                "email": email, "plan_code": plan.Code, "slug": slug,
        }, email)

        return RegisterResponse{
                TenantID: tenantID.String(),
                Email:    email,
                Message:  "Kayıt alındı. E-posta adresinize gönderdiğimiz doğrulama bağlantısı 14 gün boyunca deneme süresini başlatır.",
        }, nil
}

// VerifyEmail confirms the address and starts the 14-day trial on the plan
// chosen at registration.
func (s *Service) VerifyEmail(ctx context.Context, req VerifyEmailRequest) error {
        userID, err := s.repo.ClaimEmailToken(ctx, authx.HashToken(req.Token), "email_verify")
        if err != nil {
                return err
        }

        user, err := s.repo.UserByID(ctx, userID)
        if err != nil {
                return err
        }
        if err := s.repo.MarkEmailVerified(ctx, userID); err != nil {
                return err
        }

        if !user.HasTenant {
                return nil // super admins verify nothing, but keep the flow uniform
        }

        tenant, err := s.repo.TenantByID(ctx, user.TenantID)
        if err != nil {
                return err
        }
        if tenant.Status != models.TenantPendingVerification {
                return nil // already verified/trial/active — idempotent
        }

        plan, err := s.repo.PlanByTenantSelection(ctx, tenant.ID)
        if err != nil {
                return err
        }

        trialEnds := s.now().AddDate(0, 0, plan.TrialDays)
        if err := s.repo.StartTrial(ctx, tenant.ID, plan.ID, trialEnds); err != nil {
                return err
        }

        _ = s.recordEvent(ctx, tenant.ID, "subscription.trial_started", map[string]any{
                "plan_code": plan.Code, "trial_days": plan.TrialDays, "trial_ends_at": trialEnds,
        }, "system")

        s.sendWelcome(user, tenant, plan, trialEnds)
        return nil
}

// Login authenticates a platform user and returns an HS256 session token.
func (s *Service) Login(ctx context.Context, req LoginRequest) (LoginResponse, error) {
        user, err := s.repo.UserByEmail(ctx, normalizeEmail(req.Email))
        if err != nil {
                if errors.Is(err, pgx.ErrNoRows) {
                        return LoginResponse{}, ErrInvalidCredentials
                }
                return LoginResponse{}, err
        }
        if !authx.VerifyPassword(user.PasswordHash, req.Password) {
                return LoginResponse{}, ErrInvalidCredentials
        }
        if user.Status != "active" {
                return LoginResponse{}, ErrAccountDisabled
        }
        if user.Role == models.RoleTenantAdmin && !user.EmailVerified {
                return LoginResponse{}, ErrEmailNotVerified
        }

        if err := s.repo.TouchLogin(ctx, user.ID); err != nil {
                log.Printf("platform auth: touch login: %v", err)
        }

        resp := LoginResponse{
                Role:      user.Role,
                Email:     user.Email,
                FullName:  user.FullName,
                ExpiresAt: s.now().Add(sessionTTL),
        }

        if user.HasTenant {
                tenant, err := s.repo.TenantByID(ctx, user.TenantID)
                if err != nil {
                        return LoginResponse{}, err
                }
                resp.Tenant = &TenantView{ID: tenant.ID.String(), Name: tenant.Name, Slug: tenant.Slug, Status: tenant.Status}
        }

        token, err := authx.SignSessionToken(s.jwtSecret, user.ID, user.Role, tenantIDString(user), user.Email, sessionTTL)
        if err != nil {
                return LoginResponse{}, err
        }
        resp.Token = token
        return resp, nil
}

// ForgotPassword emails a single-use reset link. The response is identical
// whether or not the address exists.
func (s *Service) ForgotPassword(ctx context.Context, req ForgotPasswordRequest) (GenericAcknowledgement, error) {
        user, err := s.repo.UserByEmail(ctx, normalizeEmail(req.Email))
        if err != nil && !errors.Is(err, pgx.ErrNoRows) {
                return GenericAcknowledgement{}, err
        }
        if err == nil && user.Status == "active" {
                if err := s.issueEmailToken(ctx, user.ID, user.Email, user.FullName, "password_reset", resetTokenTTL); err != nil {
                        return GenericAcknowledgement{}, err
                }
        }
        return GenericAcknowledgement{Message: "Eğer bu adres bir hesaba aitse, şifre sıfırlama bağlantısı gönderildi."}, nil
}

// ResetPassword completes the reset with the one-time token.
func (s *Service) ResetPassword(ctx context.Context, req ResetPasswordRequest) error {
        userID, err := s.repo.ClaimEmailToken(ctx, authx.HashToken(req.Token), "password_reset")
        if err != nil {
                return err
        }
        hash, err := authx.HashPassword(req.NewPassword)
        if err != nil {
                return err
        }
        return s.repo.SetPassword(ctx, userID, hash)
}

// ResendVerification re-sends the verification email for an unverified account.
func (s *Service) ResendVerification(ctx context.Context, req ResendVerificationRequest) (GenericAcknowledgement, error) {
        user, err := s.repo.UserByEmail(ctx, normalizeEmail(req.Email))
        if err != nil && !errors.Is(err, pgx.ErrNoRows) {
                return GenericAcknowledgement{}, err
        }
        if err == nil && user.Role == models.RoleTenantAdmin && !user.EmailVerified && user.Status == "active" {
                if err := s.issueEmailToken(ctx, user.ID, user.Email, user.FullName, "email_verify", verifyTokenTTL); err != nil {
                        return GenericAcknowledgement{}, err
                }
        }
        return GenericAcknowledgement{Message: "Eğer bu adres doğrulanmamış bir hesaba aitse, yeni bir doğrulama bağlantısı gönderildi."}, nil
}

// Me describes the signed-in user.
func (s *Service) Me(ctx context.Context, userID uuid.UUID) (MeResponse, error) {
        user, err := s.repo.UserByID(ctx, userID)
        if err != nil {
                return MeResponse{}, err
        }
        resp := MeResponse{
                ID:       user.ID.String(),
                Email:    user.Email,
                FullName: user.FullName,
                Role:     user.Role,
        }
        if user.HasTenant {
                tenant, err := s.repo.TenantByID(ctx, user.TenantID)
                if err != nil {
                        return MeResponse{}, err
                }
                resp.Tenant = &TenantView{ID: tenant.ID.String(), Name: tenant.Name, Slug: tenant.Slug, Status: tenant.Status}
        }
        return resp, nil
}

// issueEmailToken stores the hash and delivers the link by email. Mail
// failures are logged, not returned: a broken SMTP must not reveal account
// existence through error behaviour, and the user can retry via resend.
func (s *Service) issueEmailToken(ctx context.Context, userID uuid.UUID, email, fullName, tokenType string, ttl time.Duration) error {
        token, err := authx.NewToken(32)
        if err != nil {
                return err
        }
        if err := s.repo.InsertEmailToken(ctx, uuid.New(), userID, tokenType, authx.HashToken(token), s.now().Add(ttl)); err != nil {
                return err
        }

        var link, subject, body string
        switch tokenType {
        case "email_verify":
                link = fmt.Sprintf("%s/e-posta-dogrula?token=%s", s.frontendURL, token)
                subject, body = verificationEmail(fullName, link)
        case "password_reset":
                link = fmt.Sprintf("%s/sifre-sifirla?token=%s", s.frontendURL, token)
                subject, body = resetEmail(fullName, link)
        default:
                return fmt.Errorf("auth: unknown email token type %q", tokenType)
        }

        if err := s.mailer.Send(ctx, mailer.Message{To: email, Subject: subject, Text: body, HTML: toHTML(subject, body)}); err != nil {
                log.Printf("platform auth: send %s email to %s failed: %v", tokenType, email, err)
        }
        return nil
}

func (s *Service) sendWelcome(user models.User, tenant models.Tenant, plan models.Plan, trialEnds time.Time) {
        subject, body := welcomeEmail(user.FullName, tenant.Name, plan.Name, trialEnds)
        if err := s.mailer.Send(context.Background(), mailer.Message{To: user.Email, Subject: subject, Text: body, HTML: toHTML(subject, body)}); err != nil {
                log.Printf("platform auth: send welcome email to %s failed: %v", user.Email, err)
        }
}

func (s *Service) uniqueSlug(ctx context.Context, name string) (string, error) {
        base := slugify(name)
        if base == "" {
                base = "okul"
        }
        candidate := base
        for i := 2; i <= 100; i++ {
                taken, err := s.repo.SlugTaken(ctx, candidate)
                if err != nil {
                        return "", err
                }
                if !taken {
                        return candidate, nil
                }
                candidate = fmt.Sprintf("%s-%d", base, i)
        }
        return "", errors.New("auth: could not derive a unique slug for this school name")
}

func (s *Service) recordEvent(ctx context.Context, tenantID uuid.UUID, eventType string, data map[string]any, actor string) error {
        payload := marshalData(data)
        _, err := s.repo.Pool().Exec(ctx, `
                INSERT INTO platform_events (id, tenant_id, event_type, data, actor)
                VALUES ($1, $2, $3, $4::jsonb, $5)`, uuid.New(), tenantID, eventType, payload, actor)
        return err
}

func tenantIDString(u models.User) string {
        if !u.HasTenant {
                return ""
        }
        return u.TenantID.String()
}

func normalizeEmail(email string) string {
        return strings.ToLower(strings.TrimSpace(email))
}
