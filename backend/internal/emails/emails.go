package emails

import (
	"fmt"
	"time"
)

// greeting is formal and uses the name with initials (e.g. "Dear H.A.N. Perera,"), as school letters do.
func greeting(nameWithInitials string) string {
	if nameWithInitials == "" {
		return "Sayın veli ve öğrencimiz,"
	}
	return fmt.Sprintf("Sayın %s,", nameWithInitials)
}

func minutes(d time.Duration) string {
	return fmt.Sprintf("%d dakika", int(d.Minutes()))
}

func formatTime(t time.Time) string {
	return t.Format("2 January 2006, 15:04 (MST)")
}

func activationLinkEmail(school, name, link string, ttl time.Duration) email {
	return email{
		subject: "OpenSchool hesabınızı etkinleştirin",
		view: view{
			Preheader:  "Hesabınızın kurulumunu tamamlamak için bir şifre belirleyin.",
			Title:      "Hesabınızı etkinleştirin",
			Greeting:   greeting(name),
			Paragraphs: []string{fmt.Sprintf("Bilgileriniz %s kayıtlarıyla eşleşti. OpenSchool hesabınızın kurulumunu tamamlamak için bir şifre belirleyin.", school)},
			Button:     &button{Label: "Şifrenizi belirleyin", URL: link},
			Note:       fmt.Sprintf("Bu bağlantı %s içinde geçerliliğini yitirir ve yalnızca bir kez kullanılabilir.", minutes(ttl)),
			Safety:     "Bu e-postayı siz istemediyseniz yok sayabilirsiniz. Bu bağlantıyla bir şifre belirlenene kadar hiçbir hesap oluşturulmaz.",
		},
	}
}

func emailInUseEmail(school, signInURL string) email {
	return email{
		subject: "Bu e-posta adresiyle zaten bir OpenSchool hesabı var",
		view: view{
			Preheader: "Birisi bu e-posta adresiyle hesap etkinleştirmeye çalıştı.",
			Title:     "Bu e-posta adresiyle zaten bir hesap var",
			Paragraphs: []string{
				fmt.Sprintf("Birisi bu e-posta adresini kullanarak %s içinde hesap etkinleştirmeye çalıştı; ancak bu adres zaten bir OpenSchool hesabına ait.", school),
				"Bu işlemi siz yaptıysanız mevcut hesabınızla oturum açın. Şifrenizi unuttuysanız oturum açma sayfasındaki Şifremi unuttum seçeneğini kullanın. Farklı bir hesabı etkinleştirmek için başka bir e-posta adresiyle yeniden başlayın.",
			},
			Button: &button{Label: "Oturum açma sayfasına git", URL: signInURL},
			Safety: "Bu işlemi siz yapmadıysanız endişelenmeyin; hesabınızda hiçbir değişiklik yapılmadı ve herhangi bir işlem yapmanıza gerek yok.",
		},
	}
}

func accountActivatedEmail(school, name, username, signInURL string, at time.Time) email {
	return email{
		subject: "OpenSchool hesabınız hazır",
		view: view{
			Preheader:  "Hesabınız etkin. Oturum açmak için aşağıdaki adımları izleyin.",
			Title:      "Hesabınız hazır",
			Greeting:   greeting(name),
			Paragraphs: []string{fmt.Sprintf("%s içindeki OpenSchool hesabınız artık etkin. Şifrenizi kimseyle paylaşmayın.", school)},
			Details:    []detail{{"Oturum açma adı", username}, {"Etkinleştirildi", formatTime(at)}},
			Button:     &button{Label: "Oturum aç", URL: signInURL},
			Safety:     fmt.Sprintf("Bu hesabı siz etkinleştirmediyseniz, hesabın kilitlenebilmesi için bir an önce %s ile iletişime geçin.", school),
		},
	}
}

func passwordResetEmail(school, link string, ttl time.Duration) email {
	return email{
		subject: "OpenSchool şifrenizi sıfırlayın",
		view: view{
			Preheader:  "Yeni bir şifre belirlemek için bu bağlantıyı kullanın.",
			Title:      "Şifrenizi belirleyin",
			Paragraphs: []string{fmt.Sprintf("%s içindeki OpenSchool hesabınız için bir şifre sıfırlama talebi aldık.", school)},
			Button:     &button{Label: "Şifrenizi belirleyin", URL: link},
			Note:       fmt.Sprintf("Bu bağlantı %s içinde geçerliliğini yitirir ve yalnızca bir kez kullanılabilir.", minutes(ttl)),
			Safety:     "Bu talebi siz yapmadıysanız bu e-postayı yok sayın. Şifreniz değişmeden kalır.",
		},
	}
}

func passwordChangedEmail(school, signInURL string, at time.Time) email {
	return email{
		subject: "OpenSchool şifreniz değiştirildi",
		view: view{
			Preheader:  "Bu, hesabınızla ilgili bir güvenlik bildirimidir.",
			Title:      "Şifreniz değiştirildi",
			Paragraphs: []string{fmt.Sprintf("%s içindeki OpenSchool hesabınızın şifresi az önce değiştirildi.", school)},
			Details:    []detail{{"Değiştirildi", formatTime(at)}},
			Button:     &button{Label: "Oturum aç", URL: signInURL},
			Safety:     fmt.Sprintf("Bu değişikliği siz yapmadıysanız hemen oturum açma sayfasındaki Şifremi unuttum seçeneğiyle şifrenizi sıfırlayın ve %s bilgilendirin.", school),
		},
	}
}

func testEmail(provider, sender string, at time.Time) email {
	return email{
		subject: "OpenSchool e-posta gönderimi çalışıyor",
		view: view{
			Preheader:  "E-posta ayarlarınız ileti gönderebiliyor.",
			Title:      "E-posta gönderimi çalışıyor",
			Paragraphs: []string{"Bu test iletisi, OpenSchool'un geçerli ayarlarla e-posta gönderebildiğini gösterir."},
			Details:    []detail{{"Sağlayıcı", provider}, {"Gönderen", sender}, {"Gönderildi", formatTime(at)}},
		},
	}
}
