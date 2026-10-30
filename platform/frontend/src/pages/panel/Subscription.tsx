import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, InlineNotification, Select, SelectItem, Tag } from "@carbon/react";
import { api, getErrorMessage } from "@/shared/api/client";
import type { SubscriptionStatus } from "@/shared/api/types";
import { ACCESS_STATE_LABELS, PAYMENT_STATUS_LABELS, SUB_STATUS_LABELS, formatDate, formatDateTime, formatKurus } from "@/shared/lib/format";
import Loading from "@/shared/ui/Loading";

export default function Subscription() {
  const status = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => (await api.get<SubscriptionStatus>("/billing/subscription")).data,
  });

  const [planCode, setPlanCode] = useState("");
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");

  const checkout = useMutation({
    mutationFn: async () =>
      (await api.post("/billing/checkout", { plan_code: planCode, billing_cycle: cycle })).data as { checkout_url: string },
    onSuccess: (res) => {
      window.location.assign(res.checkout_url);
    },
  });

  if (status.isLoading) return <Loading />;
  if (status.isError) {
    return <InlineNotification kind="error" title="Abonelik bilgisi alınamadı" subtitle={getErrorMessage(status.error)} lowContrast />;
  }

  const data = status.data!;
  const sub = data.subscription;

  return (
    <div>
      {data.access_state === "ok" && (
        <div className="pl-banner pl-banner--ok">Aboneliğiniz etkin — OpenSchool tam erişimle çalışıyor.</div>
      )}
      {data.access_state === "read_only" && (
        <div className="pl-banner pl-banner--warn">
          Aboneliğiniz salt okunur moda geçti: veriler korunuyor, yeni kayıt ve düzenleme kilitli. Aşağıdan hemen devam edebilirsiniz.
        </div>
      )}
      {data.access_state === "locked" && (
        <div className="pl-banner pl-banner--danger">
          Abonelik süreniz sona erdi. Verilerinize dışa aktarım dışında erişilemez; paket seçerek hemen yeniden başlayabilirsiniz.
        </div>
      )}

      <div className="pl-kpi-grid">
        <div className="pl-kpi">
          <div className="pl-kpi__label">Okul</div>
          <div className="pl-kpi__value" style={{ fontSize: "1.1rem" }}>{data.tenant.name}</div>
          <div className="pl-kpi__hint">{data.tenant.slug}</div>
        </div>
        <div className="pl-kpi">
          <div className="pl-kpi__label">Durum</div>
          <div className="pl-kpi__value" style={{ fontSize: "1.1rem" }}>
            <span className={`pl-status pl-status--${data.tenant.status}`}>{statusLabel(data.tenant.status)}</span>
          </div>
          {sub?.trial_ends_at && <div className="pl-kpi__hint">Deneme bitişi: {formatDate(sub.trial_ends_at)}</div>}
        </div>
        <div className="pl-kpi">
          <div className="pl-kpi__label">Plan</div>
          <div className="pl-kpi__value" style={{ fontSize: "1.1rem" }}>{sub?.plan.name ?? "—"}</div>
          {sub && <div className="pl-kpi__hint">{sub.billing_cycle === "annual" ? "Yıllık" : sub.billing_cycle === "monthly" ? "Aylık otomatik" : "Deneme"}</div>}
        </div>
        <div className="pl-kpi">
          <div className="pl-kpi__label">Kalan gün</div>
          <div className="pl-kpi__value">{sub?.days_remaining ?? 0}</div>
          {sub?.current_period_end && <div className="pl-kpi__hint">Dönem sonu: {formatDate(sub.current_period_end)}</div>}
        </div>
      </div>

      {data.checkout_allowed && (
        <section className="pl-card" style={{ padding: "1.5rem" }}>
          <h1 style={{ fontSize: "1.15rem", marginBottom: "0.4rem" }}>Aboneliği başlat / yenile</h1>
          <p className="pl-sub" style={{ marginBottom: "1rem" }}>
            Aylık ödemede kartınız iyzico güvenli sayfasında kaydedilir ve her ay otomatik tahsil edilir.
            Yıllık seçenekte tek çekim yapılır ve 2 ay bedava verilir.
          </p>
          <div className="pl-toolbar">
            <Select id="plan" labelText="Paket" value={planCode || sub?.plan.code || ""} onChange={(e) => setPlanCode(e.target.value)} style={{ minWidth: "260px" }}>
              {data.plan_options.map((p) => (
                <SelectItem key={p.code} value={p.code} text={`${p.name} — ${formatKurus(p.price_monthly_kurus)}/ay`} />
              ))}
            </Select>
            <Select id="cycle" labelText="Ödeme dönemi" value={cycle} onChange={(e) => setCycle(e.target.value as "monthly" | "annual")} style={{ minWidth: "200px" }}>
              <SelectItem value="monthly" text="Aylık (otomatik yenileme)" />
              <SelectItem value="annual" text="Yıllık (tek çekim, 2 ay bedava)" />
            </Select>
            <Button onClick={() => checkout.mutate()} disabled={checkout.isPending || (!planCode && !sub)}>
              {checkout.isPending ? "Yönlendiriliyorsunuz…" : "Güvenli ödemeye geç (iyzico)"}
            </Button>
          </div>
          {checkout.isError && <InlineNotification kind="error" title="Ödeme başlatılamadı" subtitle={getErrorMessage(checkout.error)} lowContrast hideCloseButton />}
        </section>
      )}

      <h2 className="pl-section-title">Ödeme geçmişi</h2>
      <div className="pl-table-wrap">
        {data.payments.length === 0 ? (
          <p style={{ margin: 0, color: "var(--pl-muted)" }}>Henüz bir ödeme kaydı yok.</p>
        ) : (
          <table className="pl-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Tutar</th>
                <th>Dönem</th>
                <th>Durum</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDateTime(p.paid_at ?? p.created_at)}</td>
                  <td>{formatKurus(p.amount_kurus)}</td>
                  <td>{p.billing_cycle === "annual" ? "Yıllık" : "Aylık"}</td>
                  <td>
                    <Tag className={`pl-status pl-status--${p.status}`} size="sm">{PAYMENT_STATUS_LABELS[p.status] ?? p.status}</Tag>
                  </td>
                  <td>{p.failure_reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function statusLabel(s: string): string {
  return SUB_STATUS_LABELS[s] ?? ACCESS_STATE_LABELS[s] ?? s;
}
