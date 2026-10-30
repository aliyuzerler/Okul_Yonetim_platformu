package iyzico

import (
	"os"
	"strings"
)

// PricingPlanRefsFromEnv reads the monthly pricing-plan mapping from the
// environment. Monthly auto-renewal runs on iyzico's Subscription API, which
// is configured from the iyzico merchant panel (product → pricing plan) and
// referenced here:
//
//	IYZICO_PP_BASLANGIC_MONTHLY=3b9a...
//	IYZICO_PP_STANDART_MONTHLY=7d12...
//	IYZICO_PP_KURUMSAL_MONTHLY=ef04...
//
// Annual plans are one-shot checkout payments and need no reference.
func PricingPlanRefsFromEnv() map[string]string {
	refs := map[string]string{}
	for _, entry := range os.Environ() {
		key, value, ok := strings.Cut(entry, "=")
		if !ok || !strings.HasPrefix(key, "IYZICO_PP_") {
			continue
		}
		if !strings.HasSuffix(key, "_MONTHLY") {
			continue
		}
		planCode := strings.ToLower(strings.TrimSuffix(strings.TrimPrefix(key, "IYZICO_PP_"), "_MONTHLY"))
		if planCode != "" && strings.TrimSpace(value) != "" {
			refs[planCode] = strings.TrimSpace(value)
		}
	}
	return refs
}
