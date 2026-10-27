import { useState } from "react";
import { Button, InlineNotification, ComposedModal, ModalHeader, ModalBody, ModalFooter } from "@carbon/react";
import { useChangePassword } from "@/features/auth/queries/useAuth";
import { validateNewPassword } from "@/shared/auth/password";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import PasswordFields from "@/shared/ui/PasswordFields";

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const changePassword = useChangePassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const { valid } = validateNewPassword(password, confirm);

  const handleSubmit = () => {
    if (valid) changePassword.mutate(password, { onSuccess: () => setDone(true) });
  };

  return (
    <ComposedModal open size="sm" onClose={onClose} aria-label="Şifre değiştir">
      <ModalHeader title="Şifre değiştir" />
      <ModalBody>
        {done ? (
          <InlineNotification
            kind="success"
            title="Şifre güncellendi"
            subtitle="Bir sonraki oturum açışınızda yeni şifrenizi kullanın."
            lowContrast
            hideCloseButton
            className="os-full-width"
          />
        ) : (
          <>
            <MutationErrorNotification
              isError={changePassword.isError}
              error={changePassword.error}
              title="Şifre güncellenemedi"
              fallback="Lütfen yeniden deneyin."
            />
            <PasswordFields
              idPrefix="change-password"
              password={password}
              confirm={confirm}
              onPasswordChange={setPassword}
              onConfirmChange={setConfirm}
            />
          </>
        )}
      </ModalBody>
      <ModalFooter>
        {done ? (
          <Button kind="primary" onClick={onClose}>Bitti</Button>
        ) : (
          <>
            <Button kind="secondary" onClick={onClose}>İptal</Button>
            <Button kind="primary" onClick={handleSubmit} disabled={!valid || changePassword.isPending}>
              {changePassword.isPending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </>
        )}
      </ModalFooter>
    </ComposedModal>
  );
}
