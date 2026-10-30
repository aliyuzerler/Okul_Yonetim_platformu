package billing

import (
	"testing"
	"time"

	"github.com/openschool-org/openschool/internal/platform/models"
)

func TestAccessStateFor(t *testing.T) {
	now := time.Now()

	cases := []struct {
		name string
		sub  *models.Subscription
		want string
	}{
		{"no subscription", nil, models.AccessLocked},
		{"active", &models.Subscription{Status: models.SubActive}, models.AccessOK},
		{"trial running", &models.Subscription{
			Status: models.SubTrialing, TrialEndsAt: ptrTime(now.Add(5 * 24 * time.Hour)),
		}, models.AccessOK},
		{"trial ended", &models.Subscription{
			Status: models.SubTrialing, TrialEndsAt: ptrTime(now.Add(-24 * time.Hour)),
		}, models.AccessReadOnly},
		{"past due", &models.Subscription{Status: models.SubPastDue}, models.AccessReadOnly},
		{"expired", &models.Subscription{Status: models.SubExpired}, models.AccessLocked},
		{"cancelled", &models.Subscription{Status: models.SubCancelled}, models.AccessLocked},
	}

	for _, tc := range cases {
		if got := AccessStateFor(tc.sub, now); got != tc.want {
			t.Errorf("%s: AccessStateFor = %q, want %q", tc.name, got, tc.want)
		}
	}
}

func TestDaysRemaining(t *testing.T) {
	now := time.Now()
	if got := daysRemaining(ptrTime(now.Add(10*24*time.Hour)), now); got == nil || *got != 10 {
		t.Fatalf("daysRemaining = %v, want 10", got)
	}
	if got := daysRemaining(ptrTime(now.Add(-24 * time.Hour)), now); got == nil || *got != 0 {
		t.Fatalf("past trial should clamp to 0, got %v", got)
	}
	if got := daysRemaining(nil, now); got != nil {
		t.Fatalf("nil end should give nil, got %v", got)
	}
}

func TestAmountFor(t *testing.T) {
	plan := models.Plan{PriceMonthlyKurus: 299000, PriceAnnualKurus: 2990000}
	if amountFor(plan, models.CycleMonthly) != 299000 {
		t.Fatal("monthly amount wrong")
	}
	if amountFor(plan, models.CycleAnnual) != 2990000 {
		t.Fatal("annual amount wrong")
	}
}

func TestCheckoutAllowed(t *testing.T) {
	for _, s := range []string{models.TenantTrial, models.TenantExpired, models.TenantPastDue, models.TenantCancelled} {
		if !checkoutAllowed(s) {
			t.Errorf("status %q should allow checkout", s)
		}
	}
	for _, s := range []string{models.TenantActive, models.TenantPendingVerification} {
		if checkoutAllowed(s) {
			t.Errorf("status %q should not allow checkout", s)
		}
	}
}

func ptrTime(t time.Time) *time.Time { return &t }
