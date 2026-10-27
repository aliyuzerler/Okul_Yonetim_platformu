import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import type { useClassSessions, useCreateSession, useDeleteSession } from "@/features/attendance/queries/useAttendance";
import type { AttendanceSession } from "@/features/attendance/api/attendance";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import DataGrid from "@/shared/ui/DataGrid";
import EmptyState from "@/shared/ui/EmptyState";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import DateField from "@/shared/ui/DateField";
import SectionCard from "@/shared/ui/SectionCard";

interface Props {
  sessions: ReturnType<typeof useClassSessions>["data"];
  sessionsLoading: boolean;
  createSession: ReturnType<typeof useCreateSession>;
  deleteSession: ReturnType<typeof useDeleteSession>;
  onOpenNewSession: () => void;
  onRequestDeleteSession: (session: AttendanceSession) => void;
}

export default function AttendanceTab({
  sessions,
  sessionsLoading,
  createSession,
  deleteSession,
  onOpenNewSession,
  onRequestDeleteSession,
}: Props) {
  const [sessionDateFilter, setSessionDateFilter] = useState("");

  const sortedSessions = useMemo(
    () =>
      [...(sessions ?? [])]
        .filter((s) => !sessionDateFilter || s.date === sessionDateFilter)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [sessions, sessionDateFilter],
  );

  return (
    <SectionCard
      title="Yoklama oturumları"
      className="os-mt-4"
      flush
      meta={(
        <div className="os-flex os-items-center os-gap-3 os-wrap">
          <div className="os-session-date-filter os-shrink-0">
            <DateField value={sessionDateFilter} onChange={(ymd) => {
                setSessionDateFilter(ymd);
              }} id="session-date-filter" labelText="Tarihe göre filtrele" hideLabel placeholder="Tarihe göre filtrele" size="sm" />
          </div>
          {sessionDateFilter && (
            <Button
              kind="ghost"
              size="sm"
              onClick={() => setSessionDateFilter("")}
            >
              Temizle
            </Button>
          )}
          <Button renderIcon={Add} kind="ghost" size="sm" onClick={onOpenNewSession}>
            Yeni oturum
          </Button>
        </div>
      )}
    >

      <MutationErrorNotification
        isError={createSession.isError}
        error={createSession.error}
        title="Oturum oluşturulamadı"
        fallback="Bu tarih için bu sınıfta zaten bir oturum olabilir."
        onClose={() => createSession.reset()} className="os-mt-0 os-mx-6 os-mb-4"
      />
      <MutationErrorNotification
        isError={deleteSession.isError}
        error={deleteSession.error}
        title="Oturum silinemedi"
        fallback="Lütfen yeniden deneyin."
        onClose={() => deleteSession.reset()} className="os-mt-0 os-mx-6 os-mb-4"
      />

      {sessionsLoading ? (
        <LoadingSpinner />
      ) : sortedSessions.length > 0 ? (
        <DataGrid
          rows={sortedSessions}
          getRowId={(s) => s.id}
          noHover
          pageSizes={[10, 20, 30]}
          columns={[
            { key: "date", header: "Tarih", render: (s) => <span className="os-table__mono">{s.date}</span> },
            {
              key: "actions",
              header: "İşlemler",
              align: "end",
              render: (s) => (
                <div className="os-grid__actions os-nowrap-flex">
                  <Button kind="ghost" size="sm" as={Link} to={`/attendance/sessions/${s.id}/mark`} className="os-c-accent os-nowrap">Yoklama al / görüntüle</Button>
                  <Button kind="danger--ghost" size="sm" className="os-nowrap" onClick={() => onRequestDeleteSession(s)}>Sil</Button>
                </div>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState
          title={sessionDateFilter ? "Bu tarihte oturum yok" : "Henüz oturum yok"}
          description={
            sessionDateFilter
              ? "Farklı bir tarih deneyin veya filtrelemeyi temizleyin."
              : "Bu sınıf için yoklama almaya başlamak üzere bir oturum oluşturun."
          }
          action={
            sessionDateFilter ? undefined : (
              <Button renderIcon={Add} kind="primary" onClick={onOpenNewSession}>
                Yeni oturum
              </Button>
            )
          }
        />
      )}
    </SectionCard>
  );
}
