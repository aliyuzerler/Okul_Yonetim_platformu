import { useMemo, useState } from "react";
import { Button, SkeletonText } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { useOrphanedAccounts, useDeleteOrphanedAccount } from "@/features/system/queries/useIdentityReconciliation";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";

import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import FilterBar from "@/shared/ui/FilterBar";

// Admin-triggered reconciliation: identity accounts are reviewed and deleted one at a time, never in a background job.
export default function OrphanedAccounts() {
  const [loaded, setLoaded] = useState(false);
  const { data: orphaned, isLoading, isError, refetch, isFetching } = useOrphanedAccounts(loaded);
  const deleteOrphan = useDeleteOrphanedAccount();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // The list comes from ThunderID in one call and stays small, so filtering here is enough.
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orphaned ?? [];
    return (orphaned ?? []).filter((a) => [a.username, a.email, a.id].some((v) => v?.toLowerCase().includes(q)));
  }, [orphaned, search]);

  return (
    <div>
      <div className="os-page__header">
        <div>
          <h2 className="os-section__title os-m-0">
            Sahipsiz hesaplar
          </h2>
          <p className="os-page__subtitle os-mt-1">
            Yerel kullanıcı kaydıyla eşleşmeyen ThunderID hesapları - kayıt işlemi
            yarıda kaldığında geride kalmıştır. İnceleyip silmek güvenlidir.
          </p>
        </div>
        <Button kind={loaded ? "secondary" : "primary"} onClick={() => (loaded ? refetch() : setLoaded(true))} disabled={isFetching}>
          {isFetching ? "Denetleniyor…" : loaded ? "Yeniden denetle" : "Sahipsiz hesapları denetle"}
        </Button>
      </div>

      <MutationErrorNotification
        isError={deleteOrphan.isError}
        error={deleteOrphan.error}
        title="Hesap silinemedi" className="os-mb-4"
      />

      {isError && <ErrorMessage message="Sahipsiz hesap denetimi yapılamadı." onRetry={refetch} />}

      {loaded && (
        <div className="os-section">
          {isLoading && (
            <div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="os-flex os-gap-4 os-py-3h os-px-6 os-border-b">
                  <SkeletonText width="15rem" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && !!orphaned?.length && (
            <div className="os-px-6 os-pt-4">
              <FilterBar search={{ value: search, onChange: setSearch, placeholder: "Kullanıcı adı, e-posta veya kimliğe göre arayın" }} />
            </div>
          )}

          {!isLoading && !!orphaned?.length && shown.length === 0 && (
            <EmptyState title="Aramanızla eşleşen hesap yok" description="Farklı bir kullanıcı adı, e-posta veya kimlik deneyin." />
          )}

          {!isLoading && !isError && (orphaned?.length ?? 0) === 0 && (
            <EmptyState title="Sahipsiz hesap bulunamadı" description="Her ThunderID hesabının eşleşen bir yerel kullanıcı kaydı var." />
          )}

          {!isLoading && shown.length > 0 && (
            <div>
              {shown.map((account, i) => (
                <div
                  key={account.id} className={`os-flex os-items-center os-justify-between os-py-3h os-px-6 ${i < shown.length - 1 ? "os-border-b" : ""}`}
                >
                  <div>
                    <p className="os-m-0 os-fw-600 os-text-md">
                      {account.username || account.email || "(kayıtlı kullanıcı adı/e-posta yok)"}
                    </p>
                    <p className="os-mt-h os-mx-0 os-mb-0 os-text-xs os-c-tertiary">ID: {account.id}</p>
                  </div>
                  <Button
                    kind="danger--tertiary"
                    size="sm"
                    renderIcon={TrashCan}
                    onClick={() => setPendingDeleteId(account.id)}
                  >
                    Sil
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDeleteModal
        open={!!pendingDeleteId}
        title="Sahipsiz hesabı sil"
        description="Bu işlem ThunderID hesabını kalıcı olarak siler. Bu işlem geri alınamaz. Bu hesap için bir kayıt işlemi hâlâ sürmüyorsa emin olduğunuzda uygulayın."
        subject="Hesap"
        mutation={deleteOrphan}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (!pendingDeleteId) return;
          deleteOrphan.mutate(pendingDeleteId);
        }}
      />
    </div>
  );
}
