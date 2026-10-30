package admin

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/apierror"
	"github.com/openschool-org/openschool/internal/platform/authx"
	"github.com/openschool-org/openschool/internal/platform/httpx"
)

// Handler exposes the super-admin endpoints.
type Handler struct {
	service *Service
}

// NewHandler builds the admin handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// ListTenants serves the searchable tenant directory.
func (h *Handler) ListTenants(c *gin.Context) {
	resp, err := h.service.ListTenants(
		c.Request.Context(),
		c.Query("query"), c.Query("status"),
		intQuery(c, "page", 1), intQuery(c, "page_size", 20),
	)
	if err != nil {
		apierror.Respond(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

// TenantDetail serves the dossier for one tenant.
func (h *Handler) TenantDetail(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz okul kimliği."})
		return
	}
	detail, err := h.service.TenantDetail(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrTenantNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Okul bulunamadı."})
			return
		}
		apierror.Respond(c, err)
		return
	}
	c.JSON(http.StatusOK, detail)
}

// ApplyAction executes an operator override on a tenant.
func (h *Handler) ApplyAction(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz okul kimliği."})
		return
	}

	var req TenantAction
	if err := httpx.BindStrict(c, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "İstek gövdesi geçersiz."})
		return
	}

	actor := authx.EmailFromContext(c)
	if actor == "" {
		actor = "super_admin"
	}
	if err := h.service.ApplyAction(c.Request.Context(), id, actor, req); err != nil {
		switch {
		case errors.Is(err, ErrInvalidAction):
			c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz işlem. extend_trial (trial_days 1–90) veya set_status (active/past_due/expired/cancelled)."})
		case errors.Is(err, ErrTrialNotExtendable):
			c.JSON(http.StatusConflict, gin.H{"error": "Bu okulun deneme süresi uzatılamaz; canlı deneme kaydı yok."})
		default:
			apierror.Respond(c, err)
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "İşlem uygulandı."})
}

// Payments pages the whole ledger.
func (h *Handler) Payments(c *gin.Context) {
	resp, err := h.service.Payments(
		c.Request.Context(), c.Query("status"),
		intQuery(c, "page", 1), intQuery(c, "page_size", 20),
	)
	if err != nil {
		apierror.Respond(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

// Summary serves the revenue dashboard.
func (h *Handler) Summary(c *gin.Context) {
	resp, err := h.service.Summary(c.Request.Context())
	if err != nil {
		apierror.Respond(c, err)
		return
	}
	c.JSON(http.StatusOK, resp)
}

func intQuery(c *gin.Context, key string, fallback int) int {
	raw := c.Query(key)
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return n
}
