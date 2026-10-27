import { Button, ComposedModal, ModalHeader, ModalBody, ModalFooter } from "@carbon/react";

interface Props {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export default function UnsavedChangesModal({ open, onStay, onLeave }: Props) {
  return (
    <ComposedModal open={open} size="sm" onClose={onStay} aria-label="Kaydedilmemiş değişiklikler">
      <ModalHeader title="Kaydedilmemiş değişiklikler" />
      <ModalBody>
        <p className="os-text-md">Kaydedilmemiş değişiklikleriniz var. Şimdi ayrılırsanız değişiklikler kaybolur.</p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onStay}>
          Kal
        </Button>
        <Button kind="danger" onClick={onLeave}>
          Kaydetmeden ayrıl
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
