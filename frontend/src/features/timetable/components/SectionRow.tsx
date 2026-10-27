import { Time } from "@carbon/icons-react";
import { Button, Tag } from "@carbon/react";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import type { GradeSection } from "@/features/timetable/api/gradeSection";

export default function SectionRow({
  section,
  gradeName,
  onPeriods,
  onEdit,
  onDelete,
}: {
  section: GradeSection;
  gradeName: (id: string) => string;
  onPeriods: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const s = section;
  return (
    <div className="os-list-row os-col os-items-stretch os-py-4 os-px-6">
      <div className="os-flex os-items-center os-justify-between os-mb-2">
        <div className="os-flex os-items-center os-gap-2">
          <Time size={16} className="os-fill-accent" />
          <span className="os-fw-600 os-text-md">{s.name}</span>
          <span className="os-text-xs os-c-tertiary">
            Teneffüs {s.interval_start_time}–{s.interval_end_time}
          </span>
        </div>
        <div className="os-flex os-gap-2">
          <Button kind="ghost" size="sm" onClick={onPeriods}>
            Ders saatleri
          </Button>
          <Button kind="ghost" size="sm" onClick={onEdit}>
            Düzenle
          </Button>
          <RemoveIconButton label="Sil" onClick={onDelete} />
        </div>
      </div>

      <div className="os-flex os-wrap os-gap-1h">
        {s.grade_ids.length === 0 ? (
          <span className="os-text-xs os-c-tertiary">Atanmış sınıf seviyesi yok</span>
        ) : (
          s.grade_ids.map((gid) => (
            <Tag key={gid} type="teal" size="sm">
              {gradeName(gid)}
            </Tag>
          ))
        )}
      </div>
    </div>
  );
}
