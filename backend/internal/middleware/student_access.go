// This file defines the RequireStudentAccess middleware, which authorizes access to a student's resources based on the user's role (admin, teacher, student requesting their own profile, or guardian requesting their child's profile).

package middleware

import (
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/openschool-org/openschool/internal/authz"
	"github.com/openschool-org/openschool/internal/ports"
)

// RequireStudentAccess aborts with 403 unless the caller is an admin, a teacher, the student themself, or a guardian of the student named by the :id URL parameter.
func RequireStudentAccess(access ports.StudentAccessAuthorizer) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := UserIDFromContext(c)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz kullanıcı kimliği."})
			return
		}

		userRoleList, ok := rolesFromContext(c)
		if !ok {
			return
		}

		if slices.Contains(userRoleList, authz.RoleAdmin) || slices.Contains(userRoleList, authz.RoleTeacher) {
			c.Next()
			return
		}

		studentIDStr := c.Param("id")
		if studentIDStr == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Öğrenci kimliği eksik."})
			return
		}
		studentID, err := uuid.Parse(studentIDStr)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Geçersiz öğrenci kimliği."})
			return
		}

		if slices.Contains(userRoleList, authz.RoleStudent) {
			ownedStudentID, err := access.StudentIDForUser(c.Request.Context(), userID)
			if err == nil && ownedStudentID == studentID {
				c.Next()
				return
			}
		}

		if slices.Contains(userRoleList, authz.RoleParent) {
			isGuardian, err := access.IsGuardianOfStudent(c.Request.Context(), userID, studentID)
			if err == nil && isGuardian {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Bu öğrenci kaydına erişim yetkiniz yok."})
	}
}
