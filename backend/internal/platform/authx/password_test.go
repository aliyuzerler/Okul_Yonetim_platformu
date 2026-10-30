package authx

import (
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestHashPasswordRoundTrip(t *testing.T) {
	hash, err := HashPassword("Okul-Şifre-2026!")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	if !strings.HasPrefix(hash, "pbkdf2_sha256$600000$") {
		t.Fatalf("hash format unexpected: %q", hash)
	}
	if !VerifyPassword(hash, "Okul-Şifre-2026!") {
		t.Fatal("correct password rejected")
	}
	if VerifyPassword(hash, "wrong-password") {
		t.Fatal("wrong password accepted")
	}
}

func TestVerifyPasswordMalformed(t *testing.T) {
	for _, bad := range []string{"", "garbage", "pbkdf2_sha256$abc$xx$yy", "bcrypt$1$aa$bb"} {
		if VerifyPassword(bad, "anything") {
			t.Fatalf("malformed hash accepted: %q", bad)
		}
	}
}

func TestSessionTokenRoundTrip(t *testing.T) {
	secret := []byte("test-secret-that-is-at-least-32-chars!")
	userID := uuid.New()

	token, err := SignSessionToken(secret, userID, RoleTenantAdmin, uuid.NewString(), "admin@okul.k12.tr", time.Hour)
	if err != nil {
		t.Fatalf("SignSessionToken: %v", err)
	}

	claims, err := ParseSessionToken(secret, token)
	if err != nil {
		t.Fatalf("ParseSessionToken: %v", err)
	}
	if claims.UserID != userID.String() || claims.Role != RoleTenantAdmin {
		t.Fatalf("claims mismatch: %+v", claims)
	}

	// Wrong secret must fail.
	if _, err := ParseSessionToken([]byte("another-secret-that-is-32-chars-long!!"), token); err == nil {
		t.Fatal("token accepted with wrong secret")
	}
}

func TestSessionTokenExpiry(t *testing.T) {
	secret := []byte("test-secret-that-is-at-least-32-chars!")
	token, err := SignSessionToken(secret, uuid.New(), RoleSuperAdmin, "", "a@b.c", -time.Minute)
	if err != nil {
		t.Fatalf("SignSessionToken: %v", err)
	}
	if _, err := ParseSessionToken(secret, token); err == nil {
		t.Fatal("expired token accepted")
	}
}

func TestHashTokenIsSha256Hex(t *testing.T) {
	got := HashToken("deneme-token")
	if len(got) != 64 {
		t.Fatalf("hash length = %d, want 64", len(got))
	}
	if got != HashToken("deneme-token") || got == HashToken("deneme-token2") {
		t.Fatal("hash not deterministic/distinct")
	}
}

func TestSignHS256AndEqualConstTime(t *testing.T) {
	sig := SignHS256("secret", "data")
	if sig == "" {
		t.Fatal("empty signature")
	}
	if !EqualConstTime(sig, SignHS256("secret", "data")) {
		t.Fatal("same inputs produced unequal signatures")
	}
	if EqualConstTime(sig, SignHS256("secret2", "data")) {
		t.Fatal("different keys produced equal signatures")
	}
}
