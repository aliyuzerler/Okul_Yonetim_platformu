import type { ReactNode } from "react";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";

interface Props {
  isLoading: boolean;
  isError?: boolean;
  isEmpty: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  skeleton: ReactNode;
  empty: { title: string; description: string; action?: ReactNode };
  children: ReactNode;
}

// The loading / error / empty / content switch every list page repeats.
export default function ListState({
  isLoading,
  isError,
  isEmpty,
  errorMessage = "Veriler yüklenemedi.",
  onRetry,
  skeleton,
  empty,
  children,
}: Props) {
  if (isLoading) return <>{skeleton}</>;
  if (isError) return <ErrorMessage message={errorMessage} onRetry={onRetry} />;
  if (isEmpty) return <EmptyState title={empty.title} description={empty.description} action={empty.action} />;
  return <>{children}</>;
}
