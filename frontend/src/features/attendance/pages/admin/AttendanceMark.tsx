import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Button, Tag, InlineNotification, TextInput, Pagination } from "@carbon/react";
import { ArrowLeft, Save, Search, UserMultiple, Warning } from "@carbon/icons-react";
import { getErrorMessage } from "@/shared/api/errors";
import { isLockedAfter24Hours } from "@/shared/lib/date";
import { useSession, useSessionRecords, useMarkAttendance } from "@/features/attendance/queries/useAttendance";
import { useClass } from "@/features/academics/queries/useClasses";
import { useStudentsByClass } from "@/features/students/queries/useStudents";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useRole } from "@/shared/auth/useRole";
import { useAttendanceMarking } from "@/features/attendance/hooks/useAttendanceMarking";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import AttendanceSummaryCards from "@/features/attendance/components/AttendanceSummaryCards";
import StudentAttendanceRow from "@/features/attendance/components/StudentAttendanceRow";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import UnsavedChangesModal from "@/shared/ui/UnsavedChangesModal";
import ConfirmActionModal from "@/shared/ui/ConfirmActionModal";
import { useToast } from "@/shared/ui/toast/useToast";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

const HEADERS = ["#", "Öğrenci", "Okul no.", "Yoklama", "Açıklama"];

// Durum kodları backend'den gelir; görünen etiketler yerel haritadan Türkçedir.
const STATUS_TR: Record<"present" | "absent" | "late" | "excused", string> = {
  present: "Mevcut",
  absent: "Devamsız",
  late: "Geç",
  excused: "İzinli",
};

export default function AttendanceMark() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { role } = useRole();
  const { showToast } = useToast();

  const { data: session, isLoading: sessionLoading, isError: sessionError } = useSession(id);
  const { data: records, isLoading: recordsLoading } = useSessionRecords(id);
  const { data: cls } = useClass(session?.class_id ?? "");
  usePageTitle(cls ? `Yoklama al: ${cls.name}` : null);
  const { data: students, isLoading: studentsLoading } = useStudentsByClass(session?.class_id ?? "");
  const { data: grades } = useGrades();
  const markAttendance = useMarkAttendance(id);
  const marking = useAttendanceMarking(id, records, students);
  const unsavedGuard = useUnsavedChangesGuard(marking.hasUnsaved);

  const [search, setSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(50);
  const [bulkStatus, setBulkStatus] = useState<"absent" | null>(null);
  const [reason, setReason] = useState("");

  const isAdmin = role === "admin";
  const locked = isLockedAfter24Hours(session?.created_at);
  const readOnly = locked && !isAdmin;
  const isOverride = locked && isAdmin;
  const backPath = role === "teacher" ? "/t/attendance" : "/attendance";
  const gradeName = grades?.find((g) => g.id === cls?.grade_id)?.name;
  const teacherName = session?.taken_by_name;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (students ?? []).filter((s) => s.full_name.toLowerCase().includes(q) || s.name_with_initials.toLowerCase().includes(q) || s.index_number.toLowerCase().includes(q));
  }, [students, search]);
  const visibleStudents = useMemo(
    () => filtered.slice((studentPage - 1) * studentPageSize, studentPage * studentPageSize),
    [filtered, studentPage, studentPageSize],
  );

  const save = () => {
    markAttendance.mutate(
      { ...marking.toRequest(), reason: isOverride ? reason.trim() || undefined : undefined },
      { onSuccess: () => { marking.clearDraft(); marking.markSaved(); showToast({ kind: "success", title: "Yoklama kaydedildi" }); navigate(backPath); } },
    );
  };

  if (sessionLoading) return <LoadingSpinner />;
  if (sessionError || !session) {
    return (
      <div className="os-p-8">
        <ErrorMessage message="Yoklama oturumu yüklenemedi" />
      </div>
    );
  }

  return (
    <div className="os-bg-layer-hover os-min-h-content">
      <div className="os-py-5 os-px-8 os-flex os-items-center os-gap-6 os-wrap os-border-b">
        <div className="os-flex-1">
          <div className="os-flex os-items-center os-gap-2 os-mb-1">
            <span className="os-text-lg os-fw-600 os-c-primary">{cls?.name ?? "…"} sınıfı</span>
            {gradeName && <Tag type="blue" size="sm">{gradeName}</Tag>}
          </div>
          <div className="os-flex os-gap-6 os-wrap">
            {teacherName && <span className="os-text-sm os-c-secondary">{teacherName}</span>}
            <span className="os-text-sm os-c-secondary">{session.date}</span>
          </div>
        </div>
        <Button renderIcon={ArrowLeft} kind="ghost" size="sm" onClick={() => unsavedGuard.guard(() => navigate(backPath))}>Geri</Button>
      </div>

      <div className="os-py-6 os-px-8">
        {readOnly && (
          <InlineNotification kind="warning" title="Bu oturum kilitli" subtitle="Oturumun alınmasının üzerinden 24 saatten fazla zaman geçti. Düzenlemek için bir yöneticiyle iletişime geçin." lowContrast hideCloseButton className="os-max-w-full os-mb-6" />
        )}
        {isOverride && (
          <InlineNotification kind="info" title="Kilitli oturum düzenleniyor" subtitle="Bu oturumun üzerinden 24 saatten fazla zaman geçti. Yönetici olarak düzenlemeye devam edebilirsiniz. Aşağıya bir gerekçe yazın; değişiklik denetim kaydına işlenir." lowContrast hideCloseButton className="os-max-w-full os-mb-6" />
        )}

        <AttendanceSummaryCards summary={marking.summary} />

        <div className="os-section">
          <div className="os-flex os-items-center os-gap-3 os-py-3h os-px-6 os-border-b os-wrap">
            <div className="os-search os-max-w-px-280">
              <Search size={16} className="os-search__icon" />
              <input className="os-search__input" placeholder="İsim veya okul numarasıyla öğrenci arayın…" value={search} onChange={(e) => { setSearch(e.target.value); setStudentPage(1); }} />
            </div>
            <div className="os-flex-1" />
            {!readOnly && (
              <>
                <button className="os-quick-mark os-quick-mark--absent" onClick={() => setBulkStatus("absent")}>
                  İşaretlenmemiş {marking.summary.unmarked} öğrenciyi devamsız işaretle
                </button>
                <button className="os-quick-mark os-quick-mark--clear" onClick={marking.clearAll}>Temizle</button>
              </>
            )}
          </div>

          {studentsLoading || recordsLoading ? (
            <TableSkeleton headers={HEADERS} />
          ) : (
            <>
              <table className="os-table os-table--attendance">
                <thead>
                  <tr>
                    <th className="os-w-2h">#</th>
                    <th>Öğrenci</th>
                    <th>Okul no.</th>
                    <th>Yoklama</th>
                    <th>Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((student, idx) => (
                    <StudentAttendanceRow
                      key={student.id}
                      student={student}
                      idx={(studentPage - 1) * studentPageSize + idx}
                      status={marking.statuses[student.id] ?? null}
                      note={marking.notes[student.id] ?? ""}
                      readOnly={readOnly}
                      onMark={(s) => marking.mark(student.id, s)}
                      onNoteChange={(value) => marking.setNote(student.id, value)}
                    />
                  ))}
                </tbody>
              </table>
              {filtered.length > 0 && (
                <Pagination
                  totalItems={filtered.length}
                  page={studentPage}
                  pageSize={studentPageSize}
                  pageSizes={[25, 50, 100]}
                  onChange={({ page, pageSize }) => {
                    setStudentPage(pageSize === studentPageSize ? page : 1);
                    setStudentPageSize(pageSize);
                  }}
                  size="sm"
                />
              )}
              {filtered.length === 0 && (
                <div className="os-placeholder">
                  <UserMultiple size={32} />
                  <p>{students?.length === 0 ? "Bu sınıfta kayıtlı öğrenci yok." : `"${search}" ile eşleşen öğrenci yok`}</p>
                </div>
              )}
            </>
          )}
        </div>

        {!readOnly && (
          <div className="os-flex os-col os-gap-3 os-py-4 os-attendance-sticky-actions">
            {isOverride && (
              <TextInput id="attendance-override-reason" labelText="Kilitli oturumu düzenleme gerekçesi" placeholder="örn. Veli telefon görüşmesi sonrası düzeltildi" value={reason} onChange={(e) => setReason(e.target.value)} className="os-max-w-28" />
            )}
            <div className="os-flex os-items-center os-gap-4 os-wrap">
              {marking.summary.unmarked > 0 && (
                <div className="os-flex os-items-center os-gap-1h os-text-sm os-c-status-late">
                  <Warning size={16} className="os-fill-warning" />
                  {marking.summary.unmarked} öğrenci henüz işaretlenmedi
                </div>
              )}
              {markAttendance.isError && <span className="os-text-sm os-c-danger">{getErrorMessage(markAttendance.error, "Yoklama kaydedilemedi")}</span>}
              <div className="os-flex-1" />
              <Button kind="secondary" size="md" onClick={() => unsavedGuard.guard(() => navigate(backPath))}>İptal</Button>
              <Button renderIcon={Save} kind="primary" size="md" onClick={save} disabled={markAttendance.isPending}>
                {markAttendance.isPending ? "Kaydediliyor…" : "Yoklamayı kaydet"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmActionModal
        open={!!bulkStatus}
        title={`İşaretlenmemiş öğrencileri ${STATUS_TR[bulkStatus ?? "absent"] ?? ""} olarak işaretle`}
        description={`İşaretlenmemiş ${marking.summary.unmarked} öğrencinin tümü ${STATUS_TR[bulkStatus ?? "absent"] ?? ""} olarak işaretlenecek. Mevcut yoklama işaretleri değişmez.`}
        confirmLabel={`${STATUS_TR[bulkStatus ?? "absent"] ?? ""} olarak işaretle`}
        danger={bulkStatus === "absent"}
        onClose={() => setBulkStatus(null)}
        onConfirm={() => { if (bulkStatus) marking.markAll(bulkStatus); setBulkStatus(null); }}
      />
      <UnsavedChangesModal open={unsavedGuard.modalOpen} onStay={unsavedGuard.cancelLeave} onLeave={unsavedGuard.confirmLeave} />
    </div>
  );
}
