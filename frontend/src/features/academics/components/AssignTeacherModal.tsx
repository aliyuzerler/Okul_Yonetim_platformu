import type { useAssignFormTeacher } from "@/features/academics/queries/useClasses";
import type { Teacher } from "@/features/teachers/api/teacher";
import FormModal from "@/shared/ui/FormModal";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import { displayName } from "@/shared/lib/name";

interface Props {
  open: boolean;
  teachers: Teacher[] | undefined;
  onTeacherSearch: (term: string) => void;
  teacherChoice: string;
  onTeacherChoiceChange: (id: string) => void;
  assignFormTeacher: ReturnType<typeof useAssignFormTeacher>;
  onClose: () => void;
  onAssign: () => void;
}

export default function AssignTeacherModal({
  open,
  teachers,
  onTeacherSearch,
  teacherChoice,
  onTeacherChoiceChange,
  assignFormTeacher,
  onClose,
  onAssign,
}: Props) {
  return (
    <FormModal
      open={open}
      title="Sınıf öğretmeni ata"
      onClose={onClose}
      onSubmit={onAssign}
      isPending={assignFormTeacher.isPending}
      submitDisabled={!teacherChoice}
      submitLabel="Ata"
      isError={assignFormTeacher.isError}
      error={assignFormTeacher.error}
      errorFallback="Öğretmen atanamadı"
    >
      <EntityCombobox
        id="teacher-choice"
        labelText="Öğretmen"
        items={teachers ?? []}
        selectedId={teacherChoice}
        onSelect={onTeacherChoiceChange}
        onSearch={onTeacherSearch}
        getId={(t) => t.id}
        itemToString={(t) => `${displayName(t)} - ${t.employee_number}`}
        placeholder="İsim veya sicil numarasıyla öğretmen arayın…"
      />
    </FormModal>
  );
}
