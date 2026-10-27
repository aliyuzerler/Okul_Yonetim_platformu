import type { Dispatch, SetStateAction } from "react";
import { TextInput, Checkbox } from "@carbon/react";
import type { useCreateAcademicYear } from "@/features/school/queries/useAcademicYears";
import FormModal from "@/shared/ui/FormModal";
import DateField from "@/shared/ui/DateField";

export interface YearForm {
  label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface YearFormTouched {
  label?: boolean;
  start_date?: boolean;
  end_date?: boolean;
}

interface Props {
  open: boolean;
  form: YearForm;
  setForm: Dispatch<SetStateAction<YearForm>>;
  touched: YearFormTouched;
  setTouched: Dispatch<SetStateAction<YearFormTouched>>;
  dateRangeInvalid: boolean;
  isValid: boolean;
  createYear: ReturnType<typeof useCreateAcademicYear>;
  onClose: () => void;
  onCreate: () => void;
}

export default function CreateYearModal({
  open,
  form,
  setForm,
  touched,
  setTouched,
  dateRangeInvalid,
  isValid,
  createYear,
  onClose,
  onCreate,
}: Props) {
  return (
    <FormModal
      open={open}
      title="Yeni eğitim-öğretim yılı"
      onClose={onClose}
      onSubmit={onCreate}
      isPending={createYear.isPending}
      submitDisabled={!isValid}
      submitLabel="Oluştur"
      pendingLabel="Oluşturuluyor…"
      isError={createYear.isError}
      error={createYear.error}
      errorFallback="Eğitim-öğretim yılı oluşturulamadı"
    >
      <div className="os-grid os-gap-4">
        <TextInput
          id="ay-label"
          labelText="Etiket"
          placeholder="örn. 2027"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          onBlur={() => setTouched((t) => ({ ...t, label: true }))}
          invalid={!!touched.label && !form.label.trim()}
          invalidText="Etiket gerekli."
        />
        <DateField value={form.start_date} onChange={(ymd) => setForm((f) => ({ ...f, start_date: ymd }))} id="ay-start"
            labelText="Başlangıç tarihi"
            onBlur={() => setTouched((t) => ({ ...t, start_date: true }))}
            invalid={!!touched.start_date && !form.start_date}
            invalidText="Başlangıç tarihi gerekli." />
        <DateField value={form.end_date} onChange={(ymd) => setForm((f) => ({ ...f, end_date: ymd }))} id="ay-end"
            labelText="Bitiş tarihi"
            onBlur={() => setTouched((t) => ({ ...t, end_date: true }))}
            invalid={!!touched.end_date && (!form.end_date || dateRangeInvalid)}
            invalidText={dateRangeInvalid ? "Bitiş tarihi başlangıç tarihinden sonra olmalı." : "Bitiş tarihi gerekli."} />
        <Checkbox
          id="ay-current"
          labelText="Güncel eğitim-öğretim yılı olarak ayarla"
          checked={form.is_current}
          onChange={(_e, { checked }) => setForm((f) => ({ ...f, is_current: checked }))}
        />
      </div>
    </FormModal>
  );
}
