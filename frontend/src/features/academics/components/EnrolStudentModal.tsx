import type { useEnrollStudent } from "@/features/academics/queries/useClasses";
import type { Student } from "@/features/students/api/student";
import FormModal from "@/shared/ui/FormModal";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import { displayName } from "@/shared/lib/name";

interface Props {
  open: boolean;
  enrolCandidates: Student[];
  onStudentSearch: (term: string) => void;
  studentChoice: string;
  onStudentChoiceChange: (id: string) => void;
  enrollStudent: ReturnType<typeof useEnrollStudent>;
  onClose: () => void;
  onEnrol: () => void;
}

export default function EnrolStudentModal({
  open,
  enrolCandidates,
  onStudentSearch,
  studentChoice,
  onStudentChoiceChange,
  enrollStudent,
  onClose,
  onEnrol,
}: Props) {
  return (
    <FormModal
      open={open}
      title="Öğrenci kaydet"
      onClose={onClose}
      onSubmit={onEnrol}
      isPending={enrollStudent.isPending}
      submitDisabled={!studentChoice}
      submitLabel="Kaydet"
      pendingLabel="Kaydediliyor…"
      isError={enrollStudent.isError}
      error={enrollStudent.error}
      errorFallback="Öğrenci kaydedilemedi"
    >
      {enrolCandidates.length === 0 ? (
        <p className="os-text-md">
          Okuldaki tüm öğrenciler bu sınıfa zaten kayıtlı veya henüz öğrenci yok.
        </p>
      ) : (
        <EntityCombobox
          id="student-choice"
          labelText="Öğrenci"
          items={enrolCandidates}
          selectedId={studentChoice}
          onSelect={onStudentChoiceChange}
          onSearch={onStudentSearch}
          getId={(s) => s.id}
          itemToString={(s) => `${displayName(s)} - ${s.index_number}`}
          placeholder="İsim veya okul numarasıyla öğrenci arayın…"
        />
      )}
    </FormModal>
  );
}
