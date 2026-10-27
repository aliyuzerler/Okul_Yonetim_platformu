import { CheckmarkFilled, Information } from "@carbon/icons-react";
import { validateNewPassword } from "@/shared/auth/password";

interface Props {
  password: string;
  confirm: string;
}

export default function PasswordRequirements({ password, confirm }: Props) {
  const { criteria } = validateNewPassword(password, confirm);
  if (!password && !confirm) return null;

  const checks = [
    [criteria.minLength, "En az 10 karakter"],
    [criteria.uppercase, "Bir büyük harf"],
    [criteria.lowercase, "Bir küçük harf"],
    [criteria.number, "Bir rakam"],
    [criteria.special, "Bir özel karakter"],
    [criteria.notCommon, "123456 gibi basit desenler içermesin"],
    [criteria.minLength && confirm.length > 0 && confirm === password, "Şifreler eşleşiyor"],
  ] as const;

  return (
    <div className="os-password-guidance" aria-live="polite">
      <div className="os-password-guidance__title"><Information size={16} /> Şifre gereksinimleri</div>
      <div className="os-password-guidance__checks">
        {checks.map(([valid, label]) => (
          <span key={label} className={valid ? "is-valid" : "is-invalid"}>
            <CheckmarkFilled size={16} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}
