import type { Dispatch, SetStateAction } from "react";
import { Link } from "react-router";
import { Select, SelectItem, TextArea, SkeletonText } from "@carbon/react";
import type { useAddGroupSubject, useMediums } from "@/features/curriculum/queries/useCurriculum";
import type { useSubjects } from "@/features/curriculum/queries/useSubjects";
import type { CurriculumTreeGroup } from "@/features/curriculum/api/curriculum";
import FormModal from "@/shared/ui/FormModal";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import ErrorMessage from "@/shared/ui/ErrorMessage";

export interface SubjectForm {
  subject_id: string;
  medium_id: string;
  prerequisite_note: string;
  sort_order: number;
}

interface Props {
  subjectModalGroup: CurriculumTreeGroup | null;
  subjects: ReturnType<typeof useSubjects>["data"];
  subjectsLoading: boolean;
  subjectsError: boolean;
  onRetrySubjects: () => void;
  available: NonNullable<ReturnType<typeof useSubjects>["data"]>;
  mediums: ReturnType<typeof useMediums>["data"];
  subjectForm: SubjectForm;
  setSubjectForm: Dispatch<SetStateAction<SubjectForm>>;
  addSubject: ReturnType<typeof useAddGroupSubject>;
  onClose: () => void;
  onAdd: () => void;
}

export default function AddSubjectModal({
  subjectModalGroup,
  subjects,
  subjectsLoading,
  subjectsError,
  onRetrySubjects,
  available,
  mediums,
  subjectForm,
  setSubjectForm,
  addSubject,
  onClose,
  onAdd,
}: Props) {
  return (
    <FormModal
      open={!!subjectModalGroup}
      title={`${subjectModalGroup?.label ?? ""} grubuna ders ekle`}
      onClose={onClose}
      onSubmit={onAdd}
      isPending={addSubject.isPending}
      submitDisabled={!subjectForm.subject_id}
      submitLabel="Gruba ekle"
      pendingLabel="Ekleniyor…"
      isError={addSubject.isError}
      error={addSubject.error}
      errorFallback="Ders eklenemedi"
    >
      {subjectsLoading ? (
        <SkeletonText width="70%" />
      ) : subjectsError ? (
        <ErrorMessage message="Ders kataloğu yüklenemedi." onRetry={onRetrySubjects} />
      ) : subjects && subjects.length === 0 ? (
        <p className="os-text-md">
          Katalogda henüz ders yok. Önce <Link to="/subjects/new">ders ekleyin</Link>.
        </p>
      ) : available.length === 0 ? (
        <p className="os-text-md">Katalogdaki tüm dersler bu grupta zaten var.</p>
      ) : (
        <div className="os-grid os-gap-4">
          <EntityCombobox
            id="gs-subject"
            labelText="Ders"
            items={available}
            selectedId={subjectForm.subject_id}
            onSelect={(id) => setSubjectForm((f) => ({ ...f, subject_id: id }))}
            getId={(s) => s.id}
            itemToString={(s) => `${s.name} (${s.code})`}
            placeholder="Ada veya koda göre ders ara…"
          />
          <Select
            id="gs-medium"
            labelText="Öğretim dili kısıtı (isteğe bağlı)"
            helperText="Bu ders yalnızca tek bir dilde sunulmuyorsa herhangi bir öğretim dili olarak bırakın."
            value={subjectForm.medium_id}
            onChange={(e) => setSubjectForm((f) => ({ ...f, medium_id: e.target.value }))}
          >
            <SelectItem value="" text="Herhangi bir öğretim dili" />
            {mediums?.map((m) => (
              <SelectItem key={m.id} value={m.id} text={m.name} />
            ))}
          </Select>
          <TextArea
            id="gs-note"
            labelText="Önkoşul notu (isteğe bağlı)"
            helperText="Yöneticilere ve öğrencilere gösterilen yönerge. Zorunlu değildir."
            rows={2}
            value={subjectForm.prerequisite_note}
            onChange={(e) => setSubjectForm((f) => ({ ...f, prerequisite_note: e.target.value }))}
          />
        </div>
      )}
    </FormModal>
  );
}
