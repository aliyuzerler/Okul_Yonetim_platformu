import type { Dispatch, SetStateAction } from "react";
import { TextInput, NumberInput } from "@carbon/react";
import type { useCreateSelectionGroup, useUpdateSelectionGroup } from "@/features/curriculum/queries/useCurriculum";
import FormModal from "@/shared/ui/FormModal";

export interface GroupForm {
  label: string;
  min_select: number;
  max_select: number;
  sort_order: number;
}

interface Props {
  groupModal: "create" | "edit" | null;
  groupForm: GroupForm;
  setGroupForm: Dispatch<SetStateAction<GroupForm>>;
  createGroup: ReturnType<typeof useCreateSelectionGroup>;
  updateGroup: ReturnType<typeof useUpdateSelectionGroup>;
  onClose: () => void;
  onSave: () => void;
}

export default function GroupFormModal({
  groupModal,
  groupForm,
  setGroupForm,
  createGroup,
  updateGroup,
  onClose,
  onSave,
}: Props) {
  const groupFormValid = groupForm.label.trim() && groupForm.max_select >= groupForm.min_select;

  return (
    <FormModal
      open={!!groupModal}
      title={groupModal === "create" ? "Yeni seçim grubu" : "Grubu düzenle"}
      onClose={onClose}
      onSubmit={onSave}
      isPending={createGroup.isPending || updateGroup.isPending}
      submitDisabled={!groupFormValid}
      isError={createGroup.isError || updateGroup.isError}
      error={createGroup.error ?? updateGroup.error}
      errorFallback="Grup kaydedilemedi"
    >
      <div className="os-grid os-gap-4">
        <TextInput
          id="group-label"
          labelText="Etiket"
          placeholder="örn. Zorunlu veya Sepet 1"
          value={groupForm.label}
          onChange={(e) => setGroupForm((f) => ({ ...f, label: e.target.value }))}
        />
        <NumberInput
          id="group-min"
          label="En az ders sayısı"
          min={0}
          value={groupForm.min_select}
          onChange={(_e, { value }) => setGroupForm((f) => ({ ...f, min_select: Number(value) || 0 }))}
        />
        <NumberInput
          id="group-max"
          label="En çok ders sayısı"
          min={0}
          invalid={groupForm.max_select < groupForm.min_select}
          invalidText="En çok değeri en az değerinden büyük veya ona eşit olmalıdır."
          value={groupForm.max_select}
          onChange={(_e, { value }) => setGroupForm((f) => ({ ...f, max_select: Number(value) || 0 }))}
        />
        <NumberInput
          id="group-sort"
          label="Sıralama"
          min={0}
          value={groupForm.sort_order}
          onChange={(_e, { value }) => setGroupForm((f) => ({ ...f, sort_order: Number(value) || 0 }))}
        />
      </div>
    </FormModal>
  );
}
