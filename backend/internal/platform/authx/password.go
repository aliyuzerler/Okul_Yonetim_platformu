// Package authx holds the control plane's own authentication primitives:
// PBKDF2 password hashing, HS256 session tokens and the gin middleware that
// guards platform endpoints.
//
// School-instance identities live in ThunderID (ADR 0001); platform users
// are deliberately local, so this package is the only place besides the
// school's auth module that touches credential material.
package authx

import (
        "crypto/hmac"
        "crypto/pbkdf2"
        "crypto/rand"
        "crypto/sha256"
        "crypto/subtle"
        "encoding/base64"
        "errors"
        "fmt"
        "strconv"
        "strings"
)

// pbkdf2Iterations follows the OWASP Password Storage Cheat Sheet
// recommendation for PBKDF2-HMAC-SHA256. The stored hash carries its own
// iteration count so it can be raised later without invalidating old rows.
const pbkdf2Iterations = 600_000

const (
        hashScheme   = "pbkdf2_sha256"
        hashKeyLen   = 32 // 256-bit derived key
        hashSaltLen  = 16
)

var errPasswordHash = errors.New("authx: stored password hash is malformed")

// HashPassword derives a PBKDF2-HMAC-SHA256 hash and encodes it as
// "pbkdf2_sha256$<iterations>$<salt_b64>$<key_b64>" (Django-style,
// self-describing).
func HashPassword(password string) (string, error) {
        salt := make([]byte, hashSaltLen)
        if _, err := rand.Read(salt); err != nil {
                return "", fmt.Errorf("authx: salt generation failed: %w", err)
        }
        key, err := pbkdf2.Key(sha256.New, password, salt, pbkdf2Iterations, hashKeyLen)
        if err != nil {
                return "", fmt.Errorf("authx: key derivation failed: %w", err)
        }
        return fmt.Sprintf("%s$%d$%s$%s",
                hashScheme, pbkdf2Iterations,
                base64.RawStdEncoding.EncodeToString(salt),
                base64.RawStdEncoding.EncodeToString(key),
        ), nil
}

// VerifyPassword reports whether password matches the stored hash. It is
// constant-time over the derived key; malformed hashes always fail.
func VerifyPassword(storedHash, password string) bool {
        parts := strings.Split(storedHash, "$")
        if len(parts) != 4 || parts[0] != hashScheme {
                return false
        }
        iterations, err := strconv.Atoi(parts[1])
        if err != nil || iterations < 1 || iterations > 5_000_000 {
                return false
        }
        salt, err := base64.RawStdEncoding.DecodeString(parts[2])
        if err != nil {
                return false
        }
        want, err := base64.RawStdEncoding.DecodeString(parts[3])
        if err != nil || len(want) != hashKeyLen {
                return false
        }
        got, err := pbkdf2.Key(sha256.New, password, salt, iterations, len(want))
        if err != nil {
                return false
        }
        return subtle.ConstantTimeCompare(got, want) == 1
}

// NewToken returns a cryptographically random, URL-safe hex token.
func NewToken(nBytes int) (string, error) {
        b := make([]byte, nBytes)
        if _, err := rand.Read(b); err != nil {
                return "", fmt.Errorf("authx: token generation failed: %w", err)
        }
        return hexEncode(b), nil
}

// HashToken returns the lowercase hex SHA-256 of a token — the only form
// stored in the database (ADR 0005 discipline, applied to platform tokens).
func HashToken(token string) string {
        sum := sha256.Sum256([]byte(token))
        return hexEncode(sum[:])
}

// SignHS256 signs data with secretKey and returns the Base64 signature used
// by the iyzico v2 authorization header and webhook verification.
func SignHS256(secretKey string, data string) string {
        mac := hmac.New(sha256.New, []byte(secretKey))
        mac.Write([]byte(data))
        return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

// EqualConstTime compares two strings without leaking their content through
// timing.
func EqualConstTime(a, b string) bool {
        return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

func hexEncode(b []byte) string {
        const hexDigits = "0123456789abcdef"
        out := make([]byte, len(b)*2)
        for i, v := range b {
                out[i*2] = hexDigits[v>>4]
                out[i*2+1] = hexDigits[v&0x0f]
        }
        return string(out)
}
