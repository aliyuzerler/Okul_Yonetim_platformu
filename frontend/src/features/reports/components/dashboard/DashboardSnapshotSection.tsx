import { Link } from "react-router";
import { Education, UserMultiple } from "@carbon/icons-react";
import { SkeletonText } from "@carbon/react";
import type { StaffAttendanceRow } from "@/features/attendance/api/staffAttendance";
import ProgressBar from "@/shared/ui/ProgressBar";
import SectionHeader from "@/shared/ui/SectionHeader";

type Props = {
  teachers?: StaffAttendanceRow[];
  nonAcademicStaff?: StaffAttendanceRow[];
  staffLoading: boolean;
};

function StaffAttendanceBlock({ label, rows, Icon, loading }: { label: string; rows?: StaffAttendanceRow[]; Icon: typeof Education; loading: boolean }) {
  const total = rows?.length ?? 0;
  const marked = rows?.filter((member) => !!member.status).length ?? 0;

  return (
    <div className="os-snapshot-block">
      <div className="os-snapshot-heading">
        <div className="os-snapshot-icon"><Icon size={18} /></div>
        <div><strong>{label}</strong><span>Bugün işaretlenen yoklama</span></div>
      </div>
      {loading ? <SkeletonText width="70%" /> : (
        <>
          <div className="os-flex os-justify-between os-text-xs os-mb-1h">
            <span className="os-c-secondary">Bugün işaretlenen</span>
            <strong>{marked} / {total}</strong>
          </div>
          <ProgressBar value={marked} max={total} label={`${label}: bugün işaretlenen`} />
        </>
      )}
    </div>
  );
}

export default function DashboardSnapshotSection({ teachers, nonAcademicStaff, staffLoading }: Props) {
  return (
    <div className="os-section os-dashboard-snapshot">
      <SectionHeader
        title="Personel yoklaması"
        meta={<Link to="/staff-attendance" className="os-text-xs os-no-underline os-c-accent">Yönet →</Link>}
      />
      <div className="os-snapshot-grid">
        <StaffAttendanceBlock label="Öğretmenler" rows={teachers} Icon={Education} loading={staffLoading} />
        <StaffAttendanceBlock label="İdari personel" rows={nonAcademicStaff} Icon={UserMultiple} loading={staffLoading} />
      </div>
    </div>
  );
}
