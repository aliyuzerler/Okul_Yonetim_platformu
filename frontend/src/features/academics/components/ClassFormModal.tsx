import { useState } from "react";
import { Button, ComposedModal, InlineNotification, ModalBody, ModalFooter, ModalHeader, NumberInput, Select, SelectItem, TextInput } from "@carbon/react";
import { Save } from "@carbon/icons-react";
import { useStreams } from "@/features/academics/queries/useClasses";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useMediums } from "@/features/curriculum/queries/useCurriculum";
import { useTeachers } from "@/features/teachers/queries/useTeachers";
import { useCreateClassForm } from "@/features/academics/hooks/useCreateClassForm";
import InfoTip from "@/shared/ui/InfoTip";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import { displayName } from "@/shared/lib/name";

interface Props {
  open: boolean;
  gradeId?: string;
  onClose: () => void;
}

export default function ClassFormModal({ open, gradeId = "", onClose }: Props) {
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: streams } = useStreams();
  const { data: mediums } = useMediums();
  const [teacherSearch, setTeacherSearch] = useState("");
  const { data: teacherPage } = useTeachers({ limit: 25, search: teacherSearch });
  const f = useCreateClassForm(gradeId, onClose);
  const { form, set, touched } = f;
  const regularClassrooms = f.classrooms?.filter((classroom) => classroom.room_type === "regular");
  const roomHelp = !form.home_classroom_id && f.suggestedHomeClassroom
    ? "Sınıf adından önerildi."
    : !form.home_classroom_id && form.name.trim()
      ? `"${form.name.trim()}" adında yeni bir derslik oluşturulacak.`
      : "Öğrenciler gün boyu bu derslikte kalır; öğretmenler sınıflar arasında dolaşır.";

  return (
    <ComposedModal open={open} size="md" onClose={onClose} aria-label="Sınıf ekle">
      <ModalHeader title="Sınıf ekle" />
      <ModalBody>
        <div className="os-modal-form">
          <Select id="modal-grade" labelText="Sınıf seviyesi" value={form.grade_id} onChange={(e) => set("grade_id", e.target.value)} onBlur={() => f.markTouched("grade")} invalid={!!touched.grade && !form.grade_id} invalidText="Sınıf seviyesi seçilmelidir.">
            <SelectItem value="" text={gradesLoading ? "Sınıf seviyeleri yükleniyor…" : "Sınıf seviyesi seçin…"} />
            {grades?.map((grade) => <SelectItem key={grade.id} value={grade.id} text={grade.name} />)}
          </Select>
          <TextInput id="modal-class-name" labelText="Sınıf adı" placeholder="örn. 10-A" maxLength={20} value={form.name} onChange={(e) => set("name", e.target.value)} onBlur={() => f.markTouched("name")} invalid={!!touched.name && !form.name.trim()} invalidText="Sınıf adı gereklidir." />
          <NumberInput id="modal-class-capacity" label="Kontenjan" helperText="Bu sınıf için en fazla öğrenci sayısı." min={1} max={200} invalid={!f.capacityValid} invalidText="1 ile 200 arasında bir tam sayı girin." value={form.capacity} onChange={(_e, { value }) => set("capacity", value === "" ? "" : String(value))} />
          <Select id="modal-stream" labelText="Alan (isteğe bağlı)" value={form.stream_id} onChange={(e) => set("stream_id", e.target.value)}>
            <SelectItem value="" text="Alan yok" />
            {streams?.map((stream) => <SelectItem key={stream.id} value={stream.id} text={stream.name} />)}
          </Select>
          <Select id="modal-stream-group" labelText="Alt alan (isteğe bağlı)" helperText={form.stream_id ? undefined : "Alt alan seçmek için önce bir alan seçin."} disabled={!form.stream_id} value={form.stream_group_id} onChange={(e) => set("stream_group_id", e.target.value)}>
            <SelectItem value="" text="Alt alan yok" />
            {f.streamGroups?.map((group) => <SelectItem key={group.id} value={group.id} text={group.name} />)}
          </Select>
          <Select id="modal-medium" labelText={<>Öğretim dili (isteğe bağlı) <InfoTip>Tek bir öğretim diline bağlı sınıflar, sınıf geçmede karıştırılmak yerine öğrencileriyle birlikte taşınır.</InfoTip></>} helperText="Yalnızca tek dilli sınıflar için." value={form.medium_id} onChange={(e) => set("medium_id", e.target.value)}>
            <SelectItem value="" text="Öğretim dili yok" />
            {mediums?.map((medium) => <SelectItem key={medium.id} value={medium.id} text={medium.name} />)}
          </Select>
          <Select id="modal-home-classroom" labelText="Ana derslik (isteğe bağlı)" helperText={roomHelp} value={f.effectiveHomeClassroomId} onChange={(e) => set("home_classroom_id", e.target.value)}>
            <SelectItem value="" text="Sınıf adına uygun şekilde otomatik oluştur" />
            {regularClassrooms?.map((classroom) => <SelectItem key={classroom.id} value={classroom.id} text={classroom.name} />)}
          </Select>
          <EntityCombobox id="modal-class-teacher" labelText="Sınıf öğretmeni (isteğe bağlı)" items={teacherPage?.items ?? []} selectedId={form.form_teacher_id} onSelect={(id) => set("form_teacher_id", id)} onSearch={setTeacherSearch} getId={(teacher) => teacher.id} itemToString={(teacher) => `${displayName(teacher)} - ${teacher.employee_number}`} placeholder="Öğretmen arayın…" />
          <Select id="modal-academic-year" labelText="Eğitim-öğretim yılı" value={f.academicYearId} onChange={(e) => set("academic_year_id", e.target.value)} onBlur={() => f.markTouched("year")} invalid={!!touched.year && !f.academicYearId} invalidText="Eğitim-öğretim yılı seçilmelidir.">
            <SelectItem value="" text="Eğitim-öğretim yılı seçin…" />
            {f.years?.map((year) => <SelectItem key={year.id} value={year.id} text={year.is_current ? `${year.label} (Güncel)` : year.label} />)}
          </Select>
          {f.error && <InlineNotification kind="error" title="Sınıf oluşturulamadı" subtitle={f.error} lowContrast onClose={f.clearError} className="os-max-w-full" />}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>İptal</Button>
        <Button kind="primary" renderIcon={Save} disabled={!f.isValid || f.isSaving} onClick={f.save}>{f.isSaving ? "Oluşturuluyor…" : "Sınıf oluştur"}</Button>
      </ModalFooter>
    </ComposedModal>
  );
}
