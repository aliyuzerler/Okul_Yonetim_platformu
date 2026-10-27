import {
  Button,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  InlineNotification,
} from "@carbon/react";
import { getErrorMessage as apiError } from "@/shared/api/errors";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  isPending?: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  pendingLabel?: string;
  isError?: boolean;
  error?: unknown;
  errorTitle?: string;
  errorFallback?: string;
  size?: "xs" | "sm" | "md" | "lg";
  children: React.ReactNode;
}

export default function FormModal({
  open,
  title,
  onClose,
  onSubmit,
  isPending,
  submitDisabled,
  submitLabel = "Kaydet",
  pendingLabel = "Kaydediliyor…",
  isError,
  error,
  errorTitle = "Hata",
  errorFallback = "Bir sorun oluştu. Lütfen yeniden deneyin.",
  size = "sm",
  children,
}: Props) {
  return (
    <ComposedModal open={open} size={size} onClose={onClose} aria-label={title}>
      <ModalHeader title={title} />
      <ModalBody>
        {isError && (
          <InlineNotification
            kind="error"
            title={errorTitle}
            subtitle={apiError(error, errorFallback)}
            lowContrast
            hideCloseButton className="os-mb-4 os-max-w-full"
          />
        )}
        {children}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          İptal
        </Button>
        <Button kind="primary" onClick={onSubmit} disabled={submitDisabled || isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
