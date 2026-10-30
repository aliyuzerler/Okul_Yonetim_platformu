package authx

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Context keys set by RequireAuth.
const (
	ctxUserID   = "platformUserID"
	ctxRole     = "platformRole"
	ctxTenantID = "platformTenantID"
	ctxEmail    = "platformEmail"
)

// RequireAuth validates the Bearer session token and stores the identity on
// the request context.
func RequireAuth(secret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		tokenString, ok := strings.CutPrefix(header, "Bearer ")
		if !ok || tokenString == "" {
			abortUnauthorized(c)
			return
		}

		claims, err := ParseSessionToken(secret, tokenString)
		if err != nil {
			abortUnauthorized(c)
			return
		}

		c.Set(ctxUserID, claims.UserID)
		c.Set(ctxRole, claims.Role)
		c.Set(ctxTenantID, claims.TenantID)
		c.Set(ctxEmail, claims.Email)
		c.Next()
	}
}

// RequireRole aborts with 403 unless the caller carries one of the roles,
// mirroring internal/middleware.RequireRole for platform tokens.
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, ok := c.Get(ctxRole)
		if !ok {
			abortUnauthorized(c)
			return
		}
		current, _ := role.(string)
		for _, allowed := range roles {
			if current == allowed {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": "Bu işlem için yetkiniz yok.",
		})
	}
}

// UserIDFromContext returns the authenticated platform user's id.
func UserIDFromContext(c *gin.Context) (uuid.UUID, bool) {
	raw, ok := c.Get(ctxUserID)
	if !ok {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(raw.(string))
	return id, err == nil
}

// TenantIDFromContext returns the caller's tenant id (empty for super admins).
func TenantIDFromContext(c *gin.Context) (uuid.UUID, bool) {
	raw, ok := c.Get(ctxTenantID)
	if !ok {
		return uuid.Nil, false
	}
	s, _ := raw.(string)
	if s == "" {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(s)
	return id, err == nil
}

// RoleFromContext returns the caller's platform role.
func RoleFromContext(c *gin.Context) string {
	raw, ok := c.Get(ctxRole)
	role, _ := raw.(string)
	if !ok {
		return ""
	}
	return role
}

// EmailFromContext returns the caller's email as recorded in the token.
func EmailFromContext(c *gin.Context) string {
	raw, ok := c.Get(ctxEmail)
	email, _ := raw.(string)
	if !ok {
		return ""
	}
	return email
}

func abortUnauthorized(c *gin.Context) {
	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
		"error": "Oturum bulunamadı veya süresi doldu. Lütfen yeniden giriş yapın.",
	})
}
