import { SkeletonText } from "@carbon/react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useReviewQueue } from "@/features/timetable/queries/useTimetables";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import TimetableReviewRow from "@/features/timetable/components/TimetableReviewRow";

export default function TimetableReview() {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: queue, isLoading, isError, refetch } = useReviewQueue(currentYear?.id ?? "");

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Ders programı incelemesi</h1>
          <p className="os-page__subtitle">{currentYear?.label ?? "güncel yıl"} için onayınızı bekleyen ders programları.</p>
        </div>
      </div>

      <div className="os-section">
        {isLoading ? (
          <div className="os-p-6">
            <SkeletonText width="40%" />
          </div>
        ) : isError ? (
          <ErrorMessage message="İnceleme kuyruğu yüklenemedi." onRetry={refetch} />
        ) : !queue || queue.length === 0 ? (
          <EmptyState title="İnceleme bekleyen yok" description="Rehber öğretmenliği yaptığınız seviyeler için gönderilen ders programları burada görünecek." />
        ) : (
          queue.map((t) => <TimetableReviewRow key={t.id} timetable={t} />)
        )}
      </div>
    </div>
  );
}
