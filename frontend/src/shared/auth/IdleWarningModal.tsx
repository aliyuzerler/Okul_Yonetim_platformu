import { Button, ComposedModal, ModalHeader, ModalBody, ModalFooter } from "@carbon/react";

interface Props {
  open: boolean;
  onStaySignedIn: () => void;
  onSignOut: () => void;
}

// Shown 60 seconds before an idle sign-out (S12) so a still-present user on
// a shared lab or staffroom PC gets a chance to stay signed in, rather than
// losing unsaved work with no warning.
export default function IdleWarningModal({ open, onStaySignedIn, onSignOut }: Props) {
  return (
    <ComposedModal open={open} size="sm" onClose={onStaySignedIn} preventCloseOnClickOutside aria-label="Hâlâ burada mısınız?">
      <ModalHeader title="Hâlâ burada mısınız?" />
      <ModalBody>
        <p className="os-text-md">
          Bir süredir işlem yapmadınız. Güvenliğiniz için oturumunuzu açık tutmayı seçmezseniz bir dakikadan
          kısa süre içinde oturumunuz kapatılacak.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onSignOut}>
          Şimdi oturumu kapat
        </Button>
        <Button onClick={onStaySignedIn}>Oturumu açık tut</Button>
      </ModalFooter>
    </ComposedModal>
  );
}
