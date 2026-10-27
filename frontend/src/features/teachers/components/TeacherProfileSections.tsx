import { TextInput, Select, SelectItem, RadioButtonGroup, RadioButton } from "@carbon/react";
import type { UseMutationResult } from "@tanstack/react-query";
import type { Teacher, TeacherTitle, TeacherEmploymentStatus, TeacherSubject } from "@/features/teachers/api/teacher";
import type { House } from "@/features/school/api/house";
import { TITLES, EMPLOYMENT_STATUSES } from "@/features/teachers/constants";
import TeacherSubjectsSection from "@/features/teachers/components/TeacherSubjectsSection";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import PersonNameFields from "@/shared/ui/PersonNameFields";
import { formatDateOnly, formatISODate } from "@/shared/lib/date";
import InfoTip from "@/shared/ui/InfoTip";
import SectionCard from "@/shared/ui/SectionCard";

// shared/lib EMPLOYMENT_STATUSES is English; display labels are translated here.
const employmentStatusLabel: Record<string, string> = {
  active: "Aktif",
  resigned: "İstifa etti",
  transferred: "Başka okula atandı",
};

export type TeacherProfileForm = {
  full_name: string;
  name_with_initials: string;
  calling_name: string;
  phone_number: string;
  nic_number: string;
  title: TeacherTitle | "";
  gender: "" | "male" | "female";
};

interface Props {
  teacher: Teacher;
  subjects: TeacherSubject[] | undefined;
  houses: House[] | undefined;
  form: TeacherProfileForm;
  editing: boolean;
  onChange: (field: keyof TeacherProfileForm, value: string) => void;
  onTitleChange: (value: TeacherTitle | "") => void;
  onGenderChange: (value: "male" | "female") => void;
  updateError: string | null;
  updateHouse: UseMutationResult<unknown, unknown, { id: string; houseId: string }>;
  updateStatus: UseMutationResult<unknown, unknown, { id: string; status: TeacherEmploymentStatus }>;
  assignSubject: UseMutationResult<unknown, unknown, string>;
  removeSubject: UseMutationResult<unknown, unknown, string>;
}

export default function TeacherProfileSections(p: Props) {
  const { teacher, form, editing, onChange } = p;
  const currentHouse = p.houses?.find((h) => h.id === teacher.house_id);
  const field = (id: string, labelText: string, key: keyof TeacherProfileForm) => ({
    id,
    labelText,
    value: form[key],
    readOnly: !editing,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(key, e.target.value),
  });

  return (
    <>
      <SectionCard title="Profil">
          <MutationErrorNotification isError={!!p.updateError} error={null} fallback={p.updateError ?? ""} />
          <div className="os-grid os-grid-cols-2 os-gap-5">
            <Select id="title" labelText="Unvan" value={form.title} disabled={!editing} onChange={(e) => p.onTitleChange(e.target.value as TeacherTitle | "")}>
              <SelectItem value="" text="Yok" />
              {TITLES.map((t) => <SelectItem key={t} value={t} text={t} />)}
            </Select>
            <RadioButtonGroup legendText="Cinsiyet" name="gender" valueSelected={form.gender} disabled={!editing} onChange={(value) => p.onGenderChange(value as "male" | "female")}>
              <RadioButton id="edit-gender-male" labelText="Erkek" value="male" />
              <RadioButton id="edit-gender-female" labelText="Kız" value="female" />
            </RadioButtonGroup>
            <PersonNameFields
              idPrefix="teacher-profile"
              value={form}
              readOnly={!editing}
              fullNameInvalid={editing && !form.full_name.trim()}
              onChange={(next) => {
                (["full_name", "name_with_initials", "calling_name"] as const).forEach((key) => {
                  if (next[key] !== form[key]) onChange(key, next[key]);
                });
              }}
            />
            <TextInput id="employee-number" labelText="Sicil numarası" value={teacher.employee_number} readOnly />
            <TextInput id="email" labelText="E-posta" value={teacher.email ?? "-"} readOnly />
            <TextInput {...field("phone", "Telefon", "phone_number")} />
            <TextInput {...field("nic-number", "T.C. Kimlik No", "nic_number")} />
            <TextInput id="joined-date" labelText="İşe başlama tarihi" value={formatDateOnly(teacher.joined_date)} readOnly />
            <TextInput id="created-at" labelText="Oluşturulma" value={formatISODate(teacher.created_at)} readOnly />
          </div>
      </SectionCard>

      <TeacherSubjectsSection subjects={p.subjects} editing={editing} assignSubject={p.assignSubject} removeSubject={p.removeSubject} />

      <SectionCard title="Kol">
          {currentHouse && (
            <div className="os-flex os-items-center os-gap-2 os-mb-3">
              <span className="os-dot os-w-3q os-h-3q" style={{ backgroundColor: currentHouse.color }} />
              <span className="os-text-md os-fw-600">{currentHouse.name}</span>
            </div>
          )}
          <Select
            id="teacher-house"
            labelText={<>Atanmış kol <InfoTip>Yalnızca sistem yöneticisi değiştirebilir. Her değişiklik denetim kaydına işlenir.</InfoTip></>}
            helperText="Kolları dengelemek için otomatik atanır."
            value={teacher.house_id ?? ""}
            disabled={p.updateHouse.isPending}
            onChange={(e) => p.updateHouse.mutate({ id: teacher.id, houseId: e.target.value })}
          >
            <SelectItem value="" text="Kol yok" />
            {p.houses?.map((h) => <SelectItem key={h.id} value={h.id} text={h.name} />)}
          </Select>
      </SectionCard>

      <SectionCard title="Çalışma durumu">
          <Select
            id="teacher-employment-status"
            labelText="Durum"
            helperText="Öğretmen okuldan ayrıldığında “İstifa etti” veya “Başka okula atandı” olarak işaretleyin."
            value={teacher.employment_status}
            disabled={p.updateStatus.isPending}
            onChange={(e) => p.updateStatus.mutate({ id: teacher.id, status: e.target.value as TeacherEmploymentStatus })}
          >
            {EMPLOYMENT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value} text={employmentStatusLabel[s.value] ?? s.label} />)}
          </Select>
      </SectionCard>
    </>
  );
}
