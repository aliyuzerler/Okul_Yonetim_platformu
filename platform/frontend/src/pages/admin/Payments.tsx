import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InlineNotification, Select, SelectItem, TextInput } from "@carbon/react";
import { api, getErrorMessage } from "@/shared/api/client";
import type { AdminPaymentRow } from "@/shared/api/types";
import { formatDateTime, formatKurus } from "@/shared/lib/format";
import Loading from "@/shared/ui/Loading";

const STATUSES = ["", "succeeded", "failed", "pending"];

export default function AdminPayments() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: ["admin-payments", status, page],
    queryFn: async () =>
      (await api.get("/admin/payments", { params: { status, page, page_size: 20 } })).data as {
        items: AdminPaymentRow[];
        total: number;
      },
  });

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / 20)) : 1;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Ödeme defteri</h1>

      <div className="pl-toolbar">
        <Select id="pst" labelText="Durum" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ maxWidth: "200px" }}>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s} text={s === "" ? "Tümü" : s} />
          ))}
        </Select>
        <TextInput readOnly id="total" labelText="Toplam kayıt" value={String(list.data?.total ?? 0)} style={{ maxWidth: "140px" }} />
      </div>

      {list.isLoading && <Loading />}
      {list.isError && <InlineNotification kind="error" title="Liste alınamadı" subtitle={getErrorMessage(list.error)} lowContrast />}
      {list.data && (
        <div className="pl-table-wrap">
          <table className="pl-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Okul</th>
                <th>Tutar</th>
                <th>Dönem</th>
                <th>Durum</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateTime(p.paid_at ?? p.created_at)}</td>
                  <td>{p.tenant_name ?? "—"}</td>
                  <td>{formatKurus(p.amount_kurus)}</td>
                  <td>{p.billing_cycle === "annual" ? "Yıllık" : "Aylık"}</td>
                  <td>
                    <span className={`pl-status pl-status--${p.status}`}>{p.status}</span>
                  </td>
                  <td>{p.failure_reason ?? "—"}</td>
                </tr>
              ))}
              {list.data.items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "var(--pl-muted)" }}>Kayıt bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", alignItems: "center" }}>
        <button className="cds--btn cds--btn--tertiary cds--btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} type="button">
          Önceki
        </button>
        <span style={{ color: "var(--pl-muted)", fontSize: "0.9rem" }}>Sayfa {page} / {totalPages}</span>
        <button className="cds--btn cds--btn--tertiary cds--btn--sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} type="button">
          Sonraki
        </button>
      </div>
    </div>
  );
}
