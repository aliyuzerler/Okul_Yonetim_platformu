interface Props {
  summary: { present: number; absent: number; late: number; excused: number; unmarked: number };
}

const CARDS = [
  { key: "present", label: "Mevcut", color: "var(--os-status-present-border)" },
  { key: "absent", label: "Devamsız", color: "var(--os-status-absent-border)" },
  { key: "late", label: "Geç", color: "var(--os-status-late-text)" },
  { key: "excused", label: "İzinli", color: "var(--os-status-excused-text)" },
  { key: "unmarked", label: "İşaretlenmedi", color: "var(--os-text-secondary)" },
] as const;

export default function AttendanceSummaryCards({ summary }: Props) {
  return (
    <div className="os-grid os-grid-cols-5 os-gap-3 os-mb-6">
      {CARDS.map(({ key, label, color }) => (
        <div key={key} className="os-stat-card os-py-3h os-px-4" style={{ borderTopColor: color }}>
          <p className="os-stat-card__label os-mb-1">{label}</p>
          <p className="os-m-0 os-text-3xl os-fw-300 os-c-primary">{summary[key]}</p>
        </div>
      ))}
    </div>
  );
}
