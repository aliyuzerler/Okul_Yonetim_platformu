import { UserRole } from "@carbon/icons-react";
import type { PositionSummary } from "@/features/positions/api/position";

function reachText(summary: PositionSummary): string {
  if (summary.rank_label === "Principal") return "Tüm okulu bilgilendirebilirsiniz.";
  if (summary.rank_label === "Vice Principal") {
    return summary.notify_whole_school
      ? "Tüm okul kapsamında bildirim gönderme yetkisi size verildi."
      : "Atanmış sınıf seviyelerinizi bilgilendirebilirsiniz.";
  }
  return "Atanmış sınıf seviyenizi ve o seviyenin öğretmenlerini bilgilendirebilirsiniz.";
}

// Only for Principal, Vice Principal and Section Head; a class teacher's reach is already obvious.
export default function LeadershipPanel({ summary }: { summary: PositionSummary }) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title os-flex os-items-center os-gap-2">
          <UserRole size={16} className="os-fill-accent" /> Liderlik
        </h2>
      </div>
      <div className="os-py-4 os-px-6">
        <p className="os-m-0 os-text-sm os-c-secondary os-lh-normal">{reachText(summary)}</p>
      </div>
    </div>
  );
}
