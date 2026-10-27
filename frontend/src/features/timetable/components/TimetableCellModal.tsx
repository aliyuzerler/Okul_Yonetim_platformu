import { Button, ComposedModal, ModalHeader, ModalBody, ModalFooter } from "@carbon/react";
import type { Subject } from "@/features/curriculum/api/subject";
import type { Teacher } from "@/features/teachers/api/teacher";
import type { Classroom } from "@/features/timetable/api/classroom";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { WEEKDAYS } from "@/shared/lib/timetable";
import { displayName } from "@/shared/lib/name";

interface MutationState {
  isError: boolean;
  error: unknown;
  isPending: boolean;
}

export interface CellForm {
  subjectId: string;
  teacherId: string;
  classroomId: string;
}

interface Props {
  cell: { day: number; period: number } | null;
  form: CellForm;
  onFormChange: (form: CellForm) => void;
  subjects: Subject[];
  teachers: Teacher[];
  onTeacherSearch: (term: string) => void;
  classrooms: Classroom[];
  canClear: boolean;
  save: MutationState;
  clear: MutationState;
  onSave: () => void;
  onClear: () => void;
  onClose: () => void;
}

export default function TimetableCellModal({ cell, form, onFormChange, subjects, teachers, onTeacherSearch, classrooms, canClear, save, clear, onSave, onClear, onClose }: Props) {
  const title = cell ? `${WEEKDAYS.find((d) => d.value === cell.day)?.label} - ${cell.period}. ders` : "";
  return (
    <ComposedModal open={!!cell} size="sm" onClose={onClose} aria-label={title}>
      <ModalHeader title={title} />
      <ModalBody>
        <MutationErrorNotification isError={save.isError} error={save.error} title="Kaydedilemedi" />
        <MutationErrorNotification isError={clear.isError} error={clear.error} title="Temizlenemedi" />
        <div className="os-grid os-gap-4">
          <EntityCombobox id="cell-subject" items={subjects} selectedId={form.subjectId} onSelect={(subjectId) => onFormChange({ ...form, subjectId })} getId={(s) => s.id} itemToString={(s) => s.name} labelText="Ders" placeholder="Derslerde ara…" />
          <EntityCombobox id="cell-teacher" items={teachers} selectedId={form.teacherId} onSelect={(teacherId) => onFormChange({ ...form, teacherId })} onSearch={onTeacherSearch} getId={(t) => t.id} itemToString={(t) => `${displayName(t)} - ${t.employee_number}`} labelText="Öğretmen" placeholder="Öğretmenlerde ara…" />
          <EntityCombobox id="cell-classroom" items={classrooms} selectedId={form.classroomId} onSelect={(classroomId) => onFormChange({ ...form, classroomId })} getId={(c) => c.id} itemToString={(c) => c.name} labelText="Derslik (isteğe bağlı)" placeholder="Dersliklerde ara…" />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button kind="danger--ghost" onClick={onClear} disabled={clear.isPending || !canClear}>Temizle</Button>
        <Button kind="secondary" onClick={onClose}>İptal</Button>
        <Button kind="primary" onClick={onSave} disabled={save.isPending}>{save.isPending ? "Kaydediliyor…" : "Kaydet"}</Button>
      </ModalFooter>
    </ComposedModal>
  );
}
