import { Link } from "react-router";
import { CheckmarkFilled, CircleOutline, ChevronRight } from "@carbon/icons-react";
import ProgressBar from "@/shared/ui/ProgressBar";

export interface SetupChecklistItem {
  label: string;
  done: boolean;
  path: string;
}

export default function SetupChecklistCard({ items }: { items: SetupChecklistItem[] }) {
  const doneCount = items.filter((i) => i.done).length;
  const nextItem = items.find((item) => !item.done);
  const progress = Math.round((doneCount / items.length) * 100);
  if (doneCount === items.length) return null;

  return (
    <div className="os-setup-checklist os-mb-6">
      <div className="os-setup-checklist__header">
        <div className="os-setup-checklist__heading">
          <div className="os-setup-checklist__icon"><CheckmarkFilled size={20} /></div>
          <div>
            <p className="os-eyebrow">İlk adımlar</p>
            <h2>Kurulumu tamamlayın</h2>
            <p>Okulunuzu günlük kullanıma hazırlamak için bu temel adımları tamamlayın.</p>
          </div>
        </div>
        <div className="os-setup-checklist__progress-label"><strong>{progress}%</strong><span>{items.length} adımdan {doneCount} tamamlandı</span></div>
      </div>
      <div className="os-setup-checklist__bar"><ProgressBar value={doneCount} max={items.length} label="Kurulum ilerlemesi" /></div>
      {nextItem && <p className="os-setup-checklist__next">Sıradaki: <Link to={nextItem.path}>{nextItem.label}</Link></p>}
      <div className="os-setup-checklist__items">
        {items.map((item) => (
          <Link key={item.label} to={item.path} className={`os-setup-checklist__item${item.done ? " is-complete" : ""}`}>
            <span className="os-setup-checklist__status">
              {item.done ? <CheckmarkFilled size={16} /> : <CircleOutline size={16} />}
            </span>
            <span className="os-setup-checklist__item-label">{item.label}</span>
            {!item.done && <ChevronRight size={16} className="os-setup-checklist__arrow" />}
          </Link>
        ))}
      </div>
    </div>
  );
}
