import { Link } from "react-router";
import { Button, Tag } from "@carbon/react";
import { Add, UserMultiple } from "@carbon/icons-react";
import type { useClass, useUnenrollStudent } from "@/features/academics/queries/useClasses";
import type { useStudentsByClass } from "@/features/students/queries/useStudents";
import type { Student } from "@/features/students/api/student";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import DataGrid from "@/shared/ui/DataGrid";
import EmptyState from "@/shared/ui/EmptyState";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import SectionCard from "@/shared/ui/SectionCard";
import { displayName } from "@/shared/lib/name";

interface Props {
  cls: NonNullable<ReturnType<typeof useClass>["data"]>;
  students: ReturnType<typeof useStudentsByClass>["data"];
  studentsLoading: boolean;
  unenrollStudent: ReturnType<typeof useUnenrollStudent>;
  onOpenEnrol: () => void;
  onRequestUnenroll: (student: Student) => void;
}

const GENDER_LABELS: Record<string, string> = {
  male: "Erkek",
  female: "Kız",
  other: "Diğer",
};

export default function StudentsTab({
  cls,
  students,
  studentsLoading,
  unenrollStudent,
  onOpenEnrol,
  onRequestUnenroll,
}: Props) {
  return (
    <SectionCard
      className="os-mt-4"
      flush
      title="Kayıtlı öğrenciler"
      meta={
        <Button renderIcon={Add} kind="ghost" size="sm" onClick={onOpenEnrol}>
          Öğrenci kaydet
        </Button>
      }
    >

      <MutationErrorNotification
        isError={unenrollStudent.isError}
        error={unenrollStudent.error}
        title="Öğrenci çıkarılamadı"
        fallback="Lütfen yeniden deneyin."
        onClose={() => unenrollStudent.reset()} className="os-mt-0 os-mx-6 os-mb-4"
      />

      {studentsLoading ? (
        <LoadingSpinner />
      ) : students && students.length > 0 ? (
        <DataGrid
          rows={students}
          getRowId={(s) => s.id}
          pageSize={20}
          columns={[
            { key: "n", header: "#", render: (s) => <span className="os-table__mono">{students.indexOf(s) + 1}</span> },
            {
              key: "name",
              header: "Ad",
              render: (s) => (
                <>
                  <Link to={`/students/${s.id}`} className="os-table__link" title={s.full_name}>{displayName(s)}</Link>
                  {s.id === cls.girl_monitor_id && <Tag type="magenta" size="sm" className="os-ml-2">Kız temsilci</Tag>}
                  {s.id === cls.boy_monitor_id && <Tag type="blue" size="sm" className="os-ml-2">Erkek temsilci</Tag>}
                </>
              ),
            },
            { key: "index", header: "Okul no.", render: (s) => <span className="os-table__mono">{s.index_number}</span> },
            { key: "gender", header: "Cinsiyet", render: (s) => <span className="os-table__muted">{s.gender ? GENDER_LABELS[s.gender] ?? s.gender : "-"}</span> },
            { key: "actions", header: "İşlemler", align: "end", render: (s) => <Button kind="danger--ghost" size="sm" onClick={() => onRequestUnenroll(s)}>Çıkar</Button> },
          ]}
        />
      ) : (
        <EmptyState
          title="Kayıtlı öğrenci yok"
          description="Bu okuldan bir öğrenciyi sınıfa kaydedin."
          action={
            <Button renderIcon={Add} kind="primary" onClick={onOpenEnrol}>
              Öğrenci kaydet
            </Button>
          }
        />
      )}

      <div className="os-py-3 os-px-6 os-border-t os-flex os-items-center os-gap-2 os-text-sm os-c-secondary"
      >
        <UserMultiple size={14} className="os-fill-tertiary" />
        {students?.length ?? 0} öğrenci kayıtlı
      </div>
    </SectionCard>
  );
}
