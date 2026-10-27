package auth

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/openschool-org/openschool/internal/middleware"
)

// AuthHandler exposes the unauthenticated password-lifecycle endpoints (forgot/reset/change password).
type AuthHandler struct {
	service *Service
}

// NewAuthHandler constructs an AuthHandler with its service dependency.
func NewAuthHandler(service *Service) *AuthHandler {
	return &AuthHandler{service: service}
}

// ForgotPassword verifies identity (email + NIC/index number) and issues a one-time reset token. Not available for admin accounts.
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.service.ForgotPassword(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ResetPassword sets a new password using the one-time token from ForgotPassword.
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.ResetPassword(c.Request.Context(), req); err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, ErrResetTokenInvalid) {
			status = http.StatusUnauthorized
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Şifre güncellendi"})
}

// ChangePassword sets a new password for the signed-in user — also used by the first-login "set a new password" choice.
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	actorID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Oturum kimliği geçersiz."})
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.ChangePassword(c.Request.Context(), actorID, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Şifre güncellendi"})
}

// KeepDefaultPassword clears the must-change-password flag without changing the password.
func (h *AuthHandler) KeepDefaultPassword(c *gin.Context) {
	actorID, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Oturum kimliği geçersiz."})
		return
	}

	if err := h.service.KeepDefaultPassword(c.Request.Context(), actorID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Şifre korundu"})
}
