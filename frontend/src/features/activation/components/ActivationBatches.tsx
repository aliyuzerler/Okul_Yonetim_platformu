import { useState } from "react";
import { Button, Tag } from "@carbon/react";
import { View } from "@carbon/icons-react";
import { useActivationBatches, useRevokeBatch } from "@/features/activation/queries/useActivation";
import type { ActivationBatch } from "@/features/activation/api/activation";
import BatchCodesModal from "@/features/activation/components/BatchCodesModal";
import SectionCard from "@/shared/ui/SectionCard";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import ConfirmActionModal from "@/shared/ui/ConfirmActionModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { formatDate } from "@/shared/lib/date";
import { ROLE_LABELS } from "@/features/activation/lib/roles";

const live = (b: ActivationBatch) => b.total - b.used - b.revoked - b.expired;

// Tracks how many codes from each run were used, reopens unused codes for printing, and cancels a run if its sheet goes missing.
export default function ActivationBatches() {
  const { data: batches, isLoading, isError, refetch } = useActivationBatches();
  const revoke = useRevokeBatch();
  const [toRevoke, setToRevoke] = useState<ActivationBatch | null>(null);
  const [viewing, setViewing] = useState<ActivationBatch | null>(null);

  return (
    <SectionCard title="Düzenlenen kod grupları" flush>
      <MutationErrorNotification isError={revoke.isError} error={revoke.error} title="Kodlar iptal edilemedi" className="os-m-4" />
      {isLoading && <TableSkeleton headers={["Düzenlenme", "Tür", "Etkinleşen", "Geçerli", "İptal / süresi dolmuş", "Son geçerlilik"]} />}
      {isError && <ErrorMessage message="Düzenlenen kod grupları yüklenemedi." onRetry={refetch} />}
      {batches && batches.length === 0 && <p className="os-text-sm os-c-secondary os-p-4 os-m-0">Henüz düzenlenmiş kod grubu yok.</p>}
      {batches && batches.length > 0 && (
        <table className="os-table">
          <thead>
            <tr>
              <th>Düzenlenme</th>
              <th>Tür</th>
              <th>Etkinleşen</th>
              <th>Geçerli</th>
              <th>İptal / süresi dolmuş</th>
              <th>Son geçerlilik</th>
              <th aria-label="İşlemler" />
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.batch_id}>
                <td>{formatDate(b.created_at)}</td>
                <td><Tag type={b.role === "student" ? "blue" : "purple"} size="sm">{ROLE_LABELS[b.role].many}</Tag></td>
                <td>{b.used} / {b.total}</td>
                <td>{live(b)}</td>
                <td>{b.revoked} / {b.expired}</td>
                <td>{formatDate(b.expires_at)}</td>
                <td>
                  {live(b) > 0 && (
                    <div className="os-flex os-gap-2 os-justify-end">
                      {/* Batches issued before reprinting was set up have no stored codes to show. */}
                      {b.reprintable > 0 && <Button kind="ghost" size="sm" renderIcon={View} onClick={() => setViewing(b)}>Kodları görüntüle</Button>}
                      <Button kind="danger--ghost" size="sm" onClick={() => setToRevoke(b)}>Kullanılmayanları iptal et</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {viewing && <BatchCodesModal batch={viewing} onClose={() => setViewing(null)} />}
      <ConfirmActionModal
        open={!!toRevoke}
        title="Kullanılmayan kodlar iptal edilecek mi?"
        description={`Bu gruptaki hâlâ geçerli olan ${toRevoke ? live(toRevoke) : 0} kod geçersiz hale gelir. Zaten etkinleştirilmiş hesaplar etkilenmez.`}
        confirmLabel="Kodları iptal et"
        danger
        pending={revoke.isPending}
        onClose={() => setToRevoke(null)}
        onConfirm={() => toRevoke && revoke.mutate(toRevoke.batch_id, { onSuccess: () => setToRevoke(null) })}
      />
    </SectionCard>
  );
}
