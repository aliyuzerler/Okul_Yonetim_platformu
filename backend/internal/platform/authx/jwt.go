package authx

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// SessionClaims is the platform session token payload. TenantID is empty
// for super admins.
type SessionClaims struct {
	UserID   string `json:"uid"`
	Role     string `json:"role"`
	TenantID string `json:"tenant_id,omitempty"`
	Email    string `json:"email,omitempty"`
	jwt.RegisteredClaims
}

// ErrSessionInvalid is returned for any token that cannot be trusted.
var ErrSessionInvalid = errors.New("authx: session token invalid")

// Roles recognized by the control plane.
const (
	RoleSuperAdmin  = "super_admin"
	RoleTenantAdmin = "tenant_admin"
)

// SignSessionToken issues an HS256 session token for one platform user.
func SignSessionToken(secret []byte, userID uuid.UUID, role, tenantID, email string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := SessionClaims{
		UserID:   userID.String(),
		Role:     role,
		TenantID: tenantID,
		Email:    email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			Issuer:    "openschool-platform",
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
}

// ParseSessionToken validates signature, algorithm and expiry, returning the claims.
func ParseSessionToken(secret []byte, tokenString string) (*SessionClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &SessionClaims{}, func(t *jwt.Token) (any, error) {
		return secret, nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil {
		return nil, ErrSessionInvalid
	}
	claims, ok := token.Claims.(*SessionClaims)
	if !ok || !token.Valid || claims.UserID == "" || claims.Role == "" {
		return nil, ErrSessionInvalid
	}
	return claims, nil
}
