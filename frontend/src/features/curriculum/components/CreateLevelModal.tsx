import type { Dispatch, SetStateAction } from "react";
import { TextInput, Select, SelectItem, NumberInput } from "@carbon/react";
import type { useCreateLevel } from "@/features/curriculum/queries/useCurriculum";
import type { useGrades } from "@/features/academics/queries/useGrades";
import FormModal from "@/shared/ui/FormModal";
import type { LevelForm } from "@/features/curriculum/constants";

interface Props {
  open: boolean;
  form: LevelForm;
  setForm: Dispatch<SetStateAction<LevelForm>>;
  labelTouched: boolean;
  setLabelTouched: Dispatch<SetStateAction<boolean>>;
  grades: ReturnType<typeof useGrades>["data"];
  createLevel: ReturnType<typeof useCreateLevel>;
  onClose: () => void;
  onCreate: () => void;
}

export default function CreateLevelModal({
  open,
  form,
  setForm,
  labelTouched,
  setLabelTouched,
  grades,
  createLevel,
  onClose,
  onCreate,
}: Props) {
  return (
    <FormModal
      open={open}
      title="Yeni seviye"
      onClose={onClose}
      onSubmit={onCreate}
      isPending={createLevel.isPending}
      submitDisabled={!form.label.trim()}
      submitLabel="Oluştur"
      pendingLabel="Oluşturuluyor…"
      isError={createLevel.isError}
      error={createLevel.error}
      errorFallback="Seviye oluşturulamadı"
    >
      <div className="os-grid os-gap-4">
        <TextInput
          id="level-label"
          labelText="Etiket"
          placeholder="örn. 10. sınıf veya Physical Science"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          onBlur={() => setLabelTouched(true)}
          invalid={labelTouched && !form.label.trim()}
          invalidText="Etiket zorunludur."
        />
        <Select
          id="level-grade"
          labelText="Sınıf seviyesi (isteğe bağlı)"
          helperText="Bu seviyeyi bir sınıf seviyesine bağlayın veya birden fazla sınıf seviyesine yayılan izlekler için boş bırakın."
          value={form.grade_id}
          onChange={(e) => setForm((f) => ({ ...f, grade_id: e.target.value }))}
        >
          <SelectItem value="" text="Sınıf seviyesi yok" />
          {grades?.map((g) => (
            <SelectItem key={g.id} value={g.id} text={g.name} />
          ))}
        </Select>
        <NumberInput
          id="level-sort"
          label="Sıralama"
          min={0}
          value={form.sort_order}
          onChange={(_e, { value }) => setForm((f) => ({ ...f, sort_order: Number(value) || 0 }))}
        />
      </div>
    </FormModal>
  );
}
