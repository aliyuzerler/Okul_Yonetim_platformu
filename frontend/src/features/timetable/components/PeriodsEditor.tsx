import { useState } from "react";
import { Button, TextInput, ComposedModal, ModalHeader, ModalBody, ModalFooter, SkeletonText } from "@carbon/react";
import {
  useGradeSectionPeriods,
  useSaveGradeSectionPeriods,
  useRegenerateGradeSectionPeriods,
} from "@/features/timetable/queries/useGradeSections";
import type { GradeSection, TimetablePeriod } from "@/features/timetable/api/gradeSection";
import EmptyState from "@/shared/ui/EmptyState";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

const formatTimeForInput = (t: string) => {
  if (!t) return "";
  return t.slice(0, 5);
};

export default function PeriodsEditor({ section, onClose }: { section: GradeSection; onClose: () => void }) {
  const { data: periods, isLoading } = useGradeSectionPeriods(section.id);
  const save = useSaveGradeSectionPeriods(section.id);
  const regenerate = useRegenerateGradeSectionPeriods(section.id);
  const [rows, setRows] = useState<Omit<TimetablePeriod, "id">[] | null>(null);

  const active = rows ?? periods ?? [];

  const updateRow = (index: number, patch: Partial<TimetablePeriod>) => {
    const next = [...active];
    next[index] = { ...next[index], ...patch };
    setRows(next);
  };

  const handleSave = () => {
    if (!rows) return;
    save.mutate(rows, { onSuccess: () => setRows(null) });
  };

  const busy = save.isPending || regenerate.isPending;

  return (
    <ComposedModal open size="md" onClose={onClose} aria-label={`${section.name} - ders saati düzeni`}>
      <ModalHeader title={`${section.name} - ders saati düzeni`} />
      <ModalBody>
        <MutationErrorNotification
          isError={save.isError}
          error={save.error}
          title="Ders saatleri kaydedilemedi" className="os-mb-4"
        />
        <MutationErrorNotification
          isError={regenerate.isError}
          error={regenerate.error}
          title="Ders saatleri yeniden üretilemedi" className="os-mb-4"
        />
        <div className="os-mb-4 os-flex os-justify-end">
          <Button
            kind="ghost"
            size="sm"
            onClick={() => regenerate.mutate(undefined, { onSuccess: () => setRows(null) })}
            disabled={busy}
          >
            {regenerate.isPending ? "Yeniden üretiliyor…" : "Ders programı ayarlarından yeniden üret"}
          </Button>
        </div>
        {isLoading ? (
          <SkeletonText width="60%" />
        ) : active.length === 0 ? (
          <EmptyState
            title="Ders saati yapılandırılmamış"
            description="Bu eğitim-öğretim yılı için ders programı ayarlarını yapılandırın, sonra yeniden üretin."
          />
        ) : (
          <table className="os-table">
            <thead>
              <tr>
                <th>Tür</th>
                <th>Ders saati no</th>
                <th>Başlangıç</th>
                <th>Bitiş</th>
              </tr>
            </thead>
            <tbody>
              {active.map((p, i) => (
                <tr key={i} style={p.slot_type === "interval" ? { background: "var(--os-status-late-bg)" } : undefined}>
                  <td>{p.slot_type === "interval" ? "Teneffüs" : "Ders saati"}</td>
                  <td>{p.period_number ?? "-"}</td>
                  <td>
                    <TextInput
                      id={`start-${i}`}
                      labelText={`${p.slot_type === "interval" ? "Teneffüs" : "Ders saati"} ${i + 1} başlangıç saati`}
                      hideLabel
                      type="time"
                      size="sm"
                      value={formatTimeForInput(p.start_time)}
                      disabled={busy}
                      onChange={(e) => updateRow(i, { start_time: e.target.value })}
                    />
                  </td>
                  <td>
                    <TextInput
                      id={`end-${i}`}
                      labelText={`${p.slot_type === "interval" ? "Teneffüs" : "Ders saati"} ${i + 1} bitiş saati`}
                      hideLabel
                      type="time"
                      size="sm"
                      value={formatTimeForInput(p.end_time)}
                      disabled={busy}
                      onChange={(e) => updateRow(i, { end_time: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose}>
          Kapat
        </Button>
        <Button kind="primary" onClick={handleSave} disabled={!rows || busy}>
          {save.isPending ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
}
