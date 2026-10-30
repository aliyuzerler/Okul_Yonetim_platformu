package admin

import (
        "github.com/gin-gonic/gin"
        "github.com/jackc/pgx/v5/pgxpool"
)

// RegisterRoutes wires the super-admin endpoints. Every route requires a
// super_admin session; there are no public admin endpoints.
func RegisterRoutes(admin *gin.RouterGroup, pool *pgxpool.Pool) {
        service := NewService(NewRepository(pool))
        handler := NewHandler(service)

        admin.GET("/tenants", handler.ListTenants)
        admin.GET("/tenants/:id", handler.TenantDetail)
        admin.POST("/tenants/:id/actions", handler.ApplyAction)
        admin.GET("/payments", handler.Payments)
        admin.GET("/summary", handler.Summary)
}
