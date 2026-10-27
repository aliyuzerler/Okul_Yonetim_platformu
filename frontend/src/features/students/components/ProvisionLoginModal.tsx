import { useState } from "react";
import { TextInput, InlineNotification } from "@carbon/react";
import { useProvisionGuardianLogin } from "@/features/guardians/queries/useGuardians";
import type { GuardianWithPrimary } from "@/features/guardians/api/guardian";
import FormModal from "@/shared/ui/FormModal";
import { displayName } from "@/shared/lib/name";

// Names come from the guardian record, so only the username is asked for here.
export default function ProvisionLoginModal({
  studentId,
  guardian,
  onClose,
}: {
  studentId: string;
  guardian: GuardianWithPrimary;
  onClose: () => void;
}) {
  const provision = useProvisionGuardianLogin(studentId);
  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);
  const name = displayName(guardian);
  const isValid = username.trim().length > 0;

  const handleSubmit = () => {
    setTouched(true);
    if (!isValid) return;
    provision.mutate({ guardianId: guardian.id, data: { username: username.trim() } }, { onSuccess: onClose });
  };

  return (
    <FormModal
      open
      title={`Portal girişi oluştur - ${name}`}
      onClose={onClose}
      onSubmit={handleSubmit}
      isPending={provision.isPending}
      submitDisabled={!isValid || !guardian.email}
      submitLabel="Giriş oluştur"
      pendingLabel="Oluşturuluyor…"
      isError={provision.isError}
      error={provision.error}
      errorFallback="Giriş oluşturulamadı"
    >
      {!guardian.email && (
        <InlineNotification
          kind="warning"
          title="E-posta kayıtlı değil"
          subtitle="Portal girişi açılmadan önce bu velinin bir e-posta adresi gerekir. Önce bilgilerini düzenleyin."
          lowContrast
          hideCloseButton className="os-mb-4 os-max-w-full"
        />
      )}
      <InlineNotification
        kind="info"
        title="Tek kullanımlık şifre"
        subtitle={`${name} için kayıtlı T.C. Kimlik No, ilk portal şifresi olur. İlk oturum açışında değiştirmesi istenir.`}
        lowContrast
        hideCloseButton className="os-mb-4 os-max-w-full"
      />
      <TextInput
        id="guardian-login-username"
        labelText="Kullanıcı adı"
        helperText="Bu velinin oturum açarken kullanacağı ad - e-postasından bağımsızdır. Adı, veli bilgilerinden alınır."
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onBlur={() => setTouched(true)}
        invalid={touched && !username.trim()}
        invalidText="Bu alan zorunludur."
      />
    </FormModal>
  );
}
