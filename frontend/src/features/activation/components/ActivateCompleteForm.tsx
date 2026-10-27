import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@carbon/react";
import { useCompleteActivation } from "@/features/activation/queries/useActivation";
import AuthShell from "@/features/activation/components/AuthShell";
import { validateNewPassword } from "@/shared/auth/password";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import PasswordFields from "@/shared/ui/PasswordFields";

export default function ActivateCompleteForm({ token }: { token: string }) {
  const complete = useCompleteActivation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const canSave = validateNewPassword(password, confirm).valid;

  const save = () => {
    if (canSave) complete.mutate({ token, new_password: password });
  };

  if (complete.isSuccess) {
    return (
      <AuthShell success title="Hesap etkinleştirildi" subtitle="Artık yeni şifrenizle oturum açabilirsiniz.">
        <Button href="/signin" className="os-full-width-btn">Oturum açmaya git</Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Şifrenizi seçin" subtitle="Bu adım hesabınızın etkinleştirilmesini tamamlar. Şifre olarak okul numaranızı veya T.C. Kimlik Numaranızı kullanmayın.">
      <MutationErrorNotification isError={complete.isError} error={complete.error} title="Hesabınız etkinleştirilemedi" />
      <div className="os-auth-card__form">
        <PasswordFields idPrefix="activate-password" password={password} confirm={confirm} onPasswordChange={setPassword} onConfirmChange={setConfirm} />
      </div>
      <div className="os-auth-card__actions">
        <Button className="os-full-width-btn" onClick={save} disabled={!canSave || complete.isPending}>
          {complete.isPending ? "Etkinleştiriliyor…" : "Hesabı etkinleştir"}
        </Button>
      </div>
      <div className="os-auth-card__footer"><a href="/activate">Baştan başla</a> · <Link to="/signin">Oturum açmaya dön</Link></div>
    </AuthShell>
  );
}
