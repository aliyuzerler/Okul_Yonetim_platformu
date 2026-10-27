import { InlineNotification } from "@carbon/react";
import { getErrorMessage } from "@/shared/api/errors";

interface Props {
  isError: boolean | undefined;
  error?: unknown;
  title?: string;
  fallback?: string;
  onClose?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

// Standardizes the mutation-error banner repeated across nearly every admin page/modal.
export default function MutationErrorNotification({
  isError,
  error,
  title = "Hata",
  fallback,
  onClose,
  className,
  style,
}: Props) {
  if (!isError) return null;
  return (
    <InlineNotification
      kind="error"
      lowContrast
      hideCloseButton={!onClose}
      title={title}
      subtitle={getErrorMessage(error, fallback)}
      onClose={onClose}
      className={`os-mb-4 os-max-w-full${className ? ` ${className}` : ""}`}
      style={style}
    />
  );
}
