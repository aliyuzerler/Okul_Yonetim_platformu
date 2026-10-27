import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { TextInput, NumberInput, Select, SelectItem } from "@carbon/react";
import { Enterprise } from "@carbon/icons-react";
import LogoUpload from "@/features/school/components/LogoUpload";
import StepShell from "@/features/school/components/setup/StepShell";
import { GRADE_MIN, GRADE_MAX, type SchoolFormState } from "@/features/school/setupConstants";
import { EMAIL_RE } from "@/shared/lib/validation";
import { isValidSriLankanPhone, PHONE_INVALID_TEXT } from "@/shared/lib/phone";

interface Props {
  school: SchoolFormState;
  setSchool: Dispatch<SetStateAction<SchoolFormState>>;
  schoolTouched: boolean;
  gradeRangeInvalid: boolean;
}

export default function SchoolStep({ school, setSchool, schoolTouched, gradeRangeInvalid }: Props) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const showError = (field: string) => schoolTouched || !!touched[field];
  const gradeFromInvalid = school.grade_from === "" || Number(school.grade_from) < GRADE_MIN || Number(school.grade_from) > GRADE_MAX;
  const gradeToInvalid = school.grade_to === "" || Number(school.grade_to) < GRADE_MIN || Number(school.grade_to) > GRADE_MAX;

  return (
    <StepShell icon={Enterprise} title="Okul bilgileri" subtitle="Temel bilgiler; gerisini daha sonra Ayarlar bölümünden doldurabilirsiniz.">
      <div className="os-school-details-form">
        <TextInput
          id="ss-name"
          labelText="Okul adı"
          placeholder="örn. Royal College"
          value={school.name}
          onChange={(e) => setSchool((s) => ({ ...s, name: e.target.value }))}
          onBlur={() => setTouched((fields) => ({ ...fields, name: true }))}
          invalid={showError("name") && !school.name.trim()}
          invalidText="Okul adı gerekli."
          autoComplete="organization"
        />
        <div className="os-school-details-form__two-column">
          <TextInput
            id="ss-phone"
          labelText="Telefon"
          placeholder="0778449056 veya 0112123123"
          helperText="10 haneli bir Sri Lanka cep veya sabit telefon numarası kullanın."
          type="tel"
          inputMode="tel"
          value={school.phone}
          onChange={(e) => setSchool((s) => ({ ...s, phone: e.target.value }))}
          onBlur={() => setTouched((fields) => ({ ...fields, phone: true }))}
          invalid={showError("phone") && (!school.phone.trim() || !isValidSriLankanPhone(school.phone))}
          invalidText={school.phone.trim() ? PHONE_INVALID_TEXT : "Telefon numarası gerekli."}
          autoComplete="tel"
        />
          <TextInput
            id="ss-email"
          labelText="E-posta"
          type="email"
          placeholder="office@yourschool.lk"
          helperText="Geçerli bir okul e-posta adresi girin."
          value={school.email}
          onChange={(e) => setSchool((s) => ({ ...s, email: e.target.value }))}
          onBlur={() => setTouched((fields) => ({ ...fields, email: true }))}
          invalid={showError("email") && !EMAIL_RE.test(school.email.trim())}
          invalidText="Geçerli bir e-posta adresi girin."
          autoComplete="email"
          />
        </div>
        <TextInput
          id="ss-address"
          labelText="Adres"
          value={school.address}
          onChange={(e) => setSchool((s) => ({ ...s, address: e.target.value }))}
          onBlur={() => setTouched((fields) => ({ ...fields, address: true }))}
          invalid={showError("address") && !school.address.trim()}
          invalidText="Adres gerekli."
          autoComplete="street-address"
        />
        <LogoUpload
          value={school.logo_url}
          editing
          onChange={(v) => setSchool((s) => ({ ...s, logo_url: v }))}
        />
        <Select
          id="ss-school-type"
          labelText="Okul türü"
          helperText="Tek cinsiyetli okullar kayıt sırasında öğrenci cinsiyetini denetler."
          value={school.school_type}
          onChange={(e) =>
            setSchool((s) => ({ ...s, school_type: e.target.value as "boys" | "girls" | "mixed" }))
          }
        >
          <SelectItem value="mixed" text="Karma" />
          <SelectItem value="boys" text="Erkek" />
          <SelectItem value="girls" text="Kız" />
        </Select>
        <div className="os-school-details-form__two-column">
          <NumberInput
            id="ss-grade-from"
            label="En düşük sınıf seviyesi"
            min={GRADE_MIN}
            max={GRADE_MAX}
            invalid={showError("grade_from") && (gradeFromInvalid || gradeRangeInvalid)}
            invalidText={gradeFromInvalid ? `${GRADE_MIN} ile ${GRADE_MAX} arasında bir sınıf seviyesi girin.` : "En yüksek sınıf seviyesinden büyük olamaz."}
            value={school.grade_from}
            onChange={(_e, { value }) =>
              setSchool((s) => ({ ...s, grade_from: value === "" ? "" : Number(value) }))
            }
            onBlur={() => setTouched((fields) => ({ ...fields, grade_from: true }))}
          />
          <NumberInput
            id="ss-grade-to"
            label="En yüksek sınıf seviyesi"
            min={GRADE_MIN}
            max={GRADE_MAX}
            invalid={showError("grade_to") && (gradeToInvalid || gradeRangeInvalid)}
            invalidText={gradeToInvalid ? `${GRADE_MIN} ile ${GRADE_MAX} arasında bir sınıf seviyesi girin.` : "En düşük sınıf seviyesinden küçük olamaz."}
            value={school.grade_to}
            onChange={(_e, { value }) =>
              setSchool((s) => ({ ...s, grade_to: value === "" ? "" : Number(value) }))
            }
            onBlur={() => setTouched((fields) => ({ ...fields, grade_to: true }))}
          />
        </div>
      </div>
    </StepShell>
  );
}
