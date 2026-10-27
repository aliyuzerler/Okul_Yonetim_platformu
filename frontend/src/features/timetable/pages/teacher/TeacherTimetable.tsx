import { SkeletonText } from "@carbon/react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useMyTeacherSchedule } from "@/features/timetable/queries/useTimetables";
import TimetableByDay from "@/features/timetable/components/TimetableByDay";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import { classLabel } from "@/shared/lib/classLabel";

export default function TeacherTimetable() {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: schedule, isLoading, isError, refetch } = useMyTeacherSchedule(currentYear?.id ?? "");

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Ders programım</h1>
          <p className="os-page__subtitle">{currentYear?.label ?? ""}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="os-section os-p-6"><SkeletonText width="40%" /></div>
      ) : isError ? (
        <div className="os-section"><ErrorMessage message="Ders programınız yüklenemedi." onRetry={refetch} /></div>
      ) : !schedule?.length ? (
        <div className="os-section"><EmptyState title="Henüz yayınlanmış sınıf yok" description="Bir ders programı yayınlandığında öğretim programınız burada görünecek." /></div>
      ) : (
        <TimetableByDay entries={schedule} asSections getRowId={(_e, i) => String(i)} middle={{ key: "class", header: "Sınıf", render: (e) => classLabel(e.grade_name, e.class_name) }} />
      )}
    </div>
  );
}
