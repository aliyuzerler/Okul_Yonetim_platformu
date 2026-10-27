import { useState } from "react";
import { Tag, SkeletonText, Pagination, Button, IconButton, InlineNotification } from "@carbon/react";
import { Add, Close } from "@carbon/icons-react";
import { Link } from "react-router";
import { useTeachers, useTeacherSubjects, useAssignTeacherSubject, useRemoveTeacherSubject } from "@/features/teachers/queries/useTeachers";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import { useDebounced } from "@/shared/hooks/useDebounced";
import type { Teacher, TeacherSubject } from "@/features/teachers/api/teacher";
import type { Subject } from "@/features/curriculum/api/subject";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import AssignTeacherSubjectModal from "@/features/teachers/components/AssignTeacherSubjectModal";
import FilterBar from "@/shared/ui/FilterBar";
import SectionCard from "@/shared/ui/SectionCard";
import Avatar from "@/shared/ui/Avatar";
import { displayName } from "@/shared/lib/name";

function TeacherSubjectRow({ teacher, allSubjects }: { teacher: Teacher; allSubjects: Subject[] }) {
  const { data: assignedSubjects, isLoading, isError } = useTeacherSubjects(teacher.id);
  const assignMutation = useAssignTeacherSubject(teacher.id);
  const removeMutation = useRemoveTeacherSubject(teacher.id);
  const [subjectToRemove, setSubjectToRemove] = useState<TeacherSubject | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const confirmRemove = () => {
    if (!subjectToRemove) return;
    removeMutation.mutate(subjectToRemove.id);
  };

  const assignedIds = new Set(assignedSubjects?.map((s) => s.id) ?? []);
  const assignableSubjects = allSubjects.filter((s) => !assignedIds.has(s.id));

  return (
    <tr>
      <td>
        <div className="os-flex os-items-center os-gap-2">
          <Avatar name={teacher.full_name} size="sm" />
          <span className="os-fw-500" title={teacher.full_name}>{displayName(teacher)}</span>
        </div>
      </td>
      <td className="os-table__mono">{teacher.employee_number}</td>
      <td>
        {isLoading ? (
          <SkeletonText width="6rem" />
        ) : isError ? (
          <span className="os-c-danger os-text-md">Dersler yüklenemedi</span>
        ) : !assignedSubjects || assignedSubjects.length === 0 ? (
          <span className="os-text-md os-c-tertiary">Atanmış ders yok</span>
        ) : (
          <div className="os-flex os-items-center os-wrap os-gap-2">
            {assignedSubjects.map((s) => (
              <div key={s.id} className="os-flex os-items-center os-gap-1">
                <Tag type="blue" size="sm">{s.name}</Tag>
                <IconButton
                  label={`${s.name} dersini kaldır`}
                  kind="ghost"
                  size="sm"
                  onClick={() => setSubjectToRemove(s)}
                >
                  <Close size={14} />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </td>
      <td>
        <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => setAssignOpen(true)} disabled={assignableSubjects.length === 0}>
          Ders ata
        </Button>
        {assignableSubjects.length === 0 && !isLoading && !isError && (
          <p role="status" className="os-m-0 os-mt-1 os-text-xs os-c-tertiary">Tüm dersler atandı</p>
        )}
        {assignMutation.isError && (
          <div className="os-c-danger os-text-xs os-mt-1">
            Ders atanamadı
          </div>
        )}
        {removeMutation.isError && (
          <div className="os-c-danger os-text-xs os-mt-1">
            Ders kaldırılamadı
          </div>
        )}
      </td>
      <ConfirmDeleteModal
        open={!!subjectToRemove}
        title="Dersi kaldır"
        description={
          <>
             <strong>{subjectToRemove?.name}</strong> dersi, {displayName(teacher)} adlı öğretmenin
            atamalarından kaldırılsın mı?
          </>
        }
        confirmLabel="Kaldır"
        pendingLabel="Kaldırılıyor…"
        subject="Ders"
        successVerb="kaldırıldı"
        mutation={removeMutation}
        onClose={() => setSubjectToRemove(null)}
        onConfirm={confirmRemove}
      />
      <AssignTeacherSubjectModal
        open={assignOpen}
        teacher={teacher}
        subjects={assignableSubjects}
        mutation={assignMutation}
        onClose={() => setAssignOpen(false)}
      />
    </tr>
  );
}

export default function TeacherSubjects() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounced(searchQuery, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Server-paginated and server-searched (docs/SECURITY_AND_PERFORMANCE_PLAYBOOK.md
  // section 4) - a client-side filter over a capped page could neither find
  // nor act on a teacher past the first page.
  const { data: teacherPage, isLoading: loadingTeachers, isError: teachersError, refetch: refetchTeachers } = useTeachers({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: debouncedSearch,
  });
  const teachers = teacherPage?.items ?? [];
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  // Search is server-side. Keep the retained page visible while the debounced
  // request is in flight instead of filtering stale results with the new term.
  const visibleTeachers = teachers;
  const totalItems = teacherPage?.total ?? 0;
  const { data: subjects, isLoading: loadingSubjects, isError: subjectsError, refetch: refetchSubjects } = useSubjects();

  if (loadingSubjects) {
    return <LoadingSpinner />;
  }

  if (teachersError) {
    return <ErrorMessage message="Öğretmenler yüklenemedi." onRetry={refetchTeachers} />;
  }

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Öğretmen dersleri</h1>
          <p className="os-page__subtitle">Her öğretmenin girmeye yetkili olduğu dersler.</p>
        </div>
      </div>

      {subjectsError ? (
        <div className="os-flex os-items-start os-gap-3 os-mb-6">
          <InlineNotification
            kind="error"
            title="Ders kataloğu yüklenemedi"
            subtitle="Öğretmen kayıtları aşağıda görüntülenmeye devam eder. Kataloğu yeniden deneyin veya önce Dersler ve müfredat bölümünden dersleri oluşturup kaydedin."
            lowContrast
            className="os-flex-1 os-m-0"
          />
          <Button kind="ghost" size="sm" onClick={() => refetchSubjects()}>Yeniden dene</Button>
        </div>
      ) : subjects && subjects.length === 0 ? (
        <div className="os-flex os-items-start os-gap-3 os-mb-6">
          <InlineNotification
            kind="info"
            title="Öğretmen atamadan önce ders ekleyin"
            subtitle="Dersler ve müfredat bölümünü açın, ilgili sınıf seviyesi gruplarını yapılandırın ve dersleri kaydedin. Dersler daha sonra öğretmen atamalarında burada görünecek."
            lowContrast
            className="os-flex-1 os-m-0"
          />
          <Button kind="ghost" size="sm" as={Link} to="/subjects">Dersler ve müfredata git</Button>
        </div>
      ) : null}

      <FilterBar
        search={{
          value: searchQuery,
          onChange: (value) => { setSearchQuery(value); setPage(1); },
          placeholder: "Öğretmeni ad veya sicil numarasına göre ara…",
        }}
      />

      <SectionCard
        title="Öğretmen yetkinlikleri"
        meta={!loadingTeachers && (
          <span className="os-section__meta">
            {normalizedSearch ? `${totalItems} eşleşen` : `${totalItems} öğretmen`}
          </span>
        )}
        flush
      >
        <table className="os-table">
          <thead>
            <tr>
              <th>Öğretmen</th>
              <th>Sicil no.</th>
              <th>Atanmış dersler</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {loadingTeachers ? (
              <tr>
                <td colSpan={4} className="os-text-center os-c-tertiary os-p-8">
                  <SkeletonText width="8rem" />
                </td>
              </tr>
            ) : visibleTeachers.length === 0 ? (
              <tr>
                <td colSpan={4} className="os-text-center os-c-tertiary os-p-8">
                  Aramanızla eşleşen öğretmen bulunamadı.
                </td>
              </tr>
            ) : (
              visibleTeachers.map((t) => (
                <TeacherSubjectRow key={t.id} teacher={t} allSubjects={subjects ?? []} />
              ))
            )}
          </tbody>
        </table>

        {!loadingTeachers && totalItems > 0 && (
          <Pagination
            totalItems={totalItems}
            page={page}
            pageSize={pageSize}
            pageSizes={[25, 50, 100]}
            onChange={({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); }}
            size="sm"
          />
        )}
      </SectionCard>
    </div>
  );
}
