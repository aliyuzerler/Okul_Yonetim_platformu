import { useState } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { Send, TrashCan } from "@carbon/icons-react";
import { useSendNotificationDraft, useDeleteNotificationDraft } from "@/features/notifications/queries/useNotifications";
import type { Notification } from "@/features/notifications/api/notification";
import { getErrorMessage } from "@/shared/api/errors";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";

export default function DraftRow({ draft }: { draft: Notification }) {
  const send = useSendNotificationDraft();
  const remove = useDeleteNotificationDraft();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Neither action should be clickable while the other is in flight, a
  // send racing a delete on the same draft is not a state worth allowing.
  const busy = send.isPending || remove.isPending;

  return (
    <div className="os-list-row os-col os-items-stretch os-py-3h os-px-6">
      <div className="os-flex os-items-center os-gap-3">
        <div className="os-flex-1 os-min-w-0">
          <p className="os-mt-0 os-mx-0 os-mb-h os-fw-500 os-text-sm">{draft.title}</p>
          <p className="os-m-0 os-text-xs os-c-tertiary">{draft.recipient_rules.length} alıcı kuralı</p>
        </div>
        <Button kind="ghost" size="sm" renderIcon={Send} onClick={() => send.mutate(draft.id)} disabled={busy}>
          Gönder
        </Button>
        <Button kind="danger--ghost" size="sm" renderIcon={TrashCan} onClick={() => setConfirmingDelete(true)} disabled={busy}>
          Sil
        </Button>
      </div>
      {send.isError && (
        <InlineNotification
          kind="error"
          title="Taslak gönderilemedi"
          subtitle={getErrorMessage(send.error)}
          lowContrast
          onClose={() => send.reset()} className="os-mt-2 os-max-w-full"
        />
      )}
      {remove.isError && (
        <InlineNotification
          kind="error"
          title="Taslak silinemedi"
          subtitle={getErrorMessage(remove.error)}
          lowContrast
          onClose={() => remove.reset()} className="os-mt-2 os-max-w-full"
        />
      )}
      <ConfirmDeleteModal
        open={confirmingDelete}
        title="Taslağı sil"
        description="Bu bildirim taslağı kalıcı olarak silinecek. Bu işlem geri alınamaz."
        subject="Taslak"
        mutation={remove}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => remove.mutate(draft.id)}
      />
    </div>
  );
}
