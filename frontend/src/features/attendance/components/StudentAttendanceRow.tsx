import StatusTag from "@/shared/ui/StatusTag";
import type { Student } from "@/features/students/api/student";
import { STATUS_STYLES, type Status } from "@/features/attendance/constants";
import StatusButton from "@/features/attendance/components/StatusButton";
import Avatar from "@/shared/ui/Avatar";
import { displayName } from "@/shared/lib/name";

// Durum kodları backend'den gelir; görünen etiketler yerel haritadan Türkçedir (shared/ etiketleri İngilizce kalır).
const STATUS_TR: Record<"present" | "absent" | "late" | "excused", string> = {
  present: "Mevcut",
  absent: "Devamsız",
  late: "Geç",
  excused: "İzinli",
};

export default function StudentAttendanceRow({
  student,
  idx,
  status,
  note,
  readOnly,
  onMark,
  onNoteChange,
}: {
  student: Student;
  idx: number;
  status: Status;
  note: string;
  readOnly: boolean;
  onMark: (status: NonNullable<Status>) => void;
  onNoteChange: (value: string) => void;
}) {
  return (
    <tr style={{ background: status ? `color-mix(in srgb, ${STATUS_STYLES[status].bg} 40%, white)` : "transparent" }}>
      <td className="os-c-tertiary os-mono os-text-xs">
        {idx + 1}
      </td>
      <td>
        <div className="os-flex os-items-center os-gap-2h">
          <Avatar name={student.full_name} size="sm" />
          <span className="os-fw-500 os-text-md" title={student.full_name}>{displayName(student)}</span>
        </div>
      </td>
      <td className="os-table__mono" data-label="Okul no.">{student.index_number}</td>
      <td data-label="Yoklama">
        {readOnly ? (
          status ? (
            <StatusTag {...STATUS_STYLES[status]} label={STATUS_TR[status]} />
          ) : (
            <span className="os-c-disabled os-text-xs">İşaretlenmedi</span>
          )
        ) : (
          <div className="os-flex os-gap-1h os-wrap">
            {(["present", "absent", "late", "excused"] as const).map((s) => (
              <StatusButton key={s} value={s} selected={status === s} onClick={() => onMark(s)} />
            ))}
          </div>
        )}
      </td>
      <td data-label="Açıklama">
        {readOnly ? (
          <span className={`os-text-xs ${note ? "os-c-secondary" : "os-c-disabled"}`}>{note || "-"}</span>
        ) : status === "absent" || status === "late" || status === "excused" ? (
          <input
            className="os-note-input"
            placeholder="İsteğe bağlı açıklama…"
            aria-label={`${displayName(student)} için açıklama`}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
          />
        ) : (
          <span className="os-c-disabled os-text-xs">-</span>
        )}
      </td>
    </tr>
  );
}
