import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button, InlineNotification, PasswordInput } from "@carbon/react";
import { api, getErrorMessage } from "@/shared/api/client";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== password2) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    if (password.length < 10) {
      setError("Şifre en az 10 karakter olmalıdır.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      navigate("/giris", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Şifre güncellenemedi."));
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
            <h1>Yeni şifre belirleyin</h1>
            <p className="pl-sub">Şifreniz en az 10 karakter olmalıdır.</p>

            {!token && (
              <InlineNotification kind="error" title="Bağlantı eksik" subtitle="Bu sayfaya e-postadaki bağlantıdan ulaşmalısınız." lowContrast hideCloseButton />
            )}
            {error && <InlineNotification kind="error" title="İşlem tamamlanamadı" subtitle={error} lowContrast hideCloseButton style={{ marginBottom: "1rem" }} />}

            <form className="pl-form" onSubmit={submit}>
              <PasswordInput id="password" labelText="Yeni şifre" required value={password} onChange={(e) => setPassword(e.target.value)} />
              <PasswordInput id="password2" labelText="Yeni şifre (tekrar)" required value={password2} onChange={(e) => setPassword2(e.target.value)} />
              <Button type="submit" disabled={busy || !token}>
                {busy ? "Kaydediliyor…" : "Şifreyi güncelle"}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
