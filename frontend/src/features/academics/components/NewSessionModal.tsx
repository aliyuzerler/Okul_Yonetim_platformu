import type { useCreateSession } from "@/features/attendance/queries/useAttendance";
import FormModal from "@/shared/ui/FormModal";
import DateField from "@/shared/ui/DateField";

interface Props {
  open: boolean;
  sessionDate: string;
  onSessionDateChange: (date: string) => void;
  createSession: ReturnType<typeof useCreateSession>;
  onClose: () => void;
  onCreate: () => void;
}

export default function NewSessionModal({
  open,
  sessionDate,
  onSessionDateChange,
  createSession,
  onClose,
  onCreate,
}: Props) {
  return (
    <FormModal
      open={open}
      title="Yeni yoklama oturumu"
      onClose={onClose}
      onSubmit={onCreate}
      isPending={createSession.isPending}
      submitDisabled={!sessionDate}
      submitLabel="Oluştur"
      pendingLabel="Oluşturuluyor…"
      isError={createSession.isError}
      error={createSession.error}
      errorFallback="Bu tarih için bu sınıfta zaten bir oturum olabilir."
    >
      <p className="os-text-md os-c-secondary os-mb-4">
        Her sınıf için günde bir oturum açılır. Oluşturduğunuzda doğrudan yoklama işaretleme ekranına gidilir.
      </p>
      <DateField value={sessionDate} onChange={(ymd) => onSessionDateChange(ymd)} id="session-date" labelText="Tarih" />
    </FormModal>
  );
}
