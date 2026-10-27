import { useState } from "react";
import { Link } from "react-router";
import { Button, TextInput, Select, SelectItem, InlineNotification } from "@carbon/react";
import { CheckmarkFilled } from "@carbon/icons-react";
import { useForgotPassword } from "@/features/auth/queries/useAuth";
import type { SelfServiceResetRole } from "@/features/auth/api/auth";
import { getErrorMessage } from "@/shared/api/errors";

const ROLES: { value: SelfServiceResetRole; label: string; secretLabel: string; secretHelp: string }[] = [
  { value: "teacher", label: "Öğretmen", secretLabel: "T.C. Kimlik No", secretHelp: "Hesabınız oluşturulurken kaydedilen T.C. Kimlik Numaranız." },
  { value: "student", label: "Öğrenci", secretLabel: "Okul numarası", secretHelp: "Okul numaranız." },
  { value: "parent", label: "Veli", secretLabel: "T.C. Kimlik No", secretHelp: "Hesabınız oluşturulurken kaydedilen T.C. Kimlik Numaranız." },
];

export default function ForgotPassword() {
  const forgotPassword = useForgotPassword();

  const [role, setRole] = useState<SelfServiceResetRole>("teacher");
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");

  const roleInfo = ROLES.find((r) => r.value === role)!;
  const canVerify = identifier.trim().length > 0 && secret.trim().length > 0;

  const handleVerify = () => {
    if (!canVerify) return;
    forgotPassword.mutate({ role, identifier: identifier.trim(), secret: secret.trim() });
  };

  if (forgotPassword.isSuccess) {
    return (
      <div className="os-signin-wrapper">
        <div className="os-auth-card os-auth-card--center">
          <div className="os-auth-card__success-icon">
            <CheckmarkFilled size={28} />
          </div>
          <h1 className="os-auth-card__title">E-postanızı kontrol edin</h1>
          <p className="os-auth-card__subtitle">
            Bilgiler bir hesapla eşleşirse, şifre sıfırlama bağlantısı kayıtlı e-posta adresine gönderildi.
            Bağlantı 15 dakika sonra geçersiz olur.
          </p>
          <Button href="/signin" className="os-full-width-btn">
            Oturum açmaya dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="os-signin-wrapper">
      <div className="os-auth-card">
        <div className="os-auth-card__brand">
          <img
            src="/favicon.webp"
            alt="OpenSchool"
            width={36}
            height={36}
            className="os-auth-card__logo"
          />
          <span className="os-auth-card__brand-name">OpenSchool</span>
        </div>
        <h1 className="os-auth-card__title">Şifremi unuttum</h1>
        <p className="os-auth-card__subtitle">
          Şifre sıfırlama bağlantısını e-postayla almak için kimliğinizi doğrulayın. Yönetici hesapları
          bunun yerine başka bir yöneticiyle iletişime geçmelidir.
        </p>

        {forgotPassword.isError && (
          <InlineNotification
            kind="error"
            title="Kimlik doğrulanamadı"
            subtitle={getErrorMessage(forgotPassword.error, "Lütfen bilgilerinizi kontrol edip yeniden deneyin.")}
            lowContrast
            hideCloseButton className="os-mb-5 os-max-w-full"
          />
        )}

        <div className="os-auth-card__form">
          <Select
            id="forgot-password-role"
            labelText="Rolünüz"
            value={role}
            onChange={(e) => setRole(e.target.value as SelfServiceResetRole)}
          >
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value} text={r.label} />
            ))}
          </Select>
          <TextInput
            id="forgot-password-identifier"
            labelText="E-posta adresi"
            placeholder="örn. kullanici@okul.edu.tr"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <TextInput
            id="forgot-password-secret"
            labelText={roleInfo.secretLabel}
            helperText={roleInfo.secretHelp}
            placeholder={`${roleInfo.secretLabel} girin`}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />
        </div>

        <div className="os-auth-card__actions">
          <Button
            className="os-full-width-btn"
            onClick={handleVerify}
            disabled={!canVerify || forgotPassword.isPending}
          >
            {forgotPassword.isPending ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
          </Button>
        </div>

        <div className="os-auth-card__footer">
          <Link to="/signin">Oturum açmaya dön</Link>
        </div>
      </div>
    </div>
  );
}
