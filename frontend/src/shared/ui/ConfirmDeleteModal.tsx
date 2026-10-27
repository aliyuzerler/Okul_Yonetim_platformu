import { useEffect } from "react";
import {
  Button,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@carbon/react";
import { useToast } from "@/shared/ui/toast/useToast";

interface MutationLike {
  isPending: boolean;
  isSuccess: boolean;
  reset: () => void;
}

interface Props {
  open: boolean;
  title: string;
  description: React.ReactNode;
  // Success toast reads "<subject> <successVerb>".
  subject: string;
  successVerb?: string;
  mutation: MutationLike;
  // Disables confirming for a reason unrelated to the mutation itself (e.g. a dependent check still loading), without implying one is in flight.
  disabled?: boolean;
  confirmLabel?: string;
  pendingLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
  // Extra cleanup that should run only when the delete actually succeeds, not on Cancel. onClose always runs too.
  onSuccess?: () => void;
}

export default function ConfirmDeleteModal({
  open,
  title,
  description,
  subject,
  successVerb = "silindi",
  mutation,
  disabled,
  confirmLabel = "Sil",
  pendingLabel = "Siliniyor…",
  onClose,
  onConfirm,
  onSuccess,
}: Props) {
  const { showToast } = useToast();

  useEffect(() => {
    if (!mutation.isSuccess) return;
    showToast({ kind: "success", title: `${subject} ${successVerb}` });
    mutation.reset();
    onSuccess?.();
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per isSuccess transition; onClose/onSuccess/showToast/mutation.reset are stable enough for this
  }, [mutation.isSuccess]);

  return (
    <ComposedModal open={open} size="sm" onClose={onClose} aria-label={title}>
      <ModalHeader title={title} />
      <ModalBody>
        <p className="os-text-md">{description}</p>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          İptal
        </Button>
        <Button kind="danger" onClick={onConfirm} disabled={mutation.isPending || disabled}>
          {mutation.isPending ? pendingLabel : confirmLabel}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
