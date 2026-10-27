import { TextInput, TextArea, Select, SelectItem, RadioButtonGroup, RadioButton, Tag } from "@carbon/react";
import type { StudentWithClass, StudentEnrollmentStatus } from "@/features/students/api/student";
import type { House } from "@/features/school/api/house";
import type { UseMutationResult } from "@tanstack/react-query";
import InfoTip from "@/shared/ui/InfoTip";
import SectionCard from "@/shared/ui/SectionCard";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import PersonNameFields from "@/shared/ui/PersonNameFields";

type Gender = "" | "male" | "female";

const ENROLLMENT_STATUSES: { value: StudentEnrollmentStatus; label: string }[] = [
  { value: "active", label: "Aktif" },
  { value: "left", label: "Okuldan ayrıldı" },
];

const GENDER_LABELS: Record<string, string> = {
  male: "Erkek",
  female: "Kız",
};

export type StudentProfileForm = {
  full_name: string;
  name_with_initials: string;
  calling_name: string;
  phone_number: string;
  address: string;
  whatsapp: string;
  special_remarks: string;
  gender: Gender;
};

export default function StudentProfileTab({
  student,
  form,
  editing,
  onChange,
  onGenderChange,
  updateError,
  houses,
  updateHouse,
  updateStatus,
}: {
  student: StudentWithClass;
  form: StudentProfileForm;
  editing: boolean;
  onChange: (field: keyof StudentProfileForm, value: string) => void;
  onGenderChange: (value: Gender) => void;
  updateError: string | null;
  houses: House[] | undefined;
  updateHouse: UseMutationResult<unknown, unknown, { id: string; houseId: string }>;
  updateStatus: UseMutationResult<unknown, unknown, { id: string; status: StudentEnrollmentStatus }>;
}) {
  const currentHouse = houses?.find((h) => h.id === student.house_id);

  return (
    <>
      <SectionCard title="Profil" className="os-mt-4">
          <MutationErrorNotification isError={!!updateError} error={null} title="Öğrenci güncellenemedi" fallback={updateError ?? "Lütfen tekrar deneyin."} />
          <div className="os-grid os-grid-cols-2 os-gap-5">
            <PersonNameFields
              idPrefix="student-profile"
              value={form}
              readOnly={!editing}
              fullNameInvalid={editing && !form.full_name.trim()}
              onChange={(next) => {
                (["full_name", "name_with_initials", "calling_name"] as const).forEach((field) => {
                  if (next[field] !== form[field]) onChange(field, next[field]);
                });
              }}
            />
            <TextInput id="index-number" labelText="Okul numarası" value={student.index_number} readOnly />
            <TextInput id="email" labelText="E-posta" value={student.email ?? "-"} readOnly />
            <TextInput
              id="phone"
              labelText="Telefon"
              value={form.phone_number}
              readOnly={!editing}
              onChange={(e) => onChange("phone_number", e.target.value)}
            />
            <TextInput
              id="whatsapp"
              labelText="WhatsApp"
              value={form.whatsapp}
              readOnly={!editing}
              onChange={(e) => onChange("whatsapp", e.target.value)}
            />
            <TextInput
              id="address"
              labelText="Adres"
              value={form.address}
              readOnly={!editing}
              onChange={(e) => onChange("address", e.target.value)}
            />
            {editing ? (
              <RadioButtonGroup
                legendText="Cinsiyet"
                name="gender"
                valueSelected={form.gender}
                onChange={(value) => onGenderChange(value as Gender)}
              >
                <RadioButton id="gender-male" labelText="Erkek" value="male" />
                <RadioButton id="gender-female" labelText="Kız" value="female" />
              </RadioButtonGroup>
            ) : (
              <TextInput
                id="gender"
                labelText="Cinsiyet"
                value={form.gender ? GENDER_LABELS[form.gender] ?? form.gender : "-"}
                readOnly
              />
            )}
            <div className="os-col-span-full">
              <TextArea
                id="special-remarks"
                labelText="Özel notlar"
                rows={3}
                value={form.special_remarks}
                readOnly={!editing}
                onChange={(e) => onChange("special_remarks", e.target.value)}
              />
            </div>
          </div>
      </SectionCard>

      <SectionCard title="Mevcut sınıf">
          {student.class_name ? (
            <div className="os-flex os-gap-2 os-wrap">
              <Tag type="blue" size="sm">
                {student.class_name}
              </Tag>
              {student.grade_name && (
                <Tag type="gray" size="sm">
                  {student.grade_name}
                </Tag>
              )}
              {student.academic_year && (
                <Tag type="cool-gray" size="sm">
                  {student.academic_year}
                </Tag>
              )}
            </div>
          ) : (
            <span className="os-text-md os-c-tertiary">Henüz bir sınıfa kayıtlı değil.</span>
          )}
      </SectionCard>

      <SectionCard title="Kol">
          {currentHouse && (
            <div className="os-flex os-items-center os-gap-2 os-mb-3">
              <span className="os-inline-block os-w-3q os-h-3q os-rounded-full" style={{ backgroundColor: currentHouse.color }}
              />
              <span className="os-text-md os-fw-600">{currentHouse.name}</span>
            </div>
          )}
          <Select
            id="student-house"
            labelText={<>Atanmış kol <InfoTip>Yalnızca sistem yöneticisi değiştirebilir. Her değişiklik denetim kaydına işlenir.</InfoTip></>}
            helperText="Kolları dengelemek için otomatik atanır."
            value={student.house_id ?? ""}
            disabled={updateHouse.isPending}
            onChange={(e) => updateHouse.mutate({ id: student.id, houseId: e.target.value })}
          >
            <SelectItem value="" text="Kol yok" />
            {houses?.map((h) => (
              <SelectItem key={h.id} value={h.id} text={h.name} />
            ))}
          </Select>
      </SectionCard>

      <SectionCard title="Kayıt durumu">
          <Select
            id="student-enrollment-status"
            labelText="Durum"
            helperText="Öğrenci okuldan ayrıldığında “Okuldan ayrıldı” olarak işaretleyin."
            value={student.enrollment_status}
            disabled={updateStatus.isPending}
            onChange={(e) => updateStatus.mutate({ id: student.id, status: e.target.value as StudentEnrollmentStatus })}
          >
            {ENROLLMENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value} text={s.label} />
            ))}
          </Select>
      </SectionCard>
    </>
  );
}
