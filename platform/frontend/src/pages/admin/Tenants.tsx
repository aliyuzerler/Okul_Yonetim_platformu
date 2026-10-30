import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, InlineNotification, Modal, Select, SelectItem, TextInput } from "@carbon/react";
import { api, getErrorMessage } from "@/shared/api/client";
import type { TenantDetail, TenantListItem, TenantListResponse } from "@/shared/api/types";
import { TENANT_STATUS_LABELS, formatDate, formatDateTime, formatKurus } from "@/shared/lib/format";
import Loading from "@/shared/ui/Loading";

const STATUSES = ["", "pending_verification", "trial", "active", "past_due", "expired", "cancelled"];

export default function AdminTenants() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["admin-tenants", query, status, page],
    queryFn: async () =>
      (await api.get<TenantListResponse>("/admin/tenants", { params: { query, status, page, page_size: 20 } })).data,
  });

  const detail = useQuery({
    enabled: Boolean(detailId),
    queryKey: ["admin-tenant", detailId],
    queryFn: async () => (await api.get<TenantDetail>(`/admin/tenants/${detailId}`)).data,
  });

  const [trialDays, setTrialDays] = useState(7);
  const [newStatus, setNewStatus] = useState("active");
  const action = useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      api.post(`/admin/tenants/${detailId}/actions`, body),
    onSuccess: () => qc.invalidateQueries(),
  });

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.page_size)) : 1;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Okullar</h1>

      <div className="pl-toolbar">
        <TextInput
          id="q"
          labelText="Ara"
          placeholder="Okul adı, slug veya e-posta"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: "320px" }}
        />
        <Select id="st" labelText="Durum" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ maxWidth: "220px" }}>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s} text={s === "" ? "Tümü" : (TENANT_STATUS_LABELS[s] ?? s)} />
          ))}
        </Select>
      </div>

      {list.isLoading && <Loading />}
      {list.isError && <InlineNotification kind="error" title="Liste alınamadı" subtitle={getErrorMessage(list.error)} lowContrast />}
      {list.data && (
        <div className="pl-table-wrap">
          <table className="pl-table">
            <thead>
              <tr>
                <th>Okul</th>
                <th>Yönetici</th>
                <th>Paket</th>
                <th>Durum</th>
                <th>Erişim</th>
                <th>Kayıt</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((t) => (
                <TenantRow key={t.id} t={t} onOpen={() => setDetailId(t.id)} />
              ))}
              {list.data.items.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ color: "var(--pl-muted)" }}>Kayıt bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", alignItems: "center" }}>
        <Button kind="tertiary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Önceki
        </Button>
        <span style={{ color: "var(--pl-muted)", fontSize: "0.9rem" }}>
          Sayfa {page} / {totalPages} — {list.data?.total ?? 0} okul
        </span>
        <Button kind="tertiary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Sonraki
        </Button>
      </div>

      <Modal
        open={Boolean(detailId)}
        modalHeading={detail.data?.tenant.name ?? "Okul detayı"}
        passiveModal
        onRequestClose={() => setDetailId(null)}
      >
        {detail.isLoading && <Loading />}
        {detail.data && (
          <div>
            <p style={{ color: "var(--pl-muted)", fontSize: "0.9rem" }}>
              {detail.data.tenant.owner_email} · {detail.data.contact_name || "—"} · {detail.data.phone || "—"} · {detail.data.tenant.city || "—"}
            </p>
            <p>
              Durum: <span className={`pl-status pl-status--${detail.data.tenant.status}`}>{TENANT_STATUS_LABELS[detail.data.tenant.status] ?? detail.data.tenant.status}</span>{" "}
              {detail.data.subscription && (
                <>
                  {" "}· Plan: <strong>{detail.data.subscription.plan_name}</strong>{" "}
                  {detail.data.subscription.billing_cycle && `(${detail.data.subscription.billing_cycle === "annual" ? "yıllık" : "aylık"})`}
                </>
              )}
            </p>

            <h3 style={{ margin: "1.25rem 0 0.5rem", fontSize: "1rem" }}>Manuel işlem</h3>
            <div className="pl-toolbar">
              <TextInput id="days" labelText="Deneme uzatma (gün)" type="number" min={1} max={90} value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} style={{ maxWidth: "160px" }} />
              <Button size="sm" onClick={() => action.mutate({ action: "extend_trial", trial_days: trialDays })} disabled={action.isPending}>
                Denemeyi uzat
              </Button>
              <Select id="nstatus" labelText="Durum ata" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} style={{ maxWidth: "180px" }}>
                {["active", "past_due", "expired", "cancelled"].map((s) => (
                  <SelectItem key={s} value={s} text={TENANT_STATUS_LABELS[s] ?? s} />
                ))}
              </Select>
              <Button size="sm" kind="danger--tertiary" onClick={() => action.mutate({ action: "set_status", new_status: newStatus })} disabled={action.isPending}>
                Uygula
              </Button>
            </div>
            {action.isError && <InlineNotification kind="error" title="İşlem başarısız" subtitle={getErrorMessage(action.error)} lowContrast hideCloseButton />}
            {action.isSuccess && <InlineNotification kind="success" title="İşlem uygulandı" lowContrast hideCloseButton />}

            <h3 style={{ margin: "1.25rem 0 0.5rem", fontSize: "1rem" }}>Ödemeler</h3>
            <table className="pl-table">
              <thead>
                <tr><th>Tarih</th><th>Tutar</th><th>Durum</th></tr>
              </thead>
              <tbody>
                {detail.data.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDateTime(p.paid_at ?? p.created_at)}</td>
                    <td>{formatKurus(p.amount_kurus)}</td>
                    <td><span className={`pl-status pl-status--${p.status}`}>{p.status}</span></td>
                  </tr>
                ))}
                {detail.data.payments.length === 0 && (
                  <tr><td colSpan={3} style={{ color: "var(--pl-muted)" }}>Ödeme yok.</td></tr>
                )}
              </tbody>
            </table>

            <h3 style={{ margin: "1.25rem 0 0.5rem", fontSize: "1rem" }}>Yaşam döngüsü</h3>
            <table className="pl-table">
              <thead>
                <tr><th>Zaman</th><th>Olay</th><th>Aktör</th></tr>
              </thead>
              <tbody>
                {detail.data.events.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDateTime(e.created_at)}</td>
                    <td>{e.event_type}</td>
                    <td>{e.actor}</td>
                  </tr>
                ))}
                {detail.data.events.length === 0 && (
                  <tr><td colSpan={3} style={{ color: "var(--pl-muted)" }}>Kayıt yok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}

function TenantRow({ t, onOpen }: { t: TenantListItem; onOpen: () => void }) {
  return (
    <tr>
      <td>
        <strong>{t.name}</strong>
        <div style={{ color: "var(--pl-muted)", fontSize: "0.8rem" }}>{t.slug}</div>
      </td>
      <td>{t.owner_email}</td>
      <td>{t.plan_name ?? "—"}</td>
      <td>
        <span className={`pl-status pl-status--${t.status}`}>{TENANT_STATUS_LABELS[t.status] ?? t.status}</span>
      </td>
      <td>
        <span className={`pl-status pl-status--${t.access_state}`}>{t.access_state}</span>
      </td>
      <td>{formatDate(t.created_at)}</td>
      <td>
        <Button size="sm" kind="ghost" onClick={onOpen}>
          Detay
        </Button>
      </td>
    </tr>
  );
}
