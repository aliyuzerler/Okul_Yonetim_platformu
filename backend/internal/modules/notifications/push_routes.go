package notifications

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/middleware"
)

// registerPushRoutes mounts the device token endpoints on the protected
// group: every signed-in role registers on sign-in and unregisters on
// sign-out from the mobile app (ADR 0010).
func registerPushRoutes(protected *gin.RouterGroup, push *PushService) {
	if push == nil {
		return
	}
	h := &pushHandler{service: push}
	protected.POST("/me/push-tokens", h.Register)
	protected.GET("/me/push-tokens", h.List)
	protected.DELETE("/me/push-tokens", h.Unregister)
}

type pushHandler struct {
	service *PushService
}

type registerPushTokenRequest struct {
	Token    string `json:"token" binding:"required"`
	Platform string `json:"platform" binding:"required"`
}

type unregisterPushTokenRequest struct {
	Token string `json:"token"`
}

func (h *pushHandler) caller(c *gin.Context) (uuid.UUID, bool) {
	id, err := middleware.UserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid caller identity"})
		return uuid.UUID{}, false
	}
	return id, true
}

func (h *pushHandler) writeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalidPushToken), errors.Is(err, ErrInvalidPushPlatform):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	default:
		apierror.RespondInternal(c, err)
	}
}

func (h *pushHandler) Register(c *gin.Context) {
	userID, ok := h.caller(c)
	if !ok {
		return
	}
	var req registerPushTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	token, err := h.service.RegisterToken(c.Request.Context(), userID, req.Token, req.Platform)
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusCreated, token)
}

func (h *pushHandler) List(c *gin.Context) {
	userID, ok := h.caller(c)
	if !ok {
		return
	}
	tokens, err := h.service.ListTokens(c.Request.Context(), userID)
	if err != nil {
		apierror.RespondInternal(c, err)
		return
	}
	c.JSON(http.StatusOK, tokens)
}

// Unregister takes the token as a JSON body, falling back to the token query
// parameter — some HTTP stacks strip DELETE bodies.
func (h *pushHandler) Unregister(c *gin.Context) {
	userID, ok := h.caller(c)
	if !ok {
		return
	}
	var req unregisterPushTokenRequest
	_ = c.ShouldBindJSON(&req)
	if req.Token == "" {
		req.Token = c.Query("token")
	}
	if req.Token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token is required"})
		return
	}
	if err := h.service.DisableToken(c.Request.Context(), userID, req.Token); err != nil {
		h.writeError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "push token disabled"})
}
