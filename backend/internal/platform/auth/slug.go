package auth

import "strings"

// trTranslit maps Turkish letters to their ASCII slug equivalents.
var trTranslit = strings.NewReplacer(
	"ç", "c", "Ç", "c",
	"ğ", "g", "Ğ", "g",
	"ı", "i", "I", "i", "İ", "i",
	"ö", "o", "Ö", "o",
	"ş", "s", "Ş", "s",
	"ü", "u", "Ü", "u",
	"â", "a", "î", "i", "û", "u",
)

// slugify turns a school name into a URL-safe slug: "Atatürk Anadolu Lisesi"
// becomes "atatürk" -> "atataturk"... e.g. "Atatürk Anadolu Lisesi" →
// "atataturk-anadolu-lisesi".
func slugify(name string) string {
	s := trTranslit.Replace(strings.ToLower(strings.TrimSpace(name)))

	var b strings.Builder
	lastDash := true // suppress leading dashes
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9':
			b.WriteRune(r)
			lastDash = false
		default:
			if !lastDash {
				b.WriteByte('-')
				lastDash = true
			}
		}
	}
	out := strings.Trim(b.String(), "-")
	if len(out) > 64 {
		out = strings.Trim(out[:64], "-")
	}
	return out
}
