import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button, InlineNotification, PasswordInput, TextInput } from "@carbon/react";
import { useAuth } from "@/shared/auth/AuthContext";
import { getErrorMessage } from "@/shared/api/client";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const me = await login(email.trim(), password);
      navigate(me.role === "super_admin" ? "/yonetim" : "/panel/abonelik", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Giriş yapılamadı."));
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
        <Link className="pl-link" to="/kayit">
          Okulunu kaydet
        </Link>
      </header>
      <main className="pl-main">
        <div className="pl-auth-wrapper">
          <div className="pl-card">
            <h1>Platforma giriş</h1>
            <p className="pl-sub">Okul yöneticisi veya platform yöneticisi hesabınızla giriş yapın.</p>

            {error && <InlineNotification kind="error" title="Giriş başarısız" subtitle={error} lowContrast hideCloseButton style={{ marginBottom: "1rem" }} />}

            <form className="pl-form" onSubmit={submit}>
              <TextInput id="email" labelText="E-posta" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              <PasswordInput id="password" labelText="Şifre" required value={password} onChange={(e) => setPassword(e.target.value)} />
              <div className="pl-form-actions">
                <Link className="pl-link" to="/sifremi-unuttum">
                  Şifremi unuttum
                </Link>
                <Button type="submit" disabled={busy}>
                  {busy ? "Giriş yapılıyor…" : "Giriş yap"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
