import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Add, Edit, TrashCan } from "@carbon/icons-react";
import { Button, IconButton, Select, SelectItem, Tag } from "@carbon/react";
import { useTeachers, useDeleteTeacher } from "@/features/teachers/queries/useTeachers";
import type { Teacher, TeacherEmploymentStatus } from "@/features/teachers/api/teacher";
import { EMPLOYMENT_STATUSES } from "@/shared/lib/constants/people";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import FilterBar from "@/shared/ui/FilterBar";
import ActiveFilterTags from "@/shared/ui/ActiveFilterTags";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import AgentFindingsBanner from "@/features/notifications/components/AgentFindingsBanner";
import { useListFilters } from "@/shared/hooks/useListFilters";
import { usePersistedPageSize } from "@/shared/hooks/usePersistedPageSize";
import Avatar from "@/shared/ui/Avatar";
import { formatDateOnly } from "@/shared/lib/date";
import { displayName } from "@/shared/lib/name";

const STATUS_TAG: Record<string, "green" | "red" | "magenta"> = { active: "green", resigned: "red", transferred: "magenta" };
const FILTER_LABELS: Record<string, string> = { query: "Arama", status: "Durum" };

// shared/lib EMPLOYMENT_STATUSES is English; display labels are translated here.
const employmentStatusLabel: Record<string, string> = {
  active: "Aktif",
  resigned: "İstifa etti",
  transferred: "Başka okula atandı",
};

export default function Teachers() {
  const navigate = useNavigate();
  const deleteTeacher = useDeleteTeacher();
  const [toDelete, setToDelete] = useState<Teacher | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize("teachers");
  const { filters, set, clear, activeKeys, debouncedSearch } = useListFilters({ query: "", status: "" });

  const setFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setPage(1);
    set(key, value);
  };

  const { data, isLoading, isError, refetch } = useTeachers({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: debouncedSearch,
    status: filters.status as TeacherEmploymentStatus | "",
  });
  const teachers = data?.items ?? [];

  const columns: GridColumn<Teacher>[] = [
    { key: "employee_number", header: "Sicil no.", render: (t) => <span className="os-table__mono">{t.employee_number}</span> },
    {
      key: "full_name",
      header: "Ad soyad",
      render: (t) => (
        <div className="os-flex os-items-center os-gap-2">
          <Avatar name={displayName(t)} size="sm" />
          <Link to={`/teachers/${t.id}`} className="os-table__link" title={t.full_name}>{displayName(t)}</Link>
        </div>
      ),
    },
    { key: "phone", header: "Telefon", render: (t) => <span className="os-table__muted">{t.phone ?? "-"}</span> },
    { key: "joined_date", header: "İşe başlama", render: (t) => <span className="os-table__muted">{formatDateOnly(t.joined_date)}</span> },
    {
      key: "status",
      header: "Durum",
      render: (t) => <Tag type={STATUS_TAG[t.employment_status] ?? "gray"} size="sm">{employmentStatusLabel[t.employment_status] ?? t.employment_status}</Tag>,
    },
    {
      key: "actions",
      header: "İşlemler",
      align: "end",
      render: (t) => (
        <div className="os-grid__actions">
          <IconButton label="Düzenle" kind="ghost" size="sm" onClick={() => navigate(`/teachers/${t.id}`, { state: { edit: true } })}><Edit /></IconButton>
          <IconButton label="Sil" kind="ghost" size="sm" onClick={() => { deleteTeacher.reset(); setToDelete(t); }}><TrashCan /></IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Öğretmenler</h1>
          <p className="os-page__subtitle">Öğretmen profillerini yönetin</p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" as={Link} to="/teachers/new">Öğretmen ekle</Button>
      </div>

      <AgentFindingsBanner />

      <div className="os-section">
        <FilterBar
          search={{ value: filters.query, onChange: (v) => setFilter("query", v), placeholder: "Ad veya sicil numarasına göre ara…" }}
          controls={[
            {
              label: "Durum",
              node: (
                <Select id="filter-teacher-status" labelText="Durum" hideLabel size="md" value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
                  <SelectItem value="" text="Tüm durumlar" />
                  {EMPLOYMENT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value} text={employmentStatusLabel[s.value] ?? s.label} />)}
                </Select>
              ),
            },
          ]}
        />
        <ActiveFilterTags filters={activeKeys.map((k) => ({ key: k, label: FILTER_LABELS[k], value: filters[k] }))} onClear={(k) => { clear(k as keyof typeof filters); setPage(1); }} onClearAll={() => { clear(); setPage(1); }} />
        <MutationErrorNotification isError={deleteTeacher.isError} error={deleteTeacher.error} title="Öğretmen silinemedi" fallback="Öğretmen bir sınıfa atanmış veya yoklama kayıtları olabilir." onClose={() => deleteTeacher.reset()} className="os-section__notice" />
        <ListState
          isLoading={isLoading}
          isError={isError}
          isEmpty={teachers.length === 0}
          errorMessage="Öğretmen listesi yüklenemedi."
          onRetry={refetch}
          skeleton={<TableSkeleton headers={columns.map((c) => c.header)} />}
          empty={{ title: "Öğretmen bulunamadı", description: "İlk öğretmeninizi ekleyin veya arama filtrenizi değiştirin." }}
        >
          <DataGrid
            rows={teachers}
            columns={columns}
            getRowId={(t) => t.id}
            countLabel={(shown, total) => `Toplam ${total} öğretmenden ${shown} tanesi gösteriliyor`}
            server={{ page, pageSize, totalItems: data?.total ?? 0, onChange: ({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); } }}
          />
        </ListState>
      </div>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Öğretmeni sil"
        description={<> <strong>{toDelete ? displayName(toDelete) : ""}</strong> silinsin mi? Bu işlem hesabını da kaldırır ve geri alınamaz.</>}
        subject="Öğretmen"
        successVerb="silindi"
        confirmLabel="Sil"
        pendingLabel="Siliniyor…"
        mutation={deleteTeacher}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteTeacher.mutate(toDelete.id)}
      />
    </div>
  );
}
