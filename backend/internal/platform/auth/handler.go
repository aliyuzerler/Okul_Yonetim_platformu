package auth

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/platform/authx"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

// Handler exposes the platform account endpoints.
type Handler struct {
	service *Service
}

// NewHandler builds the auth handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Register creates a pending school and emails the verification link.
func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": friendlyBindError(err)})
		return
	}

	resp, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrTermsNotAccepted):
			c.JSON(http.StatusBadRequest, gin.H{"error": "Devam etmek için KVKK aydınlatma metnini ve kullanım koşullarını onaylamanız gerekiyor."})
		case errors.Is(err, ErrEmailTaken):
			c.JSON(http.StatusConflict, gin.H{"error": "Bu e-posta ile kayıtlı bir hesap zaten var. Giriş yapmayı ya da şifremi unuttum akışını deneyin."})
		case errors.Is(err, ErrTenantMissingPlan):
			c.JSON(http.StatusBadRequest, gin.H{"error": "Seçilen paket bulunamadı. Lütfen paket listesinden geçerli bir paket seçin."})
		default:
			apierror.Respond(c, err)
		}
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// VerifyEmail starts the trial after confirming the address.
func (h *Handler) VerifyEmail(c *gin.Context) {
	var req VerifyEmailRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Doğrulama kodu okunamadı."})
		return
	}

	if err := h.service.VerifyEmail(c.Request.Context(), req); err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, ErrTokenInvalid) {
			status = http.StatusUnauthorized
			c.JSON(status, gin.H{"error": "Doğrulama bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı talep edebilirsiniz."})
			return
		}
		apierror.Respond(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "E-posta doğrulandı. 14 günlük ücretsiz deneme süreniz başladı."})
}

// Login issues a platform session token.
func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": friendlyBindError(err)})
		return
	}

	resp, err := h.service.Login(c.Request.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, ErrInvalidCredentials):
			c.JSON(http.StatusUnauthorized, gin.H{"error": "E-posta veya şifre hatalı."})
		case errors.Is(err, ErrEmailNotVerified):
			c.JSON(http.StatusForbidden, gin.H{
				"error":  "E-posta adresiniz henüz doğrulanmadı. Gelen kutunuzdaki doğrulama bağlantısını kullanın.",
				"code":   "email_not_verified",
				"action": "resend_verification",
			})
		case errors.Is(err, ErrAccountDisabled):
			c.JSON(http.StatusForbidden, gin.H{"error": "Hesabınız devre dışı bırakılmış. Destek ile iletişime geçin."})
		default:
			apierror.Respond(c, err)
		}
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ForgotPassword always acknowledges generically.
func (h *Handler) ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": friendlyBindError(err)})
		return
	}
	resp, err := h.service.ForgotPassword(c.Request.Context(), req)
	if err != nil {
		apierror.Respond(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

// ResetPassword consumes the token and sets the new password.
func (h *Handler) ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": friendlyBindError(err)})
		return
	}
	if err := h.service.ResetPassword(c.Request.Context(), req); err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, ErrTokenInvalid) {
			status = http.StatusUnauthorized
			c.JSON(status, gin.H{"error": "Sıfırlama bağlantısı geçersiz, kullanılmış veya süresi dolmuş. Yeni bir bağlantı talep edin."})
			return
		}
		apierror.Respond(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz."})
}

// ResendVerification re-sends the verification email.
func (h *Handler) ResendVerification(c *gin.Context) {
	var req ResendVerificationRequest
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": friendlyBindError(err)})
		return
	}
	resp, err := h.service.ResendVerification(c.Request.Context(), req)
	if err != nil {
		apierror.Respond(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

// Me describes the signed-in platform user.
func (h *Handler) Me(c *gin.Context) {
	userID, ok := authx.UserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Oturum kimliği geçersiz."})
		return
	}
	resp, err := h.service.Me(c.Request.Context(), userID)
	if err != nil {
		apierror.Respond(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

// friendlyBindError turns validator errors into short Turkish messages,
// mirroring the school instance's setup module.
func friendlyBindError(err error) string {
	var validationErrors validator.ValidationErrors
	if !errors.As(err, &validationErrors) || len(validationErrors) == 0 {
		return "Gönderilen veriler okunamadı. Lütfen formu kontrol edin."
	}
	switch validationErrors[0].Field() {
	case "Email":
		return "Geçerli bir e-posta adresi girin."
	case "Password", "NewPassword":
		return "Şifre en az 10 karakter olmalıdır."
	case "SchoolName":
		return "Okul adı en az 3 karakter olmalıdır."
	case "FullName":
		return "Ad soyad zorunludur."
	case "PlanCode":
		return "Lütfen bir abonelik paketi seçin."
	default:
		return "Gönderilen veriler eksik veya geçersiz."
	}
}

// trimBearer is a tiny helper for tests of header parsing.
func trimBearer(header string) string {
	return strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
}
