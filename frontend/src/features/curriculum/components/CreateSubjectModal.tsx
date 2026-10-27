import { useState } from "react";
import { NumberInput, TextInput } from "@carbon/react";
import type { Subject } from "@/features/curriculum/api/subject";
import { useCreateSubject } from "@/features/curriculum/queries/useSubjects";
import FormModal from "@/shared/ui/FormModal";

interface Props {
  open: boolean;
  subjects: Subject[];
  onClose: () => void;
}

export default function CreateSubjectModal({ open, subjects, onClose }: Props) {
  const createSubject = useCreateSubject();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("");
  const [maxMarks, setMaxMarks] = useState(100);
  const [touched, setTouched] = useState({ name: false, code: false });

  const duplicateName = subjects.some((subject) => subject.name.trim().toLowerCase() === name.trim().toLowerCase());
  const duplicateCode = subjects.some((subject) => subject.code.trim().toLowerCase() === code.trim().toLowerCase());
  const nameInvalid = touched.name && !name.trim();
  const codeInvalid = touched.code && !code.trim();
  const isValid = !!name.trim() && !!code.trim() && !duplicateName && !duplicateCode && Number.isFinite(maxMarks) && maxMarks > 0 && maxMarks <= 999.99;

  const reset = () => {
    setName("");
    setCode("");
    setType("");
    setMaxMarks(100);
    setTouched({ name: false, code: false });
    createSubject.reset();
  };

  const close = () => {
    reset();
    onClose();
  };

  const save = () => {
    setTouched({ name: true, code: true });
    if (!isValid) return;
    createSubject.mutate(
      { name: name.trim(), code: code.trim(), type: type.trim(), max_marks: maxMarks },
      { onSuccess: close },
    );
  };

  return (
    <FormModal
      open={open}
      title="Ders ekle"
      onClose={close}
      onSubmit={save}
      isPending={createSubject.isPending}
      submitDisabled={!isValid}
      submitLabel="Dersi kaydet"
      pendingLabel="Ders kaydediliyor…"
      isError={createSubject.isError}
      error={createSubject.error}
      errorTitle="Ders kaydedilemedi"
      errorFallback="Ders adını ve kodunu kontrol edin, sonra yeniden deneyin."
    >
      <div className="os-grid os-gap-4">
        <TextInput
          id="create-subject-name"
          labelText="Ders adı"
          placeholder="örn. Matematik"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => setTouched((value) => ({ ...value, name: true }))}
          invalid={nameInvalid || duplicateName}
          invalidText={duplicateName ? "Bu adla bir ders zaten var." : "Ders adı zorunludur."}
        />
        <TextInput
          id="create-subject-code"
          labelText="Ders kodu"
          placeholder="örn. MATH-01"
          helperText="Ders kataloğu genelinde benzersiz olmalıdır."
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onBlur={() => setTouched((value) => ({ ...value, code: true }))}
          invalid={codeInvalid || duplicateCode}
          invalidText={duplicateCode ? "Bu ders kodu zaten kullanılıyor." : "Ders kodu zorunludur."}
        />
        <TextInput
          id="create-subject-type"
          labelText="Tür (isteğe bağlı)"
          placeholder="örn. core, language, aesthetic"
          value={type}
          onChange={(event) => setType(event.target.value)}
        />
        <NumberInput
          id="create-subject-max-marks"
          label="En yüksek puan"
          min={1}
          max={999.99}
          value={maxMarks}
          onChange={(_event, { value }) => setMaxMarks(Number(value ?? 100))}
          helperText="Öğrencinin bu dersten alabileceği en yüksek puan."
        />
      </div>
    </FormModal>
  );
}
