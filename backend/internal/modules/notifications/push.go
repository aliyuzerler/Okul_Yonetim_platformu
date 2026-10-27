package notifications

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// The backend never talks to FCM/APNs directly: the Expo push gateway
// (exp.host) relays for it, keeping every vendor credential inside Expo
// (ADR 0010). Only the stdlib HTTP client is used — no SDK dependency.

const (
	// Expo accepts at most 100 messages per request; larger recipient sets
	// are split into consecutive batches.
	pushBatchSize = 100
	// Per-request budget; a push batch must never hang on a slow gateway.
	pushHTTPTimeout = 10 * time.Second
	// Response bodies are bounded before parsing.
	pushMaxResponseBody = 1 << 20

	defaultExpoPushURL = "https://exp.host/--/api/v2/push/send"

	// Android notification channel the mobile app created for these pushes.
	pushChannelID = "notifications"

	pushStatusOk                 = "ok"
	pushErrorDeviceNotRegistered = "DeviceNotRegistered"
)

// PushConfig holds the Expo push gateway settings.
type PushConfig struct {
	Enabled     bool
	BaseURL     string
	AccessToken string
}

// PushConfigFromEnv reads the push settings from the environment:
// PUSH_ENABLED is the master switch (default off), EXPO_PUSH_BASE_URL
// overrides the gateway endpoint (tests/staging only), and
// EXPO_PUSH_ACCESS_TOKEN authenticates the request to Expo (recommended
// in production; the token lives only in this process's environment).
func PushConfigFromEnv() PushConfig {
	return PushConfig{
		Enabled:     envFlag("PUSH_ENABLED"),
		BaseURL:     envDefault("EXPO_PUSH_BASE_URL", defaultExpoPushURL),
		AccessToken: strings.TrimSpace(os.Getenv("EXPO_PUSH_ACCESS_TOKEN")),
	}
}

func envFlag(name string) bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv(name))) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func envDefault(name, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(name)); value != "" {
		return value
	}
	return fallback
}

// pushToken is the service-layer view of a registered device token.
type pushToken struct {
	UserID               uuid.UUID
	Token, Platform      string
	Enabled              bool
	CreatedAt, UpdatedAt pgtype.Timestamptz
}

// PushTokenResponse is the API view returned by /me/push-tokens. The token is
// returned in full — it belongs to the caller's own device and the mobile app
// needs it to reconcile registrations; masking applies to logs only.
type PushTokenResponse struct {
	Token     string             `json:"token"`
	Platform  string             `json:"platform"`
	Enabled   bool               `json:"enabled"`
	CreatedAt pgtype.Timestamptz `json:"created_at"`
	UpdatedAt pgtype.Timestamptz `json:"updated_at"`
}

var (
	ErrInvalidPushToken    = errors.New("token must be an Expo push token (ExponentPushToken[...])")
	ErrInvalidPushPlatform = errors.New("platform must be ios, android or web")
)

// expoTokenPattern matches Expo device tokens (ExponentPushToken[...]).
var expoTokenPattern = regexp.MustCompile(`^ExponentPushToken\[[0-9a-zA-Z_-]{20,64}\]$`)

// validPushToken reports whether raw is a well-formed Expo push token.
func validPushToken(raw string) bool {
	return expoTokenPattern.MatchString(raw)
}

var validPushPlatforms = map[string]bool{"ios": true, "android": true, "web": true}

// maskToken makes a push token safe for logs: the recognizable head and tail
// survive, the middle is hidden.
func maskToken(token string) string {
	switch {
	case token == "":
		return ""
	case len(token) <= 12:
		return strings.Repeat("*", len(token))
	default:
		return token[:8] + "..." + token[len(token)-4:]
	}
}

// PushTokenStore is the persistence half of push delivery. It is implemented
// by PushTokenRepository, which lives in repository.go together with the
// module's other sqlc-backed adapter.
type PushTokenStore interface {
	UpsertPushToken(ctx context.Context, userID uuid.UUID, token, platform string) (pushToken, error)
	ListMyPushTokens(ctx context.Context, userID uuid.UUID) ([]pushToken, error)
	DisablePushToken(ctx context.Context, userID uuid.UUID, token string) (int64, error)
	ListEnabledPushTokensByUsers(ctx context.Context, userIDs []uuid.UUID) ([]pushToken, error)
	PrunePushTokens(ctx context.Context, tokens []string) (int64, error)
}

// expoPushMessage is one message inside an Expo push batch.
type expoPushMessage struct {
	To        string `json:"to"`
	Title     string `json:"title,omitempty"`
	Body      string `json:"body,omitempty"`
	ChannelID string `json:"channelId,omitempty"`
}

type expoPushTicket struct {
	Status  string `json:"status"`
	ID      string `json:"id"`
	Message string `json:"message"`
	Details struct {
		Error string `json:"error"`
	} `json:"details"`
}

type expoPushResponse struct {
	Data   []expoPushTicket `json:"data"`
	Errors []struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"errors"`
}

// PushService fans notifications out through the Expo push gateway and owns
// the device token lifecycle behind /me/push-tokens. Push is a second,
// best-effort channel: the in-app inbox remains the source of truth.
type PushService struct {
	config PushConfig
	client *http.Client
	repo   PushTokenStore
}

func NewPushService(config PushConfig, repo PushTokenStore) *PushService {
	return &PushService{config: config, client: &http.Client{Timeout: pushHTTPTimeout}, repo: repo}
}

// RegisterToken validates and stores (or re-enables) a device token.
func (s *PushService) RegisterToken(ctx context.Context, userID uuid.UUID, token, platform string) (PushTokenResponse, error) {
	token = strings.TrimSpace(token)
	platform = strings.ToLower(strings.TrimSpace(platform))
	if !validPushToken(token) {
		return PushTokenResponse{}, ErrInvalidPushToken
	}
	if !validPushPlatforms[platform] {
		return PushTokenResponse{}, ErrInvalidPushPlatform
	}
	registered, err := s.repo.UpsertPushToken(ctx, userID, token, platform)
	if err != nil {
		return PushTokenResponse{}, err
	}
	return pushTokenToResponse(registered), nil
}

// ListTokens returns the caller's registered devices.
func (s *PushService) ListTokens(ctx context.Context, userID uuid.UUID) ([]PushTokenResponse, error) {
	rows, err := s.repo.ListMyPushTokens(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]PushTokenResponse, len(rows))
	for i, row := range rows {
		out[i] = pushTokenToResponse(row)
	}
	return out, nil
}

// DisableToken unregisters one of the caller's devices. It is idempotent:
// disabling an already-gone token is still a success.
func (s *PushService) DisableToken(ctx context.Context, userID uuid.UUID, token string) error {
	token = strings.TrimSpace(token)
	if token == "" {
		return ErrInvalidPushToken
	}
	_, err := s.repo.DisablePushToken(ctx, userID, token)
	return err
}

// PushToUsers delivers the message to every enabled push token owned by the
// given users. Best-effort by design: failures are logged, never propagated,
// and tokens Expo reports as no longer registered are pruned.
func (s *PushService) PushToUsers(ctx context.Context, title, body string, userIDs []uuid.UUID) {
	if !s.config.Enabled || len(userIDs) == 0 {
		return
	}
	rows, err := s.repo.ListEnabledPushTokensByUsers(ctx, userIDs)
	if err != nil {
		log.Printf("push: list tokens for %d users: %v", len(userIDs), err)
		return
	}
	tokens := make([]pushToken, 0, len(rows))
	for _, row := range rows {
		if !validPushToken(row.Token) {
			log.Printf("push: skipping malformed token %s", maskToken(row.Token))
			continue
		}
		tokens = append(tokens, row)
	}
	var dead []string
	for _, batch := range groupPushMessages(title, body, tokens) {
		pruned, err := s.sendBatch(ctx, batch)
		if err != nil {
			log.Printf("push: batch of %d messages failed: %v", len(batch.messages), err)
			continue
		}
		dead = append(dead, pruned...)
	}
	if len(dead) > 0 {
		if pruned, err := s.repo.PrunePushTokens(ctx, dead); err != nil {
			log.Printf("push: prune %d dead tokens: %v", len(dead), err)
		} else {
			log.Printf("push: pruned %d DeviceNotRegistered tokens", pruned)
		}
	}
}

// pushBatch pairs the messages of one gateway request with the parallel list
// of raw tokens, so per-ticket failures can be traced back to devices.
type pushBatch struct {
	messages []expoPushMessage
	tokens   []string
}

// groupPushMessages builds the gateway batches, at most pushBatchSize
// messages each.
func groupPushMessages(title, body string, tokens []pushToken) []pushBatch {
	batches := make([]pushBatch, 0, (len(tokens)+pushBatchSize-1)/pushBatchSize)
	for start := 0; start < len(tokens); start += pushBatchSize {
		end := start + pushBatchSize
		if end > len(tokens) {
			end = len(tokens)
		}
		group := tokens[start:end]
		batch := pushBatch{
			messages: make([]expoPushMessage, 0, len(group)),
			tokens:   make([]string, 0, len(group)),
		}
		for _, token := range group {
			batch.messages = append(batch.messages, expoPushMessage{To: token.Token, Title: title, Body: body, ChannelID: pushChannelID})
			batch.tokens = append(batch.tokens, token.Token)
		}
		batches = append(batches, batch)
	}
	return batches
}

// sendBatch posts one batch to the Expo gateway and returns the tokens Expo
// reported as no longer registered.
func (s *PushService) sendBatch(ctx context.Context, batch pushBatch) ([]string, error) {
	payload, err := json.Marshal(batch.messages)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.config.BaseURL, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	if s.config.AccessToken != "" {
		req.Header.Set("Authorization", "Bearer "+s.config.AccessToken)
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, pushMaxResponseBody))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode == http.StatusTooManyRequests {
		// 429 carries a Retry-After; surfacing it in the log keeps the
		// operator able to size the fan-out.
		return nil, fmt.Errorf("expo push rate limited (429), retry after %q", resp.Header.Get("Retry-After"))
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return nil, fmt.Errorf("expo push returned %d: %s", resp.StatusCode, summarizeExpoErrors(body))
	}
	var parsed expoPushResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, fmt.Errorf("decode expo push response: %w", err)
	}
	if len(parsed.Errors) > 0 {
		return nil, fmt.Errorf("expo push rejected batch: %s", summarizeExpoErrors(body))
	}
	var dead []string
	for i, ticket := range parsed.Data {
		if ticket.Status == pushStatusOk || i >= len(batch.tokens) {
			continue
		}
		token := batch.tokens[i]
		if ticket.Details.Error == pushErrorDeviceNotRegistered {
			log.Printf("push: device no longer registered, pruning %s", maskToken(token))
			dead = append(dead, token)
			continue
		}
		log.Printf("push: ticket for %s failed: %s (%s)", maskToken(token), ticket.Message, ticket.Details.Error)
	}
	return dead, nil
}

// summarizeExpoErrors extracts the gateway's error messages from a non-2xx
// body, falling back to the raw body when it does not parse.
func summarizeExpoErrors(body []byte) string {
	var parsed expoPushResponse
	if err := json.Unmarshal(body, &parsed); err != nil || len(parsed.Errors) == 0 {
		return strconv.Quote(strings.TrimSpace(string(body)))
	}
	parts := make([]string, 0, len(parsed.Errors))
	for _, e := range parsed.Errors {
		parts = append(parts, e.Code+": "+e.Message)
	}
	return strings.Join(parts, "; ")
}

func pushTokenToResponse(token pushToken) PushTokenResponse {
	return PushTokenResponse{Token: token.Token, Platform: token.Platform, Enabled: token.Enabled, CreatedAt: token.CreatedAt, UpdatedAt: token.UpdatedAt}
}
