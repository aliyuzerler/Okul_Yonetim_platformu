import { useState } from "react";
import { Button, Tag } from "@carbon/react";
import { UserFollow } from "@carbon/icons-react";
import { useClassSubjectTeachers, useAssignSubjectTeacher } from "@/features/academics/queries/useClasses";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { usePublishedTimetableForClass } from "@/features/timetable/queries/useTimetables";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import DataGrid from "@/shared/ui/DataGrid";
import EmptyState from "@/shared/ui/EmptyState";
import SectionCard from "@/shared/ui/SectionCard";
import AssignClassSubjectTeacherModal from "@/features/academics/components/AssignClassSubjectTeacherModal";

export default function SubjectsTab({ classId, academicYearId }: { classId: string; academicYearId: string }) {
  const { data: assignments, isLoading } = useClassSubjectTeachers(classId);
  const { data: subjects } = useSubjects();
  const assignSubjectTeacher = useAssignSubjectTeacher(classId);
  const { data: published } = usePublishedTimetableForClass(classId, academicYearId);
  const [modalOpen, setModalOpen] = useState(false);

  // A pairing counts as scheduled once the published timetable has it on the grid.
  const scheduledSubjectIds = new Set(
    (published?.entries ?? []).filter((e) => e.subject_id && e.teacher_id).map((e) => e.subject_id)
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="os-mt-4">
      <SectionCard
        flush
        title="Dersler ve öğretmenler"
        meta={
          <Button renderIcon={UserFollow} size="sm" onClick={() => { assignSubjectTeacher.reset(); setModalOpen(true); }}>
            Branş öğretmeni ata
          </Button>
        }
      >
        <div>
          {!assignments || assignments.length === 0 ? (
            <div className="os-p-8">
              <EmptyState
                title="Henüz ders atanmadı"
                description="Not girişi ve ders programı yapılandırmasını etkinleştirmek için derslere öğretmen atayın."
              />
            </div>
          ) : (
            <DataGrid
              rows={assignments}
              getRowId={(a) => a.subject_id}
              pagination={false}
              columns={[
                { key: "subject", header: "Ders", render: (a) => <span className="os-fw-500">{a.subject_name}</span> },
                { key: "code", header: "Ders kodu", render: (a) => <span className="os-table__mono">{a.subject_code}</span> },
                { key: "teacher", header: "Atanan öğretmen", render: (a) => a.teacher_name },
                { key: "timetable", header: "Ders programı", render: (a) => (scheduledSubjectIds.has(a.subject_id) ? <Tag type="green" size="sm">Programda</Tag> : <Tag type="gray" size="sm">Programda değil</Tag>) },
              ]}
            />
          )}
        </div>
      </SectionCard>

      {/* Mounted only while open, so each opening starts blank. */}
      {modalOpen && (
        <AssignClassSubjectTeacherModal
          open
          subjects={subjects}
          assignSubjectTeacher={assignSubjectTeacher}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
