import { useState } from "react";
import { Link } from "react-router";
import { Button, InlineNotification } from "@carbon/react";
import { CheckmarkFilled } from "@carbon/icons-react";
import { useResetPassword } from "@/features/auth/queries/useAuth";
import { validateNewPassword } from "@/shared/auth/password";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import PasswordFields from "@/shared/ui/PasswordFields";
import { tokenFromHash } from "@/shared/lib/urlHash";


export default function ResetPassword() {
  const [token] = useState(tokenFromHash);
  const resetPassword = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const canReset = token.length > 0 && validateNewPassword(password, confirm).valid;

  const handleReset = () => {
    if (canReset) resetPassword.mutate({ token, new_password: password }, { onSuccess: () => setDone(true) });
  };

  if (done) {
    return (
      <div className="os-signin-wrapper">
        <div className="os-auth-card os-auth-card--center">
          <div className="os-auth-card__success-icon">
            <CheckmarkFilled size={28} />
          </div>
          <h1 className="os-auth-card__title">Şifre güncellendi</h1>
          <p className="os-auth-card__subtitle">Artık yeni şifrenizle oturum açabilirsiniz.</p>
          <Button href="/signin" className="os-full-width-btn">Oturum açmaya git</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="os-signin-wrapper">
      <div className="os-auth-card">
        <div className="os-auth-card__brand">
          <img src="/favicon.webp" alt="OpenSchool" width={36} height={36} className="os-auth-card__logo" />
          <span className="os-auth-card__brand-name">OpenSchool</span>
        </div>
        <h1 className="os-auth-card__title">Şifre sıfırlama</h1>
        <p className="os-auth-card__subtitle">Hesabınız için yeni bir şifre seçin.</p>

        {!token && (
          <InlineNotification
            kind="error"
            title="Geçersiz sıfırlama bağlantısı"
            subtitle="Bu bağlantıda sıfırlama anahtarı eksik. Aşağıdan yeni bir bağlantı talep edin."
            lowContrast
            hideCloseButton
            className="os-full-width os-mb-4"
          />
        )}
        <MutationErrorNotification
          isError={resetPassword.isError}
          error={resetPassword.error}
          title="Şifre sıfırlanamadı"
          fallback="Sıfırlama bağlantısı geçersiz, kullanılmış veya süresi dolmuş."
        />
        <div className="os-auth-card__form">
          <PasswordFields
            idPrefix="reset-password"
            password={password}
            confirm={confirm}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirm}
          />
        </div>
        <div className="os-auth-card__actions">
          <Button className="os-full-width-btn" onClick={handleReset} disabled={!canReset || resetPassword.isPending}>
            {resetPassword.isPending ? "Kaydediliyor…" : "Yeni şifreyi belirle"}
          </Button>
        </div>
        <div className="os-auth-card__footer">
          <Link to="/forgot-password">Yeni bağlantı talep et</Link> · <Link to="/signin">Oturum açmaya dön</Link>
        </div>
      </div>
    </div>
  );
}
