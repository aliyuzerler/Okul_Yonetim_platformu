// Package apierror centralises how handlers respond to unexpected errors, so
// pgx and validation errors stop leaking table/column names and internal
// shapes to the client (audit finding S4). Domain errors that already have a
// safe, hand-written message can keep returning err.Error() with the
// appropriate 4xx status; RespondInternal is for everything else.
package apierror

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

// RequestIDContextKey is the gin context key the request-id middleware
// stores the current request's id under. RespondInternal reads it back so
// the generic error response and the server-side log line can be
// correlated for a support request, without this package depending on the
// middleware package.
const RequestIDContextKey = "request_id"

// RespondInternal logs the real error server-side, tagged with the request
// id, method and route, then writes a 500 response that carries no internal
// detail beyond the id needed to find that log line.
func RespondInternal(c *gin.Context, err error) {
	rid, _ := c.Get(RequestIDContextKey)
	requestID, _ := rid.(string)

	slog.Error("internal error",
		"request_id", requestID,
		"method", c.Request.Method,
		"route", c.FullPath(),
		"error", err,
	)

	c.JSON(http.StatusInternalServerError, gin.H{
		"error":      "Bir sorun oluştu. Lütfen yeniden deneyin.",
		"request_id": requestID,
	})
}
