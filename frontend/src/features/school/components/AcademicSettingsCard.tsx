import { NumberInput, Select, SelectItem } from "@carbon/react";
import { GRADE_MIN, GRADE_MAX, gradeRangeErrors } from "@/features/school/lib/gradeRange";

interface Props {
  gradeFrom: number | "";
  gradeTo: number | "";
  editable: boolean;
  onChange: (field: "grade_from" | "grade_to", value: number | "") => void;
}

export default function AcademicSettingsCard({ gradeFrom, gradeTo, editable, onChange }: Props) {
  const { fromOut, toOut, invalid } = gradeRangeErrors(gradeFrom, gradeTo);
  const rangeText = `${GRADE_MIN} ile ${GRADE_MAX} arasında olmalı.`;
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Akademik ayarlar</h2>
      </div>
      <div className="os-section__body">
        <div className="os-grid os-grid-cols-2 os-gap-5 os-mb-5">
          <NumberInput
            id="grade-from"
            label="En düşük sınıf seviyesi"
            helperText="Bu okulun ilk sınıf seviyesi (1–13)."
            min={GRADE_MIN}
            max={GRADE_MAX}
            disabled={!editable}
            invalid={fromOut}
            invalidText={rangeText}
            value={gradeFrom}
            onChange={(_e, { value }) => onChange("grade_from", value === "" ? "" : Number(value))}
          />
          <NumberInput
            id="grade-to"
            label="En yüksek sınıf seviyesi"
            helperText="Bu okulun son sınıf seviyesi (1–13)."
            min={GRADE_MIN}
            max={GRADE_MAX}
            disabled={!editable}
            invalid={invalid}
            invalidText={toOut ? rangeText : "En yüksek sınıf seviyesi en düşük sınıf seviyesinden büyük veya ona eşit olmalı."}
            value={gradeTo}
            onChange={(_e, { value }) => onChange("grade_to", value === "" ? "" : Number(value))}
          />
        </div>
        {/* Disabled until the School model has fields to persist these. */}
        <div className="os-grid os-grid-cols-2 os-gap-5">
          <Select id="timezone" labelText="Saat dilimi" defaultValue="asia_colombo" disabled helperText="Henüz yapılandırılamıyor">
            <SelectItem value="asia_colombo" text="Asia/Colombo (UTC+5:30)" />
            <SelectItem value="utc" text="UTC" />
          </Select>
          <Select id="language" labelText="Varsayılan dil" defaultValue="english" disabled helperText="Henüz yapılandırılamıyor">
            <SelectItem value="english" text="İngilizce" />
            <SelectItem value="sinhala" text="Sinhala" />
            <SelectItem value="tamil" text="Tamil" />
          </Select>
          <Select id="calendar" labelText="Akademik takvim" defaultValue="jan_dec" disabled helperText="Henüz yapılandırılamıyor">
            <SelectItem value="jan_dec" text="Ocak - Aralık" />
            <SelectItem value="sep_aug" text="Eylül - Ağustos" />
          </Select>
          <Select id="grading" labelText="Notlandırma sistemi" defaultValue="percentage" disabled helperText="Henüz yapılandırılamıyor">
            <SelectItem value="percentage" text="Yüzde (0-100)" />
            <SelectItem value="grade" text="Harf notu (A-F)" />
          </Select>
        </div>
      </div>
    </div>
  );
}
