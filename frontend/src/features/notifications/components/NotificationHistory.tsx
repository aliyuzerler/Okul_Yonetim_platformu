import { useState } from "react";
import { Select, SelectItem, Tag } from "@carbon/react";
import { useNotificationHistory } from "@/features/notifications/queries/useNotifications";
import { CATEGORIES, PRIORITIES } from "@/features/notifications/api/notification";
import { NOTIFICATION_PRIORITY_TAG as PRIORITY_TAG } from "@/shared/lib/constants/tags";
import { useListFilters } from "@/shared/hooks/useListFilters";
import { usePersistedPageSize } from "@/shared/hooks/usePersistedPageSize";
import { formatDateTime } from "@/shared/lib/date";
import DataGrid from "@/shared/ui/DataGrid";
import DateField from "@/shared/ui/DateField";
import FilterBar from "@/shared/ui/FilterBar";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));
const PRIORITY_LABEL = Object.fromEntries(PRIORITIES.map((p) => [p.value, p.label]));

// Every sent notification, newest first: the whole school for admins, their own for teachers.
export default function NotificationHistory() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistedPageSize("notification-history");
  const { filters, set, debouncedSearch, hasActive } = useListFilters({ query: "", category: "", priority: "", from: "", to: "" });
  const { data, isLoading, isError, refetch } = useNotificationHistory({
    search: debouncedSearch,
    category: filters.category,
    priority: filters.priority,
    from: filters.from,
    to: filters.to,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const update = (key: keyof typeof filters, value: string) => {
    set(key, value);
    setPage(1);
  };

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Gönderim geçmişi</h2>
        {data && <span className="os-section__meta">{data.total} gönderim</span>}
      </div>
      <div className="os-px-6 os-pt-4">
        <FilterBar
          search={{ value: filters.query, onChange: (v) => update("query", v), placeholder: "Başlık, mesaj veya gönderende arayın" }}
          controls={[
            {
              label: "Kategori",
              node: (
                <Select id="history-category" labelText="Kategori" hideLabel value={filters.category} onChange={(e) => update("category", e.target.value)}>
                  <SelectItem value="" text="Tüm kategoriler" />
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value} text={c.label} />)}
                </Select>
              ),
            },
            {
              label: "Öncelik",
              node: (
                <Select id="history-priority" labelText="Öncelik" hideLabel value={filters.priority} onChange={(e) => update("priority", e.target.value)}>
                  <SelectItem value="" text="Tüm öncelikler" />
                  {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value} text={p.label} />)}
                </Select>
              ),
            },
            { label: "Başlangıç", node: <DateField id="history-from" labelText="Başlangıç" hideLabel placeholder="Başlangıç" value={filters.from} maxDate={filters.to || undefined} onChange={(v) => update("from", v)} /> },
            { label: "Bitiş", node: <DateField id="history-to" labelText="Bitiş" hideLabel placeholder="Bitiş" value={filters.to} minDate={filters.from || undefined} onChange={(v) => update("to", v)} /> },
          ]}
        />
      </div>
      <ListState
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        errorMessage="Gönderilen bildirimler yüklenemedi."
        isEmpty={!data?.items.length}
        empty={hasActive ? { title: "Bu filtrelerle eşleşen kayıt yok", description: "Daha geniş bir tarih aralığı veya farklı bir arama deneyin." } : { title: "Henüz gönderim yok", description: "Gönderilen bildirimler burada görünecek." }}
        skeleton={<TableSkeleton headers={["Gönderim", "Başlık", "Kategori", "Gönderen", "Okuma"]} />}
      >
        <DataGrid
          rows={data?.items ?? []}
          getRowId={(n) => n.id}
          noHover
          pageSizes={[25, 50, 100]}
          server={{
            page,
            pageSize,
            totalItems: data?.total ?? 0,
            onChange: ({ page: p, pageSize: ps }) => {
              setPage(ps === pageSize ? p : 1);
              setPageSize(ps);
            },
          }}
          columns={[
            { key: "sent", header: "Gönderim", render: (n) => <span className="os-nowrap os-text-sm">{formatDateTime(n.sent_at)}</span> },
            {
              key: "title",
              header: "Başlık",
              render: (n) => (
                <div>
                  <span className="os-fw-600">{n.title}</span>
                  {n.priority !== "normal" && <Tag type={PRIORITY_TAG[n.priority]} size="sm" className="os-ml-2">{PRIORITY_LABEL[n.priority] ?? n.priority}</Tag>}
                  <p className="os-m-0 os-text-sm os-c-secondary os-truncate os-clamp-2">{n.message}</p>
                </div>
              ),
            },
            { key: "category", header: "Kategori", render: (n) => CATEGORY_LABEL[n.category] ?? n.category },
            { key: "sender", header: "Gönderen", render: (n) => n.sender_name },
            { key: "read", header: "Okuma", align: "end", render: (n) => `${n.read_count} / ${n.recipient_count}` },
          ]}
        />
      </ListState>
    </div>
  );
}
