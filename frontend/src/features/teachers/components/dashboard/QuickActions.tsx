import { Link } from "react-router";
import { EventSchedule, UserMultiple, Notification, ArrowRight } from "@carbon/icons-react";
import type { PositionRankLabel } from "@/features/positions/api/position";

function notifyDescription(rankLabel: PositionRankLabel, notifyWholeSchool: boolean): string {
  if (notifyWholeSchool) return "Tüm okulu bilgilendirin";
  switch (rankLabel) {
    case "Section Head":
      return "Atanmış sınıf seviyelerinizi bilgilendirin";
    case "Class Teacher":
      return "Sınıfınızı ve velilerini bilgilendirin";
    case "Subject Teacher":
      return "Dersinizdeki öğrencileri bilgilendirin";
    default:
      return "Kapsamlı bir duyuru gönderin";
  }
}

export default function QuickActions({
  rankLabel,
  notifyWholeSchool,
}: {
  rankLabel: PositionRankLabel;
  notifyWholeSchool: boolean;
}) {
  const actions = [
    { label: "Yoklama al", desc: "Bugünün oturumunu kaydedin", path: "/t/attendance", Icon: EventSchedule },
    { label: "Sınıflarım", desc: "Sınıf listelerini görüntüleyin", path: "/t/classes", Icon: UserMultiple },
    { label: "Bildirim gönder", desc: notifyDescription(rankLabel, notifyWholeSchool), path: "/t/notifications", Icon: Notification },
  ];

  return (
    <div className="os-section">
      <div className="os-section__header"><h2 className="os-section__title">Hızlı işlemler</h2></div>
      <div className="os-p-3">
        {actions.map(({ label, desc, path, Icon }) => (
          <Link key={label} to={path} className="os-no-underline">
            <div className="os-quick-action">
              <Icon size={20} className="os-fill-accent os-shrink-0" />
              <div className="os-flex-1">
                <p className="os-mt-0 os-mx-0 os-mb-h os-fw-600 os-text-sm os-c-primary">{label}</p>
                <p className="os-m-0 os-text-xs os-c-secondary">{desc}</p>
              </div>
              <ArrowRight size={14} className="os-fill-tertiary" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
