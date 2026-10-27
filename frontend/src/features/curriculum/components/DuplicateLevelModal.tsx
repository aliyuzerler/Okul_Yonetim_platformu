import type { Dispatch, SetStateAction } from "react";
import { TextInput, Select, SelectItem, NumberInput } from "@carbon/react";
import type { useDuplicateLevel } from "@/features/curriculum/queries/useCurriculum";
import type { useGrades } from "@/features/academics/queries/useGrades";
import type { Level } from "@/features/curriculum/api/curriculum";
import FormModal from "@/shared/ui/FormModal";
import type { LevelForm } from "@/features/curriculum/constants";

interface Props {
  toDuplicate: Level | null;
  dupForm: LevelForm;
  setDupForm: Dispatch<SetStateAction<LevelForm>>;
  dupLabelTouched: boolean;
  setDupLabelTouched: Dispatch<SetStateAction<boolean>>;
  grades: ReturnType<typeof useGrades>["data"];
  duplicateLevel: ReturnType<typeof useDuplicateLevel>;
  onClose: () => void;
  onDuplicate: () => void;
}

export default function DuplicateLevelModal({
  toDuplicate,
  dupForm,
  setDupForm,
  dupLabelTouched,
  setDupLabelTouched,
  grades,
  duplicateLevel,
  onClose,
  onDuplicate,
}: Props) {
  return (
    <FormModal
      open={!!toDuplicate}
      title={`${toDuplicate?.label ?? ""} kopyala`}
      size="md"
      onClose={onClose}
      onSubmit={onDuplicate}
      isPending={duplicateLevel.isPending}
      submitDisabled={!dupForm.label.trim()}
      submitLabel="Kopyala"
      pendingLabel="Kopyalanıyor…"
      isError={duplicateLevel.isError}
      error={duplicateLevel.error}
      errorFallback="Seviye kopyalanamadı"
    >
      <p className="os-text-md os-c-secondary os-mb-4">
        Her seçim grubu ve dersleri yeni seviyeye kopyalanır. Sonrasında birini düzenlemek diğerini
        etkilemez.
      </p>
      <div className="os-grid os-gap-5">
        <TextInput
          id="dup-label"
          labelText="Yeni etiket"
          helperText="Mevcut tüm seviyelerden farklı olmalıdır."
          value={dupForm.label}
          onChange={(e) => setDupForm((f) => ({ ...f, label: e.target.value }))}
          onBlur={() => setDupLabelTouched(true)}
          invalid={dupLabelTouched && !dupForm.label.trim()}
          invalidText="Etiket zorunludur."
        />
        <div className="os-grid os-grid-cols-2-1 os-gap-4">
          <Select
            id="dup-grade"
            labelText="Sınıf seviyesi (isteğe bağlı)"
            value={dupForm.grade_id}
            onChange={(e) => setDupForm((f) => ({ ...f, grade_id: e.target.value }))}
          >
            <SelectItem value="" text="Sınıf seviyesi yok" />
            {grades?.map((g) => (
              <SelectItem key={g.id} value={g.id} text={g.name} />
            ))}
          </Select>
          <NumberInput
            id="dup-sort"
            label="Sıralama"
            min={0}
            value={dupForm.sort_order}
            onChange={(_e, { value }) => setDupForm((f) => ({ ...f, sort_order: Number(value) || 0 }))}
          />
        </div>
      </div>
    </FormModal>
  );
}
