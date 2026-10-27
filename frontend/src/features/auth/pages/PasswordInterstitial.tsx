import { useState } from "react";
import { Button } from "@carbon/react";
import { Security } from "@carbon/icons-react";
import { useThunderID } from "@thunderid/react";
import { useChangePassword, useKeepDefaultPassword } from "@/features/auth/queries/useAuth";
import { useProvisionUser } from "@/shared/auth/useProvisionUser";
import { validateNewPassword } from "@/shared/auth/password";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import PasswordFields from "@/shared/ui/PasswordFields";

// First sign-in with a system-assigned password: keep it or set a new one.
// Once a prior "keep it" choice has expired (S1), "keep it" is no longer
// offered - the account must actually set a new password.
export default function PasswordInterstitial() {
  const { signOut } = useThunderID();
  const { data: me } = useProvisionUser();
  const keepDefault = useKeepDefaultPassword();
  const changePassword = useChangePassword();
  const [settingNew, setSettingNew] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { valid } = validateNewPassword(password, confirm);
  const keepAllowed = !me?.default_password_expired;

  return (
    <div className="os-setup-wrapper os-otp-wrapper">
      <div className="os-otp-shell">
        <header className="os-setup-header" aria-label="OpenSchool">
          <img src="/favicon.webp" alt="" width={44} height={44} className="os-setup-header__logo" />
          <p className="os-setup-header__title">Open<span className="os-signin-card__title-accent">School</span></p>
        </header>

        <main className="os-setup-card os-otp-content" aria-labelledby="otp-title">
          <div className="os-otp-heading">
            <span className="os-otp-heading__icon" aria-hidden="true"><Security size={24} /></span>
            <div>
              <p className="os-otp-eyebrow">Hesap güvenliği</p>
              <h1 id="otp-title">Tek kullanımlık şifre</h1>
            </div>
          </div>
          <p className="os-otp-subtitle">
            {keepAllowed
              ? "Sistem tarafından atanan bir şifreyle oturum açtınız. Bu şifreyi koruyabilir veya hemen yeni bir şifre belirleyebilirsiniz."
              : "Sistem tarafından atanan şifrenizi çok uzun süredir koruyorsunuz. Devam etmek için yeni bir şifre belirleyin."}
          </p>

          {!settingNew && keepAllowed ? (
            <>
              <MutationErrorNotification isError={keepDefault.isError} error={keepDefault.error} title="Bir sorun oluştu" fallback="Lütfen yeniden deneyin." />
              <div className="os-otp-options">
                <div className="os-otp-option">
                  <Button kind="secondary" className="os-full-width-btn" onClick={() => keepDefault.mutate()} disabled={keepDefault.isPending}>
                    {keepDefault.isPending ? "Kaydediliyor…" : "Şifreyi koru"}
                  </Button>
                </div>
                <div className="os-otp-option os-otp-option--primary">
                  <Button className="os-full-width-btn" onClick={() => setSettingNew(true)}>Şifreyi değiştir</Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <MutationErrorNotification isError={changePassword.isError} error={changePassword.error} title="Şifre güncellenemedi" fallback="Lütfen yeniden deneyin." />
              <div className="os-otp-form">
                <PasswordFields
                  idPrefix="interstitial-password"
                  password={password}
                  confirm={confirm}
                  onPasswordChange={setPassword}
                  onConfirmChange={setConfirm}
                />
                <div className="os-otp-form__actions">
                  <Button onClick={() => valid && changePassword.mutate(password)} disabled={!valid || changePassword.isPending}>
                    {changePassword.isPending ? "Kaydediliyor…" : "Yeni şifreyi kaydet"}
                  </Button>
                  {keepAllowed && <Button kind="ghost" onClick={() => setSettingNew(false)}>Geri</Button>}
                </div>
              </div>
            </>
          )}

          <footer className="os-otp-footer">
            <span>Hesabınız sizin değil mi?</span>
            <Button kind="ghost" size="sm" onClick={() => signOut()}>Oturumu kapat</Button>
          </footer>
        </main>
      </div>
    </div>
  );
}
