import { useState } from "react";
import { Link } from "react-router";
import { EventSchedule, CheckmarkFilled, WarningFilled, AddAlt } from "@carbon/icons-react";
import { Button, Tag } from "@carbon/react";
import { useDailySessions, useDeleteSession, useCreateSession } from "@/features/attendance/queries/useAttendance";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import { useRole } from "@/shared/auth/useRole";
import type { DailySession } from "@/features/attendance/api/attendance";
import { todayISODate, isLockedAfter24Hours, formatDate } from "@/shared/lib/date";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import StatCardSkeleton from "@/shared/ui/StatCardSkeleton";
import SectionHeader from "@/shared/ui/SectionHeader";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import AgentFindingsBanner from "@/features/notifications/components/AgentFindingsBanner";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { useToast } from "@/shared/ui/toast/useToast";
import DateField from "@/shared/ui/DateField";

const HEADERS = ["Sınıf", "Seviye", "Öğretmen", "Kayıt", "Durum", "İşlemler"];

export default function Attendance() {
  const [date, setDate] = useState(todayISODate());
  const { data: sessions, isLoading, isError, refetch } = useDailySessions(date);
  const { data: classes } = useCurrentClasses();
  const deleteSession = useDeleteSession();
  const createSession = useCreateSession();
  const { role } = useRole();
  const isAdmin = role === "admin";
  const [toDelete, setToDelete] = useState<DailySession | null>(null);
  const [bulkCreating, setBulkCreating] = useState(false);
  const { showToast } = useToast();

  const existingClassIds = new Set((sessions ?? []).map((s) => s.class_id));
  const missingClasses = (classes ?? []).filter((c) => !existingClassIds.has(c.id));

  const createAllSessions = async () => {
    setBulkCreating(true);
    const results = await Promise.allSettled(
      missingClasses.map((c) => createSession.mutateAsync({ class_id: c.id, date })),
    );
    setBulkCreating(false);
    const created = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - created;
    if (failed === 0) {
      showToast({ kind: "success", title: `${created} oturum oluşturuldu` });
    } else {
      showToast({
        kind: failed === results.length ? "error" : "warning",
        title: `${results.length} oturumun ${created} tanesi oluşturuldu`,
        subtitle: `${failed} tanesi başarısız oldu - bir sınıfın zaten oturumu olabilir veya kayıtlı öğrencisi olmayabilir.`,
      });
    }
  };


  const columns: GridColumn<DailySession>[] = [
    { key: "class", header: "Sınıf", render: (s) => <span className="os-fw-600">{s.class_name}</span> },
    { key: "grade", header: "Seviye", render: (s) => <span className="os-table__muted">{s.grade_name}</span> },
    { key: "teacher", header: "Öğretmen", render: (s) => <span className="os-table__muted">{s.teacher_name}</span> },
    { key: "records", header: "Kayıt", render: (s) => <span className="os-table__muted">{s.marked_count} / {s.enrolled_count}</span> },
    {
      key: "status",
      header: "Durum",
      render: (s) => {
        const isMarked = s.marked_count > 0;
        return (
          <div className="os-flex os-gap-1h os-wrap">
            <Tag type={isMarked ? "blue" : "gray"} size="sm">
              {isMarked ? <CheckmarkFilled size={12} className="os-mr-1 os-align-middle" /> : <WarningFilled size={12} className="os-mr-1 os-align-middle" />}
              {isMarked ? "Alındı" : "Bekliyor"}
            </Tag>
            {isLockedAfter24Hours(s.created_at) && <Tag type="magenta" size="sm">Kilitli</Tag>}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "İşlemler",
      align: "end",
      render: (s) => {
        const readOnly = s.marked_count > 0 || (isLockedAfter24Hours(s.created_at) && !isAdmin);
        return (
          <div className="os-grid__actions os-nowrap-flex">
            <Button kind={readOnly ? "ghost" : "primary"} size="sm" as={Link} to={`/attendance/sessions/${s.id}/mark`} className={`os-nowrap${readOnly ? " os-c-accent" : ""}`}>
              {readOnly ? "Görüntüle" : "Yoklama al"}
            </Button>
            <Button kind="danger--ghost" size="sm" className="os-nowrap" onClick={() => setToDelete(s)}>Sil</Button>
          </div>
        );
      },
    },
  ];

  const marked = (sessions ?? []).filter((s) => s.marked_count > 0).length;
  const pending = (sessions ?? []).length - marked;
  const isToday = date === todayISODate();

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Yoklama</h1>
          <p className="os-page__subtitle">{formatDate(date)}</p>
        </div>
        <div className="os-min-w-12">
          <DateField value={date} onChange={(ymd) => {
              if (ymd) setDate(ymd);
            }} id="attendance-date" labelText="Yoklama tarihi" hideLabel size="lg" />
        </div>
      </div>

      <AgentFindingsBanner />

      {!isToday && (
        <div className="os-mb-4">
          <Button kind="ghost" size="sm" onClick={() => setDate(todayISODate())}>
            Bugüne git
          </Button>
        </div>
      )}

      {isLoading ? (
        <>
          <div className="os-stat-grid os-grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="os-section">
            <SectionHeader title="Oturumlar" />
            <TableSkeleton headers={HEADERS} />
          </div>
        </>
      ) : isError ? (
        <ErrorMessage message="Bu tarih için oturumlar yüklenemedi." onRetry={refetch} />
      ) : (
        <>
          <div className="os-stat-grid os-grid-cols-3">
            <div className="os-stat-card">
              <p className="os-stat-card__label">
                <EventSchedule size={14} className="os-fill-accent" /> Oturumlar
              </p>
              <p className="os-stat-card__value">{sessions?.length ?? 0}</p>
              <p className="os-stat-card__meta">Bu tarih için oluşturuldu</p>
            </div>
            <div className="os-stat-card os-border-t-success">
              <p className="os-stat-card__label">
                <CheckmarkFilled size={14} className="os-fill-success" /> Alındı
              </p>
              <p className="os-stat-card__value">{marked}</p>
              <p className="os-stat-card__meta">En az bir kayıt var</p>
            </div>
            <div className="os-stat-card os-border-t-warning">
              <p className="os-stat-card__label">
                <WarningFilled size={14} className="os-fill-warning" /> Bekliyor
              </p>
              <p className="os-stat-card__value">{pending}</p>
              <p className="os-stat-card__meta">Henüz kayıt yok</p>
            </div>
          </div>

          <div className="os-section">
            <SectionHeader
              title="Oturumlar"
              meta={
                missingClasses.length > 0 && (
                  <Button renderIcon={AddAlt} kind="primary" size="sm" onClick={createAllSessions} disabled={bulkCreating}>
                    {bulkCreating ? "Oluşturuluyor…" : `Tüm sınıflar için oturum oluştur (${missingClasses.length})`}
                  </Button>
                )
              }
            />

            <MutationErrorNotification
              isError={deleteSession.isError}
              error={deleteSession.error}
              title="Oturum silinemedi"
              fallback="Lütfen tekrar deneyin."
              onClose={() => deleteSession.reset()} className="os-mt-0 os-mx-6 os-mb-4"
            />

            {!sessions || sessions.length === 0 ? (
              <EmptyState
                title="Bu tarihte henüz oturum yok"
                description={
                  missingClasses.length > 0
                    ? "Yukarıdaki düğmeyle tüm sınıflar için oturum oluşturun veya bir sınıfın Yoklama sekmesinden başlayın."
                    : "Oturumlar bir sınıfın Yoklama sekmesinden oluşturulur - başlamak için bir sınıfa gidin."
                }
                action={
                  <Button kind="primary" as={Link} to="/classes">
                    Sınıflara git
                  </Button>
                }
              />
            ) : (
              <DataGrid rows={sessions} columns={columns} getRowId={(s) => s.id} noHover pageSize={20} />
            )}
          </div>
        </>
      )}

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Yoklama oturumunu sil"
        description={
          <>
            <strong>{toDelete?.date}</strong> tarihindeki <strong>{toDelete?.class_name}</strong>{" "}
            oturumu silinsin mi? Bu oturum için girilmiş tüm yoklama kayıtları da silinir.
          </>
        }
        subject="Oturum"
        mutation={deleteSession}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteSession.mutate(toDelete.id)}
      />
    </div>
  );
}
