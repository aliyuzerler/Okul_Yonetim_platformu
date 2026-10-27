import { Button, TextInput, MultiSelect, ComposedModal, ModalHeader, ModalBody, ModalFooter } from "@carbon/react";
import type { Grade } from "@/features/academics/api/grade";
import type { GradeSectionForm } from "@/features/timetable/constants";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

export default function SectionFormModal({
  open,
  isEdit,
  form,
  onFormChange,
  grades,
  selectedGradeIds,
  onSelectedGradeIdsChange,
  onClose,
  onSubmit,
  isPending,
  isError,
  error,
}: {
  open: boolean;
  isEdit: boolean;
  form: GradeSectionForm;
  onFormChange: (form: GradeSectionForm) => void;
  grades: Grade[] | undefined;
  selectedGradeIds: string[];
  onSelectedGradeIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
}) {
  return (
    <ComposedModal open={open} size="md" onClose={onClose} aria-label={isEdit ? "Seviye şubesini düzenle" : "Yeni seviye şubesi"}>
      <ModalHeader title={isEdit ? "Seviye şubesini düzenle" : "Yeni seviye şubesi"} />
      <ModalBody>
        <MutationErrorNotification
          isError={isError}
          error={error} className="os-mb-4"
        />
        <div className="os-grid os-gap-4">
          <TextInput
            id="section-name"
            labelText="Şube adı"
            placeholder="örn. Ortaokul"
            value={form.name}
            onChange={(e) => onFormChange({ ...form, name: e.target.value })}
          />
          <div className="os-grid os-grid-cols-2 os-gap-4">
            <TextInput
              id="section-interval-start"
              labelText="Teneffüs başlangıcı"
              type="time"
              value={form.interval_start_time}
              onChange={(e) => onFormChange({ ...form, interval_start_time: e.target.value })}
            />
            <TextInput
              id="section-interval-end"
              labelText="Teneffüs bitişi"
              type="time"
              value={form.interval_end_time}
              onChange={(e) => onFormChange({ ...form, interval_end_time: e.target.value })}
            />
          </div>
          <MultiSelect
            id="section-grades"
            titleText="Bu şubedeki sınıf seviyeleri"
            label="Sınıf seviyeleri seçin…"
            items={grades ?? []}
            itemToString={(g) => g?.name ?? ""}
            selectedItems={(grades ?? []).filter((g) => selectedGradeIds.includes(g.id))}
            onChange={({ selectedItems }) => onSelectedGradeIdsChange((selectedItems ?? []).map((g) => g.id))}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          İptal
        </Button>
        <Button kind="primary" onClick={onSubmit} disabled={!form.name.trim() || isPending}>
          {isPending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
