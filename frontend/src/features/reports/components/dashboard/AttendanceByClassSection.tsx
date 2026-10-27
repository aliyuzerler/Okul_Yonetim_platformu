import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button, ComposedModal, ModalBody, ModalFooter, ModalHeader, SkeletonText } from "@carbon/react";
import { CheckmarkFilled, ChevronRight, EventSchedule, WarningFilled } from "@carbon/icons-react";
import type { ClassWithDetails } from "@/features/academics/api/class";
import type { DailySession } from "@/features/attendance/api/attendance";
import EmptyState from "@/shared/ui/EmptyState";
import ProgressBar from "@/shared/ui/ProgressBar";
import SectionHeader from "@/shared/ui/SectionHeader";
import MediumTag from "@/shared/ui/MediumTag";
import GradeAvatar from "@/shared/ui/GradeAvatar";
import { gradeBand } from "@/shared/lib/gradeBand";

function ClassAttendanceBox({ cls, session }: { cls: ClassWithDetails; session: DailySession | undefined }) {
  const hasSession = !!session;
  const isMarked = !!session && session.marked_count > 0;

  return (
    <Link
      to={`/classes/${cls.id}`}
      state={{ tab: "attendance" }}
      className="os-attendance-class-card os-block os-no-underline os-bg-layer os-border os-transition"
      style={{ borderTopColor: hasSession ? (isMarked ? "var(--os-success)" : "var(--os-warning)") : "var(--os-text-disabled)" }}
    >
      <div className="os-flex os-items-start os-justify-between os-mb-3">
        <div className="os-flex os-items-center os-gap-3 os-min-w-0">
          <GradeAvatar gradeName={cls.grade_name} className={cls.name} />
          <div className="os-min-w-0">
            <p className="os-mt-0 os-mx-0 os-mb-h os-text-md os-fw-600 os-c-primary">{cls.name}</p>
            {cls.medium_name && <MediumTag name={cls.medium_name} />}
          </div>
        </div>
        {hasSession ? (
          isMarked ? <CheckmarkFilled size={18} className="os-fill-success os-shrink-0" aria-label="Yoklama işaretlendi" /> : <WarningFilled size={18} className="os-fill-warning os-shrink-0" aria-label="Yoklama bekliyor" />
        ) : <EventSchedule size={18} className="os-fill-disabled os-shrink-0" aria-label="Oturum yok" />}
      </div>

      {hasSession ? (
        <>
          <div className="os-flex os-justify-between os-text-xs os-mb-1h">
            <span className="os-c-secondary">{isMarked ? "Bugün işaretlendi" : "Bugün bekliyor"}</span>
            <span className="os-fw-600 os-c-primary">{session.marked_count} / {session.enrolled_count}</span>
          </div>
          <ProgressBar size="sm" value={session.marked_count} max={session.enrolled_count} tone={isMarked ? "success" : "warning"} label={`${cls.name}: işaretlenen öğrenci`} />
        </>
      ) : <p className="os-m-0 os-text-xs os-c-tertiary">Bugün oturum yok</p>}
    </Link>
  );
}

function GradeGridSkeleton() {
  return (
    <div className="os-attendance-grade-grid os-py-5 os-px-6">
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="os-attendance-grade-card"><SkeletonText width="55%" /><SkeletonText width="35%" /></div>)}
    </div>
  );
}

export default function AttendanceByClassSection({
  classes,
  loading,
  sessionByClassId,
}: {
  classes: ClassWithDetails[] | undefined;
  loading: boolean;
  sessionByClassId: Map<string, DailySession>;
}) {
  const [selectedGradeName, setSelectedGradeName] = useState<string | null>(null);
  const grades = useMemo(() => {
    const grouped = new Map<string, ClassWithDetails[]>();
    for (const cls of classes ?? []) grouped.set(cls.grade_name, [...(grouped.get(cls.grade_name) ?? []), cls]);
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([name, gradeClasses]) => ({ name, classes: gradeClasses }));
  }, [classes]);
  const selectedGrade = grades.find((grade) => grade.name === selectedGradeName) ?? null;

  return (
    <div className="os-section">
      <SectionHeader
        title="Sınıf seviyesine göre yoklama"
        meta={<Link to="/attendance" className="os-text-xs os-no-underline os-c-accent">Yönet →</Link>}
      />
      {loading ? <GradeGridSkeleton /> : !classes || classes.length === 0 ? (
        <EmptyState title="Henüz sınıf yok" description="Yoklama almaya başlamak için bir sınıf ekleyin." action={<Link to="/classes/new" className="os-text-sm os-fw-500 os-c-accent">Sınıf ekle →</Link>} />
      ) : (
        <div className="os-attendance-grade-grid os-py-5 os-px-6">
          {grades.map((grade) => {
            const marked = grade.classes.filter((cls) => sessionByClassId.get(cls.id)?.marked_count).length;
            const pending = grade.classes.filter((cls) => {
              const session = sessionByClassId.get(cls.id);
              return !!session && session.marked_count === 0;
            }).length;
            return (
              <button key={grade.name} type="button" className={`os-attendance-grade-card os-grade-band--${gradeBand(grade.name)}`} onClick={() => setSelectedGradeName(grade.name)} aria-label={`${grade.name} yoklamasını görüntüle`}>
                <div className="os-flex os-items-start os-justify-between os-gap-3">
                  <GradeAvatar gradeName={grade.name} size="lg" />
                  <ChevronRight size={20} className="os-fill-accent os-shrink-0" />
                </div>
                <p className="os-attendance-grade-card__classes">{grade.classes.length} sınıf</p>
                <div className="os-attendance-grade-card__summary">
                  <span><strong>{marked}</strong> işaretlendi</span>
                  <span><strong>{pending}</strong> bekliyor</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <ComposedModal open={!!selectedGrade} size="lg" onClose={() => setSelectedGradeName(null)} aria-label={selectedGrade ? `${selectedGrade.name} yoklaması` : "Sınıf seviyesi yoklaması"}>
        <ModalHeader title={selectedGrade ? `${selectedGrade.name} yoklaması` : "Sınıf seviyesi yoklaması"} />
        <ModalBody>
          <p className="os-mt-0 os-mb-4 os-text-sm os-c-secondary">Bugünün sınıf bazında yoklaması. Yoklamayı görüntülemek veya yönetmek için bir sınıf seçin.</p>
          {selectedGrade && <div className="os-attendance-class-grid">{selectedGrade.classes.map((cls) => <ClassAttendanceBox key={cls.id} cls={cls} session={sessionByClassId.get(cls.id)} />)}</div>}
        </ModalBody>
        <ModalFooter><Button kind="secondary" onClick={() => setSelectedGradeName(null)}>Kapat</Button></ModalFooter>
      </ComposedModal>
    </div>
  );
}
