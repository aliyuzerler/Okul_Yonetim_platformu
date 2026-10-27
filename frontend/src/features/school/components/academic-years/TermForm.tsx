import { Button, TextInput } from "@carbon/react";
import { Checkmark, Add } from "@carbon/icons-react";
import type { Term } from "@/features/school/api/term";
import { isDateRangeInvalid } from "@/shared/lib/date";
import type { TermFormValues, TermTouched } from "@/features/school/lib/termForm";
import DateField from "@/shared/ui/DateField";

interface Props {
  form: TermFormValues;
  onChange: (form: TermFormValues) => void;
  touched: TermTouched;
  onTouch: (field: keyof TermFormValues) => void;
  editing: Term | null;
  isSaving: boolean;
  onSubmit: () => void;
  onCancelEdit: () => void;
}

// Inline add / edit form under the term list.
export default function TermForm({ form, onChange, touched, onTouch, editing, isSaving, onSubmit, onCancelEdit }: Props) {
  const rangeInvalid = isDateRangeInvalid(form.start_date, form.end_date);
  // Remounting the pickers on term switch makes flatpickr pick up the prefilled value.
  const pickerKey = editing?.id ?? "new";
  return (
    <div className="os-grid os-gap-3">
      {editing && <p className="os-m-0 os-text-xs os-fw-600 os-c-primary">Düzenleniyor: {editing.name}</p>}
      <TextInput
        id="term-name"
        labelText="Dönem adı"
        placeholder="örn. 1. Dönem"
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        onBlur={() => onTouch("name")}
        invalid={!!touched.name && !form.name.trim()}
        invalidText="Ad gerekli."
      />
      <DateField key={`start-${pickerKey}`} value={form.start_date} onChange={(ymd) => onChange({ ...form, start_date: ymd })} id="term-start" labelText="Başlangıç tarihi" onBlur={() => onTouch("start_date")} invalid={!!touched.start_date && !form.start_date} invalidText="Başlangıç tarihi gerekli." />
      <DateField key={`end-${pickerKey}`} value={form.end_date} onChange={(ymd) => onChange({ ...form, end_date: ymd })} id="term-end"
          labelText="Bitiş tarihi"
          onBlur={() => onTouch("end_date")}
          invalid={!!touched.end_date && (!form.end_date || rangeInvalid)}
          invalidText={rangeInvalid ? "Bitiş tarihi başlangıç tarihinden sonra olmalı." : "Bitiş tarihi gerekli."} />
      <div className="os-flex os-gap-2">
        <Button kind="ghost" size="sm" renderIcon={editing ? Checkmark : Add} onClick={onSubmit} disabled={isSaving}>
          {isSaving ? (editing ? "Kaydediliyor…" : "Ekleniyor…") : editing ? "Değişiklikleri kaydet" : "Dönem ekle"}
        </Button>
        {editing && <Button kind="ghost" size="sm" onClick={onCancelEdit} disabled={isSaving}>İptal</Button>}
      </div>
    </div>
  );
}
