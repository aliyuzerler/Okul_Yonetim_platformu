import type { useAssignMonitors } from "@/features/academics/queries/useClasses";
import type { Student } from "@/features/students/api/student";
import FormModal from "@/shared/ui/FormModal";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import { displayName } from "@/shared/lib/name";

interface Props {
  open: boolean;
  girlMonitorCandidates: Student[];
  boyMonitorCandidates: Student[];
  girlMonitorChoice: string;
  onGirlMonitorChoiceChange: (id: string) => void;
  boyMonitorChoice: string;
  onBoyMonitorChoiceChange: (id: string) => void;
  assignMonitors: ReturnType<typeof useAssignMonitors>;
  onClose: () => void;
  onSave: () => void;
}

export default function AssignMonitorsModal({
  open,
  girlMonitorCandidates,
  boyMonitorCandidates,
  girlMonitorChoice,
  onGirlMonitorChoiceChange,
  boyMonitorChoice,
  onBoyMonitorChoiceChange,
  assignMonitors,
  onClose,
  onSave,
}: Props) {
  return (
    <FormModal
      open={open}
      title="Sınıf temsilcilerini ata"
      onClose={onClose}
      onSubmit={onSave}
      isPending={assignMonitors.isPending}
      isError={assignMonitors.isError}
      error={assignMonitors.error}
      errorFallback="Sınıf temsilcileri atanamadı"
    >
      <div className="os-grid os-gap-4">
        <EntityCombobox
          id="girl-monitor-choice"
          labelText="Kız sınıf temsilcisi"
          items={girlMonitorCandidates}
          selectedId={girlMonitorChoice}
          onSelect={onGirlMonitorChoiceChange}
          getId={(s) => s.id}
          itemToString={(s) => `${displayName(s)} - ${s.index_number}`}
          placeholder="İsim veya okul numarasıyla öğrenci arayın…"
        />
        <EntityCombobox
          id="boy-monitor-choice"
          labelText="Erkek sınıf temsilcisi"
          items={boyMonitorCandidates}
          selectedId={boyMonitorChoice}
          onSelect={onBoyMonitorChoiceChange}
          getId={(s) => s.id}
          itemToString={(s) => `${displayName(s)} - ${s.index_number}`}
          placeholder="İsim veya okul numarasıyla öğrenci arayın…"
        />
      </div>
    </FormModal>
  );
}
