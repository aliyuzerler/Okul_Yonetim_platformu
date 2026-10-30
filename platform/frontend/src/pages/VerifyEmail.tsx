import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button, InlineNotification, TextInput } from "@carbon/react";
import { CheckmarkFilled, MailAll } from "@carbon/icons-react";
import { api, getErrorMessage } from "@/shared/api/client";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const pending = params.get("bekleniyor") === "1";
  const email = params.get("email") ?? "";

  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(token ? "loading" : "idle");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState(email);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post<{ message: string }>("/auth/verify-email", { token });
        if (!cancelled) {
          setState("done");
          setMessage(res.data.message);
        }
      } catch (err) {
        if (!cancelled) {
          setState("error");
          setMessage(getErrorMessage(err, "Doğrulama bağlantısı geçersiz veya süresi dolmuş."));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const resend = async () => {
    setResent(false);
    try {
      await api.post("/auth/resend-verification", { email: resendEmail });
      setResent(true);
    } catch (err) {
      setMessage(getErrorMessage(err));
      setState("error");
    }
  };

  return (
    <div className="pl-shell">
      <header className="pl-header">
        <Link to="/" className="pl-brand">
          OpenSchool Platform
        </Link>
      </header>
      <main className="pl-main">
        <div className="pl-auth-wrapper">
          <div className="pl-card" style={{ textAlign: "center" }}>
            {state === "done" && (
              <>
                <CheckmarkFilled size={40} style={{ color: "var(--pl-success)" }} />
                <h1>E-postanız doğrulandı</h1>
                <p className="pl-sub">{message}</p>
                <Button as="a" href="/giris">
                  Giriş yap
                </Button>
              </>
            )}

            {state === "loading" && <p>E-posta doğrulanıyor…</p>}

            {state === "error" && (
              <>
                <InlineNotification kind="error" title="Doğrulanamadı" subtitle={message} lowContrast hideCloseButton />
                <h1>Yeni doğrulama bağlantısı</h1>
                <p className="pl-sub">Kayıtlı e-posta adresinizi girin; bağlantıyı yeniden gönderelim.</p>
                <form
                  className="pl-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await resend();
                  }}
                >
                  <TextInput id="resend_email" labelText="E-posta" type="email" required value={resendEmail} onChange={(e) => setResendEmail(e.target.value)} />
                  <Button type="submit">Bağlantıyı yeniden gönder</Button>
                </form>
              </>
            )}

            {state === "idle" && pending && (
              <>
                <MailAll size={40} style={{ color: "var(--pl-primary)" }} />
                <h1>E-postanızı kontrol edin</h1>
                <p className="pl-sub">
                  {email ? <>Doğrulama bağlantısını <strong>{email}</strong> adresine gönderdik.</> : "Doğrulama bağlantısını e-posta adresinize gönderdik."}{" "}
                  Bağlantı 24 saat geçerlidir; doğrulama ile birlikte 14 günlük denemeniz başlar.
                </p>
                {resent && <InlineNotification kind="success" title="Yeni bağlantı gönderildi" lowContrast hideCloseButton />}
                <div className="pl-form" style={{ marginTop: "1rem" }}>
                  <TextInput id="resend_email2" labelText="E-posta gelmedi mi? Adresinizi girin" type="email" value={resendEmail} onChange={(e) => setResendEmail(e.target.value)} />
                  <Button kind="secondary" onClick={resend}>
                    Bağlantıyı yeniden gönder
                  </Button>
                  <Link className="pl-link" to="/giris">
                    Doğruladınız mı? Giriş yapın
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
