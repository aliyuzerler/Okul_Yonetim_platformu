import { Link } from "react-router";
import type { AttendanceSession } from "@/features/attendance/api/attendance";
import DataGrid from "@/shared/ui/DataGrid";
import SessionCountCell from "@/features/attendance/components/SessionCountCell";
import EmptyState from "@/shared/ui/EmptyState";
import { formatDayMonthYear } from "@/shared/lib/date";

type Row = { session: AttendanceSession; className: string };

export default function RecentSessions({ sessions }: { sessions: Row[] }) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Son oturumlar</h2>
        <Link to="/t/attendance" className="os-text-xs os-c-accent os-no-underline">Tümünü gör →</Link>
      </div>
      {sessions.length === 0 ? (
        <EmptyState title="Henüz yoklama oturumu yok" description="Aldığınız oturumlar burada görünecek." />
      ) : (
        <DataGrid
          rows={sessions}
          getRowId={(r) => r.session.id}
          pagination={false}
          columns={[
            { key: "date", header: "Tarih", render: (r) => <span className="os-text-sm os-c-secondary">{formatDayMonthYear(r.session.date)}</span> },
            { key: "class", header: "Sınıf", render: (r) => <Link to={`/attendance/sessions/${r.session.id}/mark`} className="os-table__link">{r.className}</Link> },
            { key: "present", header: "Mevcut", render: (r) => <SessionCountCell count={r.session.present_count} status="present" /> },
            { key: "absent", header: "Devamsız", render: (r) => <SessionCountCell count={r.session.absent_count} status="absent" /> },
            { key: "late", header: "Geç", render: (r) => <SessionCountCell count={r.session.late_count} status="late" /> },
          ]}
        />
      )}
    </div>
  );
}
