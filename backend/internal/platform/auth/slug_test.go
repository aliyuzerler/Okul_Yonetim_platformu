package auth

import (
        "strings"
        "testing"
)

func TestSlugifyTurkish(t *testing.T) {
        cases := map[string]string{
                "Atatürk Anadolu Lisesi":         "ataturk-anadolu-lisesi",
                "Şehit Öğretmen İlkokulu":        "sehit-ogretmen-ilkokulu",
                "Özel Umut Koleji":               "ozel-umut-koleji",
                "İSTEK Bilge Okulları":           "istek-bilge-okullari",
                "Çanakkale 18 Mart Lisesi":       "canakkale-18-mart-lisesi",
                "Özel  ---  Umut  Koleji  ":      "ozel-umut-koleji",
                "  ":                             "",
        }
        // Note: slugify returns "" for blank names; the "okul" fallback
        // lives in Service.uniqueSlug, the only caller needing a value.
        for name, want := range cases {
                if got := slugify(name); got != want {
                        t.Errorf("slugify(%q) = %q, want %q", name, got, want)
                }
        }
}

func TestSlugifyLength(t *testing.T) {
        long := "Çok Uzun Bir Okul Adı " + strings.Repeat("ve daha devam eder ", 20)
        got := slugify(long)
        if len(got) > 64 {
                t.Fatalf("slug too long: %d", len(got))
        }
        if strings.HasSuffix(got, "-") {
                t.Fatalf("slug must not end with dash: %q", got)
        }
}
