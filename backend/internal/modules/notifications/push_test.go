package notifications

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type fakePushTokens struct {
	tokens []pushToken
	pruned []string
}

func (f *fakePushTokens) UpsertPushToken(_ context.Context, userID uuid.UUID, token, platform string) (pushToken, error) {
	registered := pushToken{UserID: userID, Token: token, Platform: platform, Enabled: true, UpdatedAt: nowish()}
	f.tokens = append(f.tokens, registered)
	return registered, nil
}

func (f *fakePushTokens) ListMyPushTokens(_ context.Context, userID uuid.UUID) ([]pushToken, error) {
	var out []pushToken
	for _, token := range f.tokens {
		if token.UserID == userID {
			out = append(out, token)
		}
	}
	return out, nil
}

func (f *fakePushTokens) DisablePushToken(_ context.Context, userID uuid.UUID, token string) (int64, error) {
	var disabled int64
	for i, candidate := range f.tokens {
		if candidate.UserID == userID && candidate.Token == token && candidate.Enabled {
			f.tokens[i].Enabled = false
			disabled++
		}
	}
	return disabled, nil
}

func (f *fakePushTokens) ListEnabledPushTokensByUsers(_ context.Context, userIDs []uuid.UUID) ([]pushToken, error) {
	wanted := make(map[uuid.UUID]bool, len(userIDs))
	for _, id := range userIDs {
		wanted[id] = true
	}
	var out []pushToken
	for _, token := range f.tokens {
		if token.Enabled && wanted[token.UserID] {
			out = append(out, token)
		}
	}
	return out, nil
}

func (f *fakePushTokens) PrunePushTokens(_ context.Context, tokens []string) (int64, error) {
	f.pruned = append(f.pruned, tokens...)
	return int64(len(tokens)), nil
}

func nowish() pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: time.Date(2026, 2, 1, 9, 0, 0, 0, time.UTC), Valid: true}
}

// testExpoToken builds a syntactically valid Expo token from a short seed,
// padded to a fixed body length so every token is well-formed.
func testExpoToken(seed string) string {
	body := seed + strings.Repeat("0", 32-len(seed))
	return "ExponentPushToken[" + body + "]"
}

// expoGateway spins up a fake Expo push server that records every batch body.
func expoGateway(t *testing.T, status int, response string, batches *[][]expoPushMessage) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Errorf("read request body: %v", err)
		}
		var messages []expoPushMessage
		if err := json.Unmarshal(body, &messages); err != nil {
			t.Errorf("decode batch: %v", err)
		}
		*batches = append(*batches, messages)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = w.Write([]byte(response))
	}))
}

func TestPushServiceGroupsByOneHundred(t *testing.T) {
	var batches [][]expoPushMessage
	server := expoGateway(t, http.StatusOK, `{"data":[]}`, &batches)
	defer server.Close()

	user := uuid.New()
	store := &fakePushTokens{}
	for i := 0; i < 150; i++ {
		store.tokens = append(store.tokens, pushToken{UserID: user, Token: testExpoToken(strconv.Itoa(i)), Platform: "android", Enabled: true})
	}
	service := NewPushService(PushConfig{Enabled: true, BaseURL: server.URL}, store)
	service.PushToUsers(context.Background(), "Title", "Body", []uuid.UUID{user})

	// 150 tokens ride in one 100-message batch plus one 50-message batch.
	if len(batches) != 2 {
		t.Fatalf("expected 2 batches, got %d", len(batches))
	}
	if len(batches[0]) != 100 || len(batches[1]) != 50 {
		t.Fatalf("expected 100+50 split, got %d+%d", len(batches[0]), len(batches[1]))
	}
}

func TestPushServiceDisabledSendsNothing(t *testing.T) {
	var batches [][]expoPushMessage
	server := expoGateway(t, http.StatusOK, `{"data":[]}`, &batches)
	defer server.Close()

	user := uuid.New()
	store := &fakePushTokens{tokens: []pushToken{{UserID: user, Token: testExpoToken("x"), Platform: "ios", Enabled: true}}}
	service := NewPushService(PushConfig{Enabled: false, BaseURL: server.URL}, store)
	service.PushToUsers(context.Background(), "Title", "Body", []uuid.UUID{user})
	if len(batches) != 0 {
		t.Fatalf("disabled service sent %d batches", len(batches))
	}
}

func TestPushServiceHandles400(t *testing.T) {
	user := uuid.New()
	store := &fakePushTokens{tokens: []pushToken{{UserID: user, Token: testExpoToken("x"), Platform: "ios", Enabled: true}}}
	var batches [][]expoPushMessage
	server := expoGateway(t, http.StatusBadRequest, `{"errors":[{"code":"VALIDATION_ERROR","message":"\"to\" should be a push token"}]}`, &batches)
	defer server.Close()

	service := NewPushService(PushConfig{Enabled: true, BaseURL: server.URL}, store)
	// Must not panic, and a rejected batch must not prune anything.
	service.PushToUsers(context.Background(), "Title", "Body", []uuid.UUID{user})
	if len(store.pruned) != 0 {
		t.Fatalf("pruned tokens on a failed batch: %v", store.pruned)
	}

	_, err := service.sendBatch(context.Background(), pushBatch{
		messages: []expoPushMessage{{To: testExpoToken("x")}},
		tokens:   []string{testExpoToken("x")},
	})
	if err == nil {
		t.Fatal("expected the 400 to surface as an error")
	}
	if !strings.Contains(err.Error(), "expo push returned 400") || !strings.Contains(err.Error(), "VALIDATION_ERROR") {
		t.Fatalf("error lost the gateway detail: %v", err)
	}
}

func TestPushServiceFanOutAndPrune(t *testing.T) {
	user := uuid.New()
	healthy, stale := testExpoToken("healthy"), testExpoToken("stale00")
	store := &fakePushTokens{tokens: []pushToken{
		{UserID: user, Token: healthy, Platform: "ios", Enabled: true},
		{UserID: user, Token: stale, Platform: "android", Enabled: true},
	}}
	response := `{"data":[{"status":"ok","id":"ticket-1"},{"status":"error","message":"The device cannot receive push notifications","details":{"error":"DeviceNotRegistered"}}]}`
	var batches [][]expoPushMessage
	server := expoGateway(t, http.StatusOK, response, &batches)
	defer server.Close()

	service := NewPushService(PushConfig{Enabled: true, BaseURL: server.URL}, store)
	service.PushToUsers(context.Background(), "Devamsızlık kaydedildi", "body", []uuid.UUID{user})

	if len(batches) != 1 || len(batches[0]) != 2 {
		t.Fatalf("expected one batch of 2, got %+v", batches)
	}
	if len(store.pruned) != 1 || store.pruned[0] != stale {
		t.Fatalf("expected only the DeviceNotRegistered token pruned, got %v", store.pruned)
	}
	if healthy == stale {
		t.Fatal("test tokens must differ")
	}
}

func TestPushServiceSkipsMalformedTokens(t *testing.T) {
	user := uuid.New()
	good := testExpoToken("good00")
	store := &fakePushTokens{tokens: []pushToken{
		{UserID: user, Token: good, Platform: "ios", Enabled: true},
		{UserID: user, Token: "junk-token", Platform: "android", Enabled: true},
	}}
	var batches [][]expoPushMessage
	server := expoGateway(t, http.StatusOK, `{"data":[{"status":"ok"}]}`, &batches)
	defer server.Close()

	NewPushService(PushConfig{Enabled: true, BaseURL: server.URL}, store).PushToUsers(context.Background(), "t", "b", []uuid.UUID{user})
	if len(batches) != 1 || len(batches[0]) != 1 || batches[0][0].To != good {
		t.Fatalf("expected only the well-formed token to be sent, got %+v", batches)
	}
}

func TestPushTokenValidation(t *testing.T) {
	valid := []string{
		"ExponentPushToken[abcdefghijklmnopqrstuv]",          // 22 chars
		"ExponentPushToken[aB3xY9zQ1mK8pL5vN2jR7wD4fG6hJ0k]", // mixed case + digits
	}
	invalid := []string{
		"",
		"ExponentPushToken[]",
		"ExponentPushToken[short]",
		"exponentpushtoken[abcdefghijklmnopqrstuv]",
		"ExpoPushToken[abcdefghijklmnopqrstuv]",
		"ExponentPushToken[has spaces inside ok]",
		"junk",
	}
	for _, token := range valid {
		if !validPushToken(token) {
			t.Errorf("expected %q to be a valid Expo token", token)
		}
	}
	for _, token := range invalid {
		if validPushToken(token) {
			t.Errorf("expected %q to be rejected", token)
		}
	}
}

func TestRegisterTokenValidatesTokenAndPlatform(t *testing.T) {
	service := NewPushService(PushConfig{Enabled: true}, &fakePushTokens{})
	ctx := context.Background()

	if _, err := service.RegisterToken(ctx, uuid.New(), "junk-token", "ios"); err != ErrInvalidPushToken {
		t.Fatalf("expected ErrInvalidPushToken, got %v", err)
	}
	if _, err := service.RegisterToken(ctx, uuid.New(), testExpoToken("ok000"), "windows"); err != ErrInvalidPushPlatform {
		t.Fatalf("expected ErrInvalidPushPlatform, got %v", err)
	}
	registered, err := service.RegisterToken(ctx, uuid.New(), testExpoToken("ok000"), "Android")
	if err != nil {
		t.Fatal(err)
	}
	if !registered.Enabled || registered.Platform != "android" {
		t.Fatalf("unexpected registration: %+v", registered)
	}
}

func TestMaskToken(t *testing.T) {
	token := "ExponentPushToken[aB3xY9zQ1mK8pL5vN2jR7wD]"
	masked := maskToken(token)
	if masked == token {
		t.Fatal("mask left the token intact")
	}
	if !strings.HasPrefix(masked, token[:8]) || !strings.HasSuffix(masked, token[len(token)-4:]) {
		t.Fatalf("mask lost the head/tail: %s", masked)
	}
	if strings.Contains(masked, token[8:len(token)-4]) {
		t.Fatalf("mask leaked the middle: %s", masked)
	}
	if masked = maskToken("short"); !strings.Contains(masked, "*") || strings.Contains(masked, "short") {
		t.Fatalf("short token must be fully hidden, got %s", masked)
	}
	if maskToken("") != "" {
		t.Fatal("empty token must mask to empty")
	}
}

type recordingPushSender struct {
	calls  chan struct{}
	titles []string
	users  [][]uuid.UUID
}

func (r *recordingPushSender) PushToUsers(_ context.Context, title, _ string, userIDs []uuid.UUID) {
	r.titles = append(r.titles, title)
	r.users = append(r.users, userIDs)
	r.calls <- struct{}{}
}

func TestSendDirectTriggersPush(t *testing.T) {
	sender := &recordingPushSender{calls: make(chan struct{}, 1)}
	store := &fakeStore{}
	service := NewNotificationService(store, WithPushSender(sender))
	users := []uuid.UUID{uuid.New(), uuid.New(), uuid.New()}

	if err := service.SendDirect(context.Background(), "Devamsızlık kaydedildi", "gövde", "attendance", "normal", uuid.New(), users); err != nil {
		t.Fatal(err)
	}
	select {
	case <-sender.calls:
	case <-time.After(2 * time.Second):
		t.Fatal("SendDirect never reached the push sender")
	}
	if len(sender.users) != 1 || len(sender.users[0]) != 3 {
		t.Fatalf("unexpected push recipients: %v", sender.users)
	}
	if len(sender.titles) != 1 || sender.titles[0] != "Devamsızlık kaydedildi" {
		t.Fatalf("unexpected push titles: %v", sender.titles)
	}
	if store.created != 1 || len(store.recipients) != 3 {
		t.Fatalf("in-app side missing: created=%d recipients=%d", store.created, len(store.recipients))
	}
}

func TestCreateSentTriggersPushAndDraftDoesNot(t *testing.T) {
	sender := &recordingPushSender{calls: make(chan struct{}, 1)}
	store := &fakeStore{}
	service := NewNotificationService(store, WithPushSender(sender))
	req := CreateNotificationRequest{
		Title: "Hello", Message: "Body", Category: "general", Priority: "normal",
		RecipientRules: []RecipientRule{{Type: RuleTeacher, TeacherID: pointer(uuid.New())}},
	}

	if _, err := service.Create(context.Background(), req, uuid.New(), "admin"); err != nil {
		t.Fatal(err)
	}
	select {
	case <-sender.calls:
	case <-time.After(2 * time.Second):
		t.Fatal("immediate send never reached the push sender")
	}

	draftReq := req
	draftReq.SaveAsDraft = true
	if _, err := service.Create(context.Background(), draftReq, uuid.New(), "admin"); err != nil {
		t.Fatal(err)
	}
	select {
	case <-sender.calls:
		t.Fatal("draft fanned out to push")
	case <-time.After(200 * time.Millisecond):
	}
}

func TestNilPushSenderIsSafe(t *testing.T) {
	service := NewNotificationService(&fakeStore{})
	users := []uuid.UUID{uuid.New(), uuid.New()}
	if err := service.SendDirect(context.Background(), "Title", "Message", "general", "normal", uuid.New(), users); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Create(context.Background(), CreateNotificationRequest{
		Title: "Title", Message: "Message", Category: "general", Priority: "normal",
		RecipientRules: []RecipientRule{{Type: RuleTeacher, TeacherID: pointer(uuid.New())}},
	}, uuid.New(), "admin"); err != nil {
		t.Fatal(err)
	}
}

// TeacherUserID backs the RuleTeacher resolution used by the Create tests
// above; the shared fakeStore in service_test.go predates that rule's use here.
func (f *fakeStore) TeacherUserID(context.Context, uuid.UUID) (uuid.UUID, error) {
	return uuid.New(), nil
}
