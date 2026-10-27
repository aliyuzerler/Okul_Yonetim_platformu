import type { Dispatch, SetStateAction } from "react";
import { TextInput, Select, SelectItem, NumberInput } from "@carbon/react";
import type { useUpdateLevel } from "@/features/curriculum/queries/useCurriculum";
import type { useGrades } from "@/features/academics/queries/useGrades";
import type { Level } from "@/features/curriculum/api/curriculum";
import FormModal from "@/shared/ui/FormModal";
import type { LevelForm } from "@/features/curriculum/constants";

interface Props {
  toEdit: Level | null;
  editForm: LevelForm;
  setEditForm: Dispatch<SetStateAction<LevelForm>>;
  editLabelTouched: boolean;
  setEditLabelTouched: Dispatch<SetStateAction<boolean>>;
  grades: ReturnType<typeof useGrades>["data"];
  updateLevel: ReturnType<typeof useUpdateLevel>;
  onClose: () => void;
  onSave: () => void;
}

export default function EditLevelModal({
  toEdit,
  editForm,
  setEditForm,
  editLabelTouched,
  setEditLabelTouched,
  grades,
  updateLevel,
  onClose,
  onSave,
}: Props) {
  return (
    <FormModal
      open={!!toEdit}
      title={`${toEdit?.label ?? ""} düzenle`}
      size="md"
      onClose={onClose}
      onSubmit={onSave}
      isPending={updateLevel.isPending}
      submitDisabled={!editForm.label.trim()}
      submitLabel="Değişiklikleri kaydet"
      isError={updateLevel.isError}
      error={updateLevel.error}
      errorFallback="Seviye güncellenemedi"
    >
      <p className="os-text-md os-c-secondary os-mb-4">
        Seviyenin adını değiştirmek seçim gruplarına ve öğrenci seçimlerine dokunmaz - yalnızca etiket, sınıf seviyesi bağlantısı
        ve sıralama değişir.
      </p>
      <div className="os-grid os-gap-5">
        <TextInput
          id="edit-label"
          labelText="Etiket"
          value={editForm.label}
          onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
          onBlur={() => setEditLabelTouched(true)}
          invalid={editLabelTouched && !editForm.label.trim()}
          invalidText="Etiket zorunludur."
        />
        <div className="os-grid os-grid-cols-2-1 os-gap-4">
          <Select
            id="edit-grade"
            labelText="Sınıf seviyesi (isteğe bağlı)"
            value={editForm.grade_id}
            onChange={(e) => setEditForm((f) => ({ ...f, grade_id: e.target.value }))}
          >
            <SelectItem value="" text="Sınıf seviyesi yok" />
            {grades?.map((g) => (
              <SelectItem key={g.id} value={g.id} text={g.name} />
            ))}
          </Select>
          <NumberInput
            id="edit-sort"
            label="Sıralama"
            min={0}
            value={editForm.sort_order}
            onChange={(_e, { value }) => setEditForm((f) => ({ ...f, sort_order: Number(value) || 0 }))}
          />
        </div>
      </div>
    </FormModal>
  );
}
