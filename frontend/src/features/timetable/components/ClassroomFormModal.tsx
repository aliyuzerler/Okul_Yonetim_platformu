import { TextInput, NumberInput, Select, SelectItem } from "@carbon/react";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import type { ClassroomType } from "@/features/timetable/api/classroom";
import FormModal from "@/shared/ui/FormModal";
import { isLabMissingSubject, type ClassroomForm } from "@/features/timetable/lib/classroomForm";

interface Props {
  editing: boolean;
  form: ClassroomForm;
  onChange: (form: ClassroomForm) => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: () => void;
}

export default function ClassroomFormModal({ editing, form, onChange, isPending, isError, error, onClose, onSubmit }: Props) {
  const { data: subjects } = useSubjects();
  const labMissingSubject = isLabMissingSubject(form);
  return (
    <FormModal open title={editing ? "Dersliği düzenle" : "Yeni derslik"} onClose={onClose} onSubmit={onSubmit} isPending={isPending} submitDisabled={!form.name.trim() || labMissingSubject} isError={isError} error={error} errorFallback="Derslik kaydedilemedi" submitLabel="Kaydet" pendingLabel="Kaydediliyor…">
      <div className="os-grid os-gap-4">
        <TextInput id="classroom-name" labelText="Oda adı" placeholder="örn. 8A sınıfı, Fen Laboratuvarı 1" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} />
        <NumberInput id="classroom-capacity" label="Kapasite (isteğe bağlı)" min={0} value={form.capacity} onChange={(_e, { value }) => onChange({ ...form, capacity: value != null ? String(value) : "" })} />
        <Select id="classroom-type" labelText="Tür" value={form.room_type} onChange={(e) => onChange({ ...form, room_type: e.target.value as ClassroomType, subject_id: e.target.value === "lab" ? form.subject_id : "" })}>
          <SelectItem value="regular" text="Normal (sınıf öğretmenliği)" />
          <SelectItem value="lab" text="Laboratuvar" />
          <SelectItem value="eca" text="ECA (ders dışı etkinlikler)" />
        </Select>
        {form.room_type === "lab" && (
          <Select id="classroom-subject" labelText="Bu laboratuvarın bağlı olduğu ders" helperText="Otomatik üretici yalnızca bu dersin lab ders saatlerini bu odaya atar." value={form.subject_id} invalid={labMissingSubject} invalidText="Laboratuvar dersliği için zorunludur." onChange={(e) => onChange({ ...form, subject_id: e.target.value })}>
            <SelectItem value="" text="Ders seçin…" />
            {subjects?.map((s) => <SelectItem key={s.id} value={s.id} text={s.name} />)}
          </Select>
        )}
      </div>
    </FormModal>
  );
}
