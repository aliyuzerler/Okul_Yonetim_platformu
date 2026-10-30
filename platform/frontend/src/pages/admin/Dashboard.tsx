import { useQuery } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/shared/api/client";
import type { SummaryResponse } from "@/shared/api/types";
import { formatKurus } from "@/shared/lib/format";
import Loading from "@/shared/ui/Loading";
import { InlineNotification } from "@carbon/react";

export default function Dashboard() {
  const summary = useQuery({
    queryKey: ["admin-summary"],
    queryFn: async () => (await api.get<SummaryResponse>("/admin/summary")).data,
  });

  if (summary.isLoading) return <Loading />;
  if (summary.isError) {
    return <InlineNotification kind="error" title="Özet alınamadı" subtitle={getErrorMessage(summary.error)} lowContrast />;
  }

  const d = summary.data!;
  const maxMonth = Math.max(1, ...d.revenue_by_month.map((m) => m.amount_kurus));

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Gelir özeti</h1>
      <div className="pl-kpi-grid">
        <div className="pl-kpi">
          <div className="pl-kpi__label">MRR (aylık gelir)</div>
          <div className="pl-kpi__value">{formatKurus(d.mrr_kurus)}</div>
          <div className="pl-kpi__hint">ARR: {formatKurus(d.arr_kurus)}</div>
        </div>
        <div className="pl-kpi">
          <div className="pl-kpi__label">Aktif okul</div>
          <div className="pl-kpi__value">{d.tenant_counts.active}</div>
          <div className="pl-kpi__hint">Denemede: {d.tenant_counts.trial}</div>
        </div>
        <div className="pl-kpi">
          <div className="pl-kpi__label">Son 30 gün tahsilat</div>
          <div className="pl-kpi__value">{formatKurus(d.revenue_30d_kurus)}</div>
          <div className="pl-kpi__hint">Geciken: {d.tenant_counts.past_due}</div>
        </div>
        <div className="pl-kpi">
          <div className="pl-kpi__label">Deneme → ödeme</div>
          <div className="pl-kpi__value">{Math.round(d.trial_conversion_rate * 100)}%</div>
          <div className="pl-kpi__hint">Bekleyen doğrulama: {d.tenant_counts.pending_verification}</div>
        </div>
      </div>

      <h2 className="pl-section-title">Son 6 ay tahsilat</h2>
      <div className="pl-table-wrap">
        {d.revenue_by_month.length === 0 ? (
          <p style={{ margin: 0, color: "var(--pl-muted)" }}>Henüz tahsilat yok.</p>
        ) : (
          <table className="pl-table">
            <thead>
              <tr>
                <th>Ay</th>
                <th>Tahsilat</th>
                <th style={{ width: "50%" }} />
              </tr>
            </thead>
            <tbody>
              {d.revenue_by_month.map((m) => (
                <tr key={m.month}>
                  <td>{m.month}</td>
                  <td>{formatKurus(m.amount_kurus)}</td>
                  <td>
                    <div style={{ background: "var(--pl-primary)", height: 10, borderRadius: 5, width: `${(m.amount_kurus / maxMonth) * 100}%` }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
