// Turkish formatting helpers shared by the platform pages.

export function formatKurus(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(value));
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export const TENANT_STATUS_LABELS: Record<string, string> = {
  pending_verification: "E-posta bekliyor",
  trial: "Deneme",
  active: "Aktif",
  past_due: "Ödeme gecikti",
  expired: "Süresi doldu",
  cancelled: "İptal edildi",
};

export const SUB_STATUS_LABELS: Record<string, string> = {
  trialing: "Denemede",
  active: "Aktif",
  past_due: "Ödeme gecikti",
  expired: "Süresi doldu",
  cancelled: "İptal edildi",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  succeeded: "Başarılı",
  failed: "Başarısız",
};

export const ACCESS_STATE_LABELS: Record<string, string> = {
  ok: "Tam erişim",
  read_only: "Salt okunur",
  locked: "Kilitli",
};
