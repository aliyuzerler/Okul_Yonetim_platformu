import { NumberInput, TextInput } from "@carbon/react";
import FormModal from "@/shared/ui/FormModal";

export interface SubjectForm {
  name: string;
  code: string;
  type: string;
  max_marks: number;
}

interface Props {
  form: SubjectForm;
  onChange: (form: SubjectForm) => void;
  touched: { name?: boolean; code?: boolean };
  onTouch: (field: "name" | "code") => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: () => void;
}

export default function EditSubjectModal({ form, onChange, touched, onTouch, isPending, isError, error, onClose, onSubmit }: Props) {
  return (
    <FormModal open title="Dersi düzenle" onClose={onClose} onSubmit={onSubmit} isPending={isPending} submitDisabled={!form.name.trim() || !form.code.trim()} isError={isError} error={error} errorFallback="Ders güncellenemedi">
      <div className="os-grid os-gap-4">
        <TextInput id="edit-subject-name" labelText="Ders adı" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} onBlur={() => onTouch("name")} invalid={!!touched.name && !form.name.trim()} invalidText="Ders adı zorunludur." />
        <TextInput id="edit-subject-code" labelText="Ders kodu" value={form.code} onChange={(e) => onChange({ ...form, code: e.target.value })} onBlur={() => onTouch("code")} invalid={!!touched.code && !form.code.trim()} invalidText="Ders kodu zorunludur." />
        <TextInput id="edit-subject-type" labelText="Tür (isteğe bağlı)" helperText="Yalnızca açıklayıcı bir etiket; örn. core, language, aesthetic" value={form.type} onChange={(e) => onChange({ ...form, type: e.target.value })} />
        <NumberInput id="edit-subject-max-marks" label="En yüksek puan" min={1} max={1000} value={form.max_marks} onChange={(_e, { value }) => onChange({ ...form, max_marks: Number(value ?? 100) })} helperText="Öğrencinin bu dersten alabileceği en yüksek puan." />
      </div>
    </FormModal>
  );
}
