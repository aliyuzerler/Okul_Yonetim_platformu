package auth

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// marshalData encodes event payloads; the JSONB column takes a string.
func marshalData(data map[string]any) []byte {
	b, err := json.Marshal(data)
	if err != nil {
		return []byte("{}")
	}
	return b
}

// toHTML renders a minimal, plain-structured HTML alternative. The platform
// keeps its own small templates: it must be able to send mail before any
// school instance — with its template pack — exists.
func toHTML(subject, text string) string {
	var b strings.Builder
	b.WriteString(`<!DOCTYPE html><html lang="tr"><body style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">`)
	b.WriteString(`<h2 style="color:#0f62fe;">OpenSchool Platform</h2>`)
	b.WriteString(`<h3>`)
	b.WriteString(htmlEscape(subject))
	b.WriteString(`</h3><div style="line-height:1.6;font-size:14px;">`)
	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		switch {
		case line == "":
			b.WriteString("<p style=\"margin:6px 0;\"></p>")
		case strings.HasPrefix(line, "https://"):
			b.WriteString(`<p><a href="` + htmlEscape(line) + `" style="background:#0f62fe;color:#ffffff;padding:10px 18px;border-radius:4px;text-decoration:none;display:inline-block;">Bağlantıyı aç</a></p>`)
			b.WriteString(`<p style="font-size:12px;color:#555;word-break:break-all;">` + htmlEscape(line) + `</p>`)
		default:
			b.WriteString(`<p style="margin:6px 0;">` + htmlEscape(line) + `</p>`)
		}
	}
	b.WriteString(`</div><p style="font-size:12px;color:#777;margin-top:24px;">Bu e-postayı istemediyseniz bu mesajı yok sayabilirsiniz; hiçbir işlem yapılmaz.</p>`)
	b.WriteString(`</body></html>`)
	return b.String()
}

func htmlEscape(s string) string {
	r := strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;", `"`, "&#34;", "'", "&#39;")
	return r.Replace(s)
}

// verificationEmail is sent right after signup; the link starts the trial.
func verificationEmail(fullName, link string) (string, string) {
	subject := "OpenSchool — E-posta doğrulama"
	body := fmt.Sprintf(`Merhaba %s,

OpenSchool Platform'a kaydınızı tamamlamak için e-posta adresinizi doğrulamanız gerekiyor.

Aşağıdaki bağlantı 24 saat geçerlidir. Doğrulama ile birlikte %d günlük ücretsiz deneme süreniz başlar.

Bağlantı:
%s

Bu kayıt size ait değilse bu mesajı yok sayabilirsiniz.
`, displayName(fullName), 14, link)
	return subject, body
}

// resetEmail delivers the single-use password reset link.
func resetEmail(fullName, link string) (string, string) {
	subject := "OpenSchool — Şifre sıfırlama"
	body := fmt.Sprintf(`Merhaba %s,

Hesabınız için bir şifre sıfırlama talebi aldık. Aşağıdaki bağlantı 30 dakika geçerlidir ve yalnızca bir kez kullanılabilir.

Bağlantı:
%s

Bu talebi siz yapmadıysanız şifrenizi değiştirmeden önce bize ulaşın.
`, displayName(fullName), link)
	return subject, body
}

// welcomeEmail confirms the trial started.
func welcomeEmail(fullName, schoolName, planName string, trialEnds time.Time) (string, string) {
	subject := "OpenSchool — 14 günlük deneme süreniz başladı"
	body := fmt.Sprintf(`Merhaba %s,

%s için e-posta adresiniz doğrulandı ve %s paketiyle 14 günlük ücretsiz denemeniz başladı.

Deneme bitiş tarihi: %s

Deneme süresince tüm modülleri sınırsız kullanabilirsiniz. Süre bitmeden aboneliğinizi
platform panelinden ay (otomatik yenileme) veya yıl (tek çekim) seçenekleriyle
devam ettirebilirsiniz.

İyi çalışmalar!
OpenSchool Ekibi
`, displayName(fullName), schoolName, planName, trialEnds.Format("02.01.2006"))
	return subject, body
}

func displayName(fullName string) string {
	if strings.TrimSpace(fullName) == "" {
		return "kullanıcı"
	}
	return fullName
}
