import { useMemo, useState } from "react";
import { Checkbox, MultiSelect } from "@carbon/react";
import { useTeacher, useTeachers } from "@/features/teachers/queries/useTeachers";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useAssignPrincipal, useAssignVicePrincipal } from "@/features/positions/queries/usePositions";
import FormModal from "@/shared/ui/FormModal";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import { displayName } from "@/shared/lib/name";

export function AssignPrincipalModal({ currentTeacherId, onClose }: { currentTeacherId: string; onClose: () => void }) {
  const [teacherSearch, setTeacherSearch] = useState("");
  const { data: teacherPage } = useTeachers({ limit: 25, search: teacherSearch });
  // The current principal may not be among the search results (e.g. no
  // search typed yet) - fetched separately so "Change principal" doesn't
  // show an empty-looking field for the incumbent.
  const { data: currentTeacher } = useTeacher(currentTeacherId);
  const teachers = useMemo(() => {
    const list = teacherPage?.items ?? [];
    return currentTeacher && !list.some((t) => t.id === currentTeacher.id) ? [currentTeacher, ...list] : list;
  }, [teacherPage, currentTeacher]);
  const assign = useAssignPrincipal();
  const [choice, setChoice] = useState(currentTeacherId);
  return (
    <FormModal
      open
      title={currentTeacherId ? "Müdürü değiştir" : "Müdür ata"}
      onClose={onClose}
      onSubmit={() => choice && assign.mutate({ teacher_id: choice }, { onSuccess: onClose })}
      isPending={assign.isPending}
      submitLabel="Ata"
      submitDisabled={!choice}
      isError={assign.isError}
      error={assign.error}
      errorFallback="Müdür atanamadı"
    >
      <EntityCombobox id="principal-teacher" labelText="Öğretmen" items={teachers} selectedId={choice} onSelect={setChoice} onSearch={setTeacherSearch} getId={(t) => t.id} itemToString={(t) => displayName(t)} placeholder="Öğretmeni ada göre ara…" />
    </FormModal>
  );
}

export function AddVicePrincipalModal({ onClose }: { onClose: () => void }) {
  const [teacherSearch, setTeacherSearch] = useState("");
  const { data: teacherPage } = useTeachers({ limit: 25, search: teacherSearch });
  const teachers = teacherPage?.items;
  const { data: grades } = useGrades();
  const assign = useAssignVicePrincipal();
  const [teacherId, setTeacherId] = useState("");
  const [wholeSchool, setWholeSchool] = useState(false);
  const [gradeIds, setGradeIds] = useState<string[]>([]);
  return (
    <FormModal
      open
      title="Müdür yardımcısı ekle"
      onClose={onClose}
      onSubmit={() => teacherId && assign.mutate({ teacher_id: teacherId, notify_whole_school: wholeSchool, grade_ids: wholeSchool ? [] : gradeIds }, { onSuccess: onClose })}
      isPending={assign.isPending}
      submitLabel="Ekle"
      submitDisabled={!teacherId}
      isError={assign.isError}
      error={assign.error}
      errorFallback="Müdür yardımcısı eklenemedi"
    >
      <div className="os-grid os-gap-4">
        <EntityCombobox id="vp-teacher" labelText="Öğretmen" items={teachers ?? []} selectedId={teacherId} onSelect={setTeacherId} onSearch={setTeacherSearch} getId={(t) => t.id} itemToString={(t) => displayName(t)} placeholder="Öğretmeni ada göre ara…" />
        <Checkbox id="vp-whole-school" labelText="Tüm okulu bilgilendirebilir" checked={wholeSchool} onChange={(_e, { checked }) => setWholeSchool(checked)} />
        {!wholeSchool && (
          <MultiSelect
            id="vp-grades"
            titleText="Müdür yardımcısının bilgilendirebileceği seviyeler"
            label="Seviye seçin…"
            items={grades ?? []}
            itemToString={(g) => g?.name ?? ""}
            selectedItems={(grades ?? []).filter((g) => gradeIds.includes(g.id))}
            onChange={({ selectedItems }) => setGradeIds((selectedItems ?? []).map((g) => g.id))}
          />
        )}
      </div>
    </FormModal>
  );
}
