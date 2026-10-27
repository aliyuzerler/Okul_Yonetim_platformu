// Teacher picker is scoped to teachers already qualified for the subject, so a class assignment can't diverge from Teacher Subjects.
import { useState } from "react";
import { Link } from "react-router";
import { InlineNotification } from "@carbon/react";
import type { useAssignSubjectTeacher } from "@/features/academics/queries/useClasses";
import { useTeachersBySubject } from "@/features/teachers/queries/useTeachers";
import type { useSubjects } from "@/features/curriculum/queries/useSubjects";
import FormModal from "@/shared/ui/FormModal";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import { displayName } from "@/shared/lib/name";

interface Props {
  open: boolean;
  subjects: ReturnType<typeof useSubjects>["data"];
  assignSubjectTeacher: ReturnType<typeof useAssignSubjectTeacher>;
  onClose: () => void;
}

export default function AssignClassSubjectTeacherModal({
  open,
  subjects,
  assignSubjectTeacher,
  onClose,
}: Props) {
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const { data: qualifiedTeachers, isLoading: teachersLoading } = useTeachersBySubject(subjectId);

  const handleAssign = () => {
    if (!subjectId || !teacherId) return;
    assignSubjectTeacher.mutate({ subject_id: subjectId, teacher_id: teacherId }, { onSuccess: onClose });
  };

  return (
    <FormModal
      open={open}
      title="Branş öğretmeni ata"
      onClose={onClose}
      onSubmit={handleAssign}
      isPending={assignSubjectTeacher.isPending}
      submitDisabled={!subjectId || !teacherId}
      submitLabel="Ata"
      isError={assignSubjectTeacher.isError}
      error={assignSubjectTeacher.error}
      errorFallback="Branş öğretmeni atanamadı"
    >
      <div className="os-grid os-gap-4">
        <EntityCombobox
          id="class-subject-choice"
          labelText="Ders"
          items={subjects ?? []}
          selectedId={subjectId}
          onSelect={(id) => {
            setSubjectId(id);
            setTeacherId("");
          }}
          getId={(s) => s.id}
          itemToString={(s) => `${s.name} (${s.code})`}
          placeholder="İsim veya kodla ders arayın…"
        />
        <div>
          <EntityCombobox
            id="class-subject-teacher-choice"
            labelText="Öğretmen"
            items={qualifiedTeachers ?? []}
            selectedId={teacherId}
            onSelect={setTeacherId}
            getId={(t) => t.id}
            itemToString={(t) => `${displayName(t)} - ${t.employee_number}`}
            placeholder={subjectId ? "Yeterliliği olan öğretmenlerde arayın…" : "Önce bir ders seçin…"}
            disabled={!subjectId}
          />
          <p className="os-mt-1h os-mx-0 os-mb-0 os-text-xs os-c-tertiary">
            Yalnızca <Link to="/teacher-subjects">Öğretmen branşları</Link> sayfasında bu ders için yeterliliği olan öğretmenler gösterilir.
          </p>
        </div>

        {subjectId && !teachersLoading && (qualifiedTeachers?.length ?? 0) === 0 && (
          <InlineNotification
            kind="warning"
            title="Yeterliliği olan öğretmen yok"
            subtitle="Henüz bu dersi yeterlilik olarak tutan bir öğretmen yok - önce Öğretmen branşları sayfasından atayın."
            lowContrast
            hideCloseButton className="os-max-w-full"
          />
        )}
      </div>
    </FormModal>
  );
}
