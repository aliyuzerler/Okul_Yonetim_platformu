import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button, InlineNotification } from "@carbon/react";
import { CheckmarkFilled, ErrorFilled } from "@carbon/icons-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import type { CheckoutResultResponse } from "@/shared/api/types";
import { formatKurus } from "@/shared/lib/format";
import Loading from "@/shared/ui/Loading";

// Lands here from two paths:
//  - mock mode: the "payment page" itself (token + mock=1) → simulate a
//    successful/failed payment, which settles through the backend.
//  - real iyzico mode: after the provider POSTs our callback endpoint, the
//    browser is redirected here (token only) → poll the settled result.
export default function PaymentResult() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const isMock = params.get("mock") === "1";

  const [mockBusy, setMockBusy] = useState(false);
  const [mockError, setMockError] = useState("");

  const result = useQuery({
    enabled: Boolean(token),
    queryKey: ["checkout-result", token],
    queryFn: async () => (await api.get<CheckoutResultResponse>("/billing/checkout/result", { params: { token } })).data,
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 2500 : false),
  });

  const settleMock = async (success: boolean) => {
    setMockBusy(true);
    setMockError("");
    try {
      await api.post("/billing/mock/pay", { token, success });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Mock ödeme başarısız.";
      setMockError(message);
    } finally {
      setMockBusy(false);
    }
  };

  if (!token) {
    return (
      <InlineNotification kind="error" title="Belirteç eksik" subtitle="Bu sayfaya ödeme akışından yönlendirilmelisiniz." lowContrast hideCloseButton />
    );
  }

  if (result.isLoading) return <Loading label="Ödeme sonucu sorgulanıyor…" />;

  const data = result.data;

  return (
    <div className="pl-auth-wrapper">
      <div className="pl-card" style={{ textAlign: "center" }}>
        {isMock && data?.status === "pending" && (
          <>
            <h1>iyzico ödeme sayfası (mock)</h1>
            <p className="pl-sub">
              Bu ekran gerçek iyzico ödeme sayfasının yerini tutar (IYZICO_MODE=mock). Gerçek kart bilgisi girilmez.
            </p>
            {mockError && <InlineNotification kind="error" title="İşlem başarısız" subtitle={mockError} lowContrast hideCloseButton />}
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Button onClick={() => settleMock(true)} disabled={mockBusy}>
                Ödemeyi başarılı kıl
              </Button>
              <Button kind="danger--tertiary" onClick={() => settleMock(false)} disabled={mockBusy}>
                Ödemeyi reddet
              </Button>
            </div>
          </>
        )}

        {data?.status === "succeeded" && (
          <>
            <CheckmarkFilled size={44} style={{ color: "var(--pl-success)" }} />
            <h1>Ödemeniz alındı</h1>
            <p className="pl-sub">
              {data.amount_kurus ? `${formatKurus(data.amount_kurus)} — ` : ""}
              Aboneliğiniz etkinleştirildi. Okul panelinize dönebilirsiniz.
            </p>
            <Button as="a" href="/panel/abonelik">
              Aboneliğime dön
            </Button>
          </>
        )}

        {data?.status === "failed" && (
          <>
            <ErrorFilled size={44} style={{ color: "var(--pl-danger)" }} />
            <h1>Ödeme tamamlanamadı</h1>
            <p className="pl-sub">{data.message}</p>
            <Button as="a" href="/panel/abonelik">
              Tekrar dene
            </Button>
          </>
        )}

        {data?.status === "pending" && !isMock && (
          <>
            <h1>Ödeme işleniyor…</h1>
            <p className="pl-sub">İşlem sonucu birkaç saniye içinde otomatik güncellenir.</p>
            <Link className="pl-link" to="/panel/abonelik">
              Aboneliğime dön
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
