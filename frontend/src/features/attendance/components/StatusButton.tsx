import { CheckmarkFilled, CloseFilled, Time, Certificate } from "@carbon/icons-react";
import type { Status } from "@/features/attendance/constants";

const STATUS_ICONS = { present: CheckmarkFilled, absent: CloseFilled, late: Time, excused: Certificate };

// Durum kodları backend'den gelir; görünen etiketler yerel haritadan Türkçedir (shared/ etiketleri İngilizce kalır).
const STATUS_TR: Record<"present" | "absent" | "late" | "excused", string> = {
  present: "Mevcut",
  absent: "Devamsız",
  late: "Geç",
  excused: "İzinli",
};

export default function StatusButton({
  value,
  selected,
  onClick,
}: {
  value: NonNullable<Status>;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = STATUS_ICONS[value];
  const className = selected ? `os-status-toggle os-status-toggle--selected os-status-toggle--${value}` : "os-status-toggle";
  return (
    <button className={className} onClick={onClick} aria-pressed={selected}>
      <Icon size={12} />
      {STATUS_TR[value]}
    </button>
  );
}
