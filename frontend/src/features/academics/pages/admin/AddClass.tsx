import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button, Select, SelectItem, TextInput, InlineNotification } from "@carbon/react";
import { ArrowLeft, Save } from "@carbon/icons-react";
import { useStreams } from "@/features/academics/queries/useClasses";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useMediums } from "@/features/curriculum/queries/useCurriculum";
import { useTeachers } from "@/features/teachers/queries/useTeachers";
import { useCreateClassForm } from "@/features/academics/hooks/useCreateClassForm";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import InfoTip from "@/shared/ui/InfoTip";
import { displayName } from "@/shared/lib/name";

// Supports preselecting the grade via `?grade_id=`.
export default function AddClass() {
  const [searchParams] = useSearchParams();
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: streams } = useStreams();
  const { data: mediums } = useMediums();
  const [teacherSearch, setTeacherSearch] = useState("");
  const { data: teacherPage } = useTeachers({ limit: 25, search: teacherSearch });
  const teachers = teacherPage?.items;
  const f = useCreateClassForm(searchParams.get("grade_id") ?? "");
  usePageTitle("Sınıf ekle");
  const { form, set, touched } = f;
  const regularClassrooms = f.classrooms?.filter((c) => c.room_type === "regular");

  const roomHelp = !form.home_classroom_id && f.suggestedHomeClassroom
    ? "Sınıf adından önerildi."
    : !form.home_classroom_id && form.name.trim()
      ? `"${form.name.trim()}" adında yeni bir derslik oluşturulacak.`
      : "Öğrenciler gün boyu bu derslikte kalır; öğretmenler sınıflar arasında dolaşır.";

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Yeni sınıf ekle</h1>
          <p className="os-page__subtitle">Bir eğitim-öğretim yılı için sınıf oluşturun</p>
        </div>
        <Button renderIcon={ArrowLeft} kind="ghost" size="md" as={Link} to="/classes">Geri</Button>
      </div>

      <div className="os-form">
        <div className="os-form__section">
          <div className="os-form__section-header">Sınıf bilgileri</div>
          <div className="os-form__section-body">
            <Select id="grade" labelText="Sınıf seviyesi" value={form.grade_id} onChange={(e) => set("grade_id", e.target.value)} onBlur={() => f.markTouched("grade")} invalid={!!touched.grade && !form.grade_id} invalidText="Sınıf seviyesi seçilmelidir.">
              <SelectItem value="" text={gradesLoading ? "Sınıf seviyeleri yükleniyor…" : "Sınıf seviyesi seçin…"} />
              {grades?.map((g) => <SelectItem key={g.id} value={g.id} text={g.name} />)}
            </Select>
            <TextInput id="class-name" labelText="Sınıf adı" placeholder="örn. 10-A" maxLength={20} value={form.name} onChange={(e) => set("name", e.target.value)} onBlur={() => f.markTouched("name")} invalid={!!touched.name && !form.name.trim()} invalidText="Sınıf adı gereklidir." />
            <Select id="stream" labelText="Alan (isteğe bağlı)" value={form.stream_id} onChange={(e) => set("stream_id", e.target.value)}>
              <SelectItem value="" text="Alan yok" />
              {streams?.map((s) => <SelectItem key={s.id} value={s.id} text={s.name} />)}
            </Select>
            <Select id="stream-group" labelText="Alt alan (isteğe bağlı)" helperText={form.stream_id ? undefined : "Alt alan seçmek için önce bir alan seçin."} disabled={!form.stream_id} value={form.stream_group_id} onChange={(e) => set("stream_group_id", e.target.value)}>
              <SelectItem value="" text="Alt alan yok" />
              {f.streamGroups?.map((g) => <SelectItem key={g.id} value={g.id} text={g.name} />)}
            </Select>
            <Select id="medium" labelText={<>Öğretim dili (isteğe bağlı) <InfoTip>Tek bir öğretim diline bağlı sınıflar, sınıf geçmede karıştırılmak yerine öğrencileriyle birlikte taşınır.</InfoTip></>} helperText="Yalnızca tek dilli sınıflar için." value={form.medium_id} onChange={(e) => set("medium_id", e.target.value)}>
              <SelectItem value="" text="Öğretim dili yok" />
              {mediums?.map((m) => <SelectItem key={m.id} value={m.id} text={m.name} />)}
            </Select>
            <Select id="home-classroom" labelText="Ana derslik (isteğe bağlı)" helperText={roomHelp} value={f.effectiveHomeClassroomId} onChange={(e) => set("home_classroom_id", e.target.value)}>
              <SelectItem value="" text="Sınıf adına uygun şekilde otomatik oluştur" />
              {regularClassrooms?.map((c) => <SelectItem key={c.id} value={c.id} text={c.name} />)}
            </Select>
            <EntityCombobox
              id="class-teacher"
              labelText="Sınıf öğretmeni (isteğe bağlı)"
              items={teachers ?? []}
              selectedId={form.form_teacher_id}
              onSelect={(id) => set("form_teacher_id", id)}
              onSearch={setTeacherSearch}
              getId={(t) => t.id}
              itemToString={(t) => `${displayName(t)} - ${t.employee_number}`}
              placeholder="İsim veya sicil numarasıyla öğretmen arayın…"
            />
          </div>
        </div>

        <div className="os-form__section">
          <div className="os-form__section-header">Eğitim-öğretim yılı</div>
          <div className="os-form__section-body">
            <Select id="academic-year" labelText="Eğitim-öğretim yılı" value={f.academicYearId} onChange={(e) => set("academic_year_id", e.target.value)} onBlur={() => f.markTouched("year")} invalid={!!touched.year && !f.academicYearId} invalidText="Eğitim-öğretim yılı seçilmelidir.">
              <SelectItem value="" text="Eğitim-öğretim yılı seçin…" />
              {f.years?.map((y) => <SelectItem key={y.id} value={y.id} text={y.is_current ? `${y.label} (Güncel)` : y.label} />)}
            </Select>
            <div />
          </div>
        </div>

        {f.error && <InlineNotification kind="error" title="Sınıf oluşturulamadı" subtitle={f.error} lowContrast onClose={f.clearError} className="os-max-w-full" />}

        <div className="os-form__actions">
          <Button renderIcon={Save} kind="primary" disabled={!f.isValid || f.isSaving} onClick={f.save}>
            {f.isSaving ? "Oluşturuluyor…" : "Sınıf oluştur"}
          </Button>
          <Button kind="secondary" as={Link} to="/classes">İptal</Button>
        </div>
      </div>
    </div>
  );
}
