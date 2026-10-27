import { InlineNotification, Tag } from "@carbon/react";
import { useEmailStatus } from "@/features/email/queries/useEmail";
import SectionCard from "@/shared/ui/SectionCard";
import InfoRow from "@/shared/ui/InfoRow";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";

const PROVIDER_LABELS = { resend: "Resend API", smtp: "SMTP", console: "Yalnızca sunucu günlüğü (gönderilmiyor)" } as const;

// Read-only: mail settings live in the backend .env, never in the database.
export default function EmailStatusCard() {
  const { data: status, isLoading, isError, refetch } = useEmailStatus();

  if (isLoading) return <LoadingSpinner />;
  if (isError || !status) return <ErrorMessage message="E-posta ayarları yüklenemedi." onRetry={refetch} />;

  return (
    <SectionCard title="E-posta gönderimi" meta={<Tag type={status.provider === "console" ? "red" : "green"} size="sm">{status.provider === "console" ? "Gönderilmiyor" : "Aktif"}</Tag>}>
      {status.redirect_to && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title="Test modu"
          subtitle={`Tüm e-postalar, kimin için olduğu belirtilerek ${status.redirect_to} adresine gider. Yayına almadan önce MAIL_REDIRECT_TO ayarını kaldırın.`}
          className="os-mb-4 os-max-w-full"
        />
      )}
      {status.provider === "console" && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title="E-postalar gönderilmiyor"
          subtitle="Sıfırlama ve etkinleştirme bağlantıları yalnızca sunucu günlüğünde görünür. Backend .env dosyasında RESEND_API_KEY veya SMTP_HOST ayarlayın."
          className="os-mb-4 os-max-w-full"
        />
      )}
      <InfoRow label="Sağlayıcı" value={PROVIDER_LABELS[status.provider]} />
      <InfoRow label="Gönderen" value={status.from} />
      <InfoRow label="Yanıtların gideceği adres" value={status.reply_to || "Genel ayarlar bölümündeki okul e-postası"} />
      <p className="os-text-sm os-c-secondary os-mt-4 os-mb-0">Bu ayarlar backend .env dosyasından gelir; değişiklik için sunucunun yeniden başlatılması gerekir.</p>
    </SectionCard>
  );
}
