import { useState } from "react";
import { Link } from "react-router";
import { Button, InlineNotification, TextInput } from "@carbon/react";
import { CheckmarkFilled } from "@carbon/icons-react";
import { api, getErrorMessage } from "@/shared/api/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
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
          <div className="pl-card">
            {sent ? (
              <div style={{ textAlign: "center" }}>
                <CheckmarkFilled size={36} style={{ color: "var(--pl-success)" }} />
                <h1>E-postanızı kontrol edin</h1>
                <p className="pl-sub">
                  Bilgiler bir hesapla eşleşirse şifre sıfırlama bağlantısı gönderildi. Bağlantı 30 dakika geçerlidir.
                </p>
                <Link className="pl-link" to="/giris">
                  Giriş ekranına dön
                </Link>
              </div>
            ) : (
              <>
                <h1>Şifremi unuttum</h1>
                <p className="pl-sub">Hesap e-postanızı girin; tek kullanımlık bir sıfırlama bağlantısı gönderelim.</p>
                {error && <InlineNotification kind="error" title="İstek gönderilemedi" subtitle={error} lowContrast hideCloseButton style={{ marginBottom: "1rem" }} />}
                <form className="pl-form" onSubmit={submit}>
                  <TextInput id="email" labelText="E-posta" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Button type="submit" disabled={busy}>
                    {busy ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
                  </Button>
                  <Link className="pl-link" to="/giris">
                    Giriş ekranına dön
                  </Link>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
