import { Link } from "react-router";
import { Button, Tag } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import type { MyClass } from "@/features/teachers/queries/useTeachers";
import type { AttendanceSession } from "@/features/attendance/api/attendance";
import { formatLongDate } from "@/shared/lib/date";
import { classLabel } from "@/shared/lib/classLabel";
import GradeAvatar from "@/shared/ui/GradeAvatar";
import ProgressBar from "@/shared/ui/ProgressBar";

// Each of the teacher's classes with today's attendance state and the next step.
export default function TodaysClasses({
  myClasses,
  studentCountByClass,
  todaySessionByClass,
  markedCount,
}: {
  myClasses: MyClass[];
  studentCountByClass: Map<string, number>;
  todaySessionByClass: Map<string, AttendanceSession>;
  markedCount: number;
}) {
  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Bugünün yoklaması</h2>
        <span className="os-text-xs os-c-tertiary">{formatLongDate(new Date())}</span>
      </div>
      {myClasses.length === 0 ? (
        <p className="os-p-6 os-c-tertiary os-text-sm">Henüz atanmış sınıf yok. Ofisten sınıf veya branş öğretmeni olarak eklenmenizi isteyin.</p>
      ) : (
        <>
          <div className="os-teacher-today__progress">
            <ProgressBar value={markedCount} max={myClasses.length} label="Bugün işaretlenen sınıflar" tone={markedCount === myClasses.length ? "success" : "accent"} />
            <span className="os-text-sm os-fw-600 os-nowrap">{myClasses.length} sınıfın {markedCount} tanesi işaretlendi</span>
          </div>
          {myClasses.map((cls) => {
            const session = todaySessionByClass.get(cls.class_id);
            return (
              <div key={cls.class_id} className="os-list-row os-py-3h os-px-6 os-wrap">
                <GradeAvatar gradeName={cls.grade_name} className={cls.class_name} />
                <div className="os-flex-1 os-min-w-0">
                  <div className="os-flex os-items-center os-gap-2 os-mb-h">
                    <span className="os-fw-600 os-text-md os-c-primary">{classLabel(cls.grade_name, cls.class_name)}</span>
                    {cls.isFormTeacher && <Tag type="teal" size="sm">Sınıf öğretmeni</Tag>}
                  </div>
                  <p className="os-m-0 os-text-xs os-c-secondary os-truncate">
                    {cls.subjects.length > 0 ? `${cls.subjects.join(", ")} · ` : ""}{studentCountByClass.get(cls.class_id) ?? 0} öğrenci
                  </p>
                </div>
                <Tag type={session ? "green" : "warm-gray"} size="sm">{session ? "İşaretlendi" : "İşaretlenmedi"}</Tag>
                {session ? (
                  <Button as={Link} to={`/attendance/sessions/${session.id}/mark`} kind="ghost" size="sm" renderIcon={ArrowRight}>
                    Görüntüle
                  </Button>
                ) : (
                  <Button as={Link} to="/t/attendance" kind="tertiary" size="sm" renderIcon={ArrowRight}>
                    Şimdi işaretle
                  </Button>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
