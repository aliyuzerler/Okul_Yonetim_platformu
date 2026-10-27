import { useNavigate } from "react-router";
import { Tag, SkeletonText } from "@carbon/react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useTimetablesForLeadership } from "@/features/timetable/queries/useTimetables";
import { TIMETABLE_STATUS_TAG } from "@/shared/lib/constants/tags";
import DataGrid from "@/shared/ui/DataGrid";
import { formatDateTime } from "@/shared/lib/date";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";

const statusTag = (s: string) => TIMETABLE_STATUS_TAG[s as keyof typeof TIMETABLE_STATUS_TAG];

// Read-only monitoring view of every class timetable for the Principal and Vice Principal.
export default function TeacherTimetables() {
  const navigate = useNavigate();
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: timetables, isLoading, isError, refetch } = useTimetablesForLeadership();

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Tüm ders programları</h1>
          <p className="os-page__subtitle">{currentYear?.label ?? "güncel eğitim-öğretim yılı"} için tüm sınıf ders programları.</p>
        </div>
      </div>

      <div className="os-section">
        {isLoading ? (
          <div className="os-p-6"><SkeletonText width="40%" /></div>
        ) : isError ? (
          <ErrorMessage message="Ders programları yüklenemedi." onRetry={refetch} />
        ) : !timetables?.length ? (
          <EmptyState title="Henüz ders programı yok" description="Bu eğitim-öğretim yılı için henüz sınıf ders programı oluşturulmadı." />
        ) : (
          <DataGrid
            rows={timetables}
            getRowId={(t) => t.id}
            pageSize={20}
            onRowClick={(t) => navigate(`/timetables/${t.id}`)}
            columns={[
              { key: "grade", header: "Sınıf seviyesi", render: (t) => t.grade_name },
              { key: "class", header: "Sınıf", render: (t) => t.class_name },
              { key: "version", header: "Sürüm", render: (t) => `v${t.version}` },
              { key: "status", header: "Durum", render: (t) => <Tag type={statusTag(t.status)?.type ?? "gray"} size="sm">{statusTag(t.status)?.label ?? t.status}</Tag> },
              { key: "updated", header: "Son güncelleme", render: (t) => formatDateTime(t.updated_at) },
            ]}
          />
        )}
      </div>
    </div>
  );
}
