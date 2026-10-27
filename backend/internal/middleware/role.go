package middleware

import (
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"
)

// RequireRole aborts with 403 unless the caller's JWT carries at least one of the given roles.
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRoleList, ok := rolesFromContext(c)
		if !ok {
			return
		}

		for _, required := range roles {
			if slices.Contains(userRoleList, required) {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": "Bu işlem için yetkiniz yok.",
		})
	}
}
