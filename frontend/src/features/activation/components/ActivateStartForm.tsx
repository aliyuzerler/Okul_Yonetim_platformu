import { useState } from "react";
import { Link } from "react-router";
import { Button, Select, SelectItem, TextInput } from "@carbon/react";
import { useActivationStatus, useStartActivation } from "@/features/activation/queries/useActivation";
import type { ActivationRole } from "@/features/activation/api/activation";
import AuthShell from "@/features/activation/components/AuthShell";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { EMAIL_RE } from "@/shared/lib/validation";

const ROLES: { value: ActivationRole; label: string; idLabel: string; idHelp: string }[] = [
  { value: "student", label: "Öğrenci", idLabel: "Okul numarası", idHelp: "Okul numaranız." },
  { value: "parent", label: "Veli", idLabel: "T.C. Kimlik No", idHelp: "Okulda kayıtlı T.C. Kimlik Numaranız." },
];

export default function ActivateStartForm() {
  const { data: status, isLoading } = useActivationStatus();
  const start = useStartActivation();
  const [chosenRole, setChosenRole] = useState<ActivationRole | null>(null);
  const [code, setCode] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");

  const openRoles = ROLES.filter((r) => status?.[r.value]);
  const role = openRoles.find((r) => r.value === chosenRole) ?? openRoles[0];
  const emailInvalid = email.trim() !== "" && !EMAIL_RE.test(email.trim());
  const canSubmit = !!role && code.trim() !== "" && identifier.trim() !== "" && email.trim() !== "" && !emailInvalid;

  const submit = () => {
    if (!canSubmit || !role) return;
    start.mutate({ role: role.value, code: code.trim(), identifier: identifier.trim(), email: email.trim() });
  };

  if (isLoading) return <LoadingSpinner />;

  if (start.isSuccess) {
    return (
      <AuthShell success title="E-postanızı kontrol edin" subtitle="Kod ve bilgiler eşleşirse hesabınızın etkinleştirmesini tamamlamak için bir bağlantı gönderildi. Bağlantı 30 dakika sonra geçersiz olur. Birkaç dakika içinde e-posta gelmediyse kodu ve okul numaranızı ya da T.C. Kimlik Numaranızı kontrol edip yeniden deneyin.">
        <Button href="/signin" className="os-full-width-btn">Oturum açmaya dön</Button>
      </AuthShell>
    );
  }

  if (!role) {
    return (
      <AuthShell title="Hesabınızı etkinleştirin" subtitle="Hesap etkinleştirme şu anda açık değil. Lütfen okul idaresiyle iletişime geçin.">
        <div className="os-auth-card__footer"><Link to="/signin">Oturum açmaya dön</Link></div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Hesabınızı etkinleştirin" subtitle="Giriş bilgilerinizi oluşturmak için okulunuzun verdiği etkinleştirme kodunu kullanın.">
      <MutationErrorNotification isError={start.isError} error={start.error} title="Etkinleştirme başlatılamadı" />
      <div className="os-auth-card__form">
        {openRoles.length > 1 && (
          <Select id="activate-role" labelText="Rolünüz" value={role.value} onChange={(e) => setChosenRole(e.target.value as ActivationRole)}>
            {openRoles.map((r) => <SelectItem key={r.value} value={r.value} text={r.label} />)}
          </Select>
        )}
        <TextInput id="activate-code" labelText="Etkinleştirme kodu" placeholder="XXXXX-XXXXX" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} />
        <TextInput id="activate-identifier" labelText={role.idLabel} helperText={role.idHelp} autoComplete="off" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
        <TextInput
          id="activate-email"
          type="email"
          labelText="E-posta adresiniz"
          helperText="Bağlantıyı buraya göndereceğiz. Şifre sıfırlamada da bu adresi kullanacaksınız."
          autoComplete="email"
          value={email}
          invalid={emailInvalid}
          invalidText="Geçerli bir e-posta adresi girin."
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="os-auth-card__actions">
        <Button className="os-full-width-btn" onClick={submit} disabled={!canSubmit || start.isPending}>
          {start.isPending ? "Kontrol ediliyor…" : "Etkinleştirme bağlantısı gönder"}
        </Button>
      </div>
      <div className="os-auth-card__footer"><Link to="/signin">Zaten etkinleştirdiniz mi? Oturum açın</Link></div>
    </AuthShell>
  );
}
