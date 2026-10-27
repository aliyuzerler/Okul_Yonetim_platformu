import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { ReactNode } from "react";
import { Locked, UserMultiple, Edit, TrashCan, Phone, Email, Identification, Notification } from "@carbon/icons-react";
import { Tag, SkeletonText, Button, Pagination } from "@carbon/react";
import { useGuardianStudents, useGuardianNotifications, useDeleteGuardian } from "@/features/guardians/queries/useGuardians";
import type { Guardian } from "@/features/guardians/api/guardian";
import { formatDateTime } from "@/shared/lib/date";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import { relationshipLabel } from "@/features/guardians/constants";
import EditGuardianModal from "@/features/guardians/components/EditGuardianModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import SectionHeader from "@/shared/ui/SectionHeader";
import { displayName } from "@/shared/lib/name";

function ContactCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="os-guardian-contact-card">
      {icon}
      <div className="os-min-w-0">
        <p className="os-m-0 os-text-xs os-c-tertiary">{label}</p>
        <p className="os-mt-1 os-mb-0 os-text-md os-fw-500 os-truncate">{value}</p>
      </div>
    </div>
  );
}

export default function GuardianDetail({ guardian, onDeleted }: { guardian: Guardian; onDeleted: () => void }) {
  const NOTIFICATIONS_PAGE_SIZE = 5;
  const { data: students, isLoading: studentsLoading } = useGuardianStudents(guardian.id);
  const { data: notifications, isLoading: notificationsLoading } = useGuardianNotifications(guardian.id);
  const deleteGuardian = useDeleteGuardian();

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notificationPage, setNotificationPage] = useState(1);

  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil((notifications?.length ?? 0) / NOTIFICATIONS_PAGE_SIZE));
    const timer = window.setTimeout(() => {
      setNotificationPage((page) => Math.min(page, lastPage));
    });
    return () => window.clearTimeout(timer);
  }, [notifications?.length]);

  const hasStudents = (students?.length ?? 0) > 0;
  // Blocks delete while the linked-students query is still loading, so a fast double-click can't slip past the "still linked" check.
  const deleteBlocked = studentsLoading || hasStudents;
  const notificationItems = useMemo(() => {
    const start = (notificationPage - 1) * NOTIFICATIONS_PAGE_SIZE;
    return (notifications ?? []).slice(start, start + NOTIFICATIONS_PAGE_SIZE);
  }, [notificationPage, notifications]);

  return (
    <div className="os-section os-mt-0 os-guardian-detail">
      <SectionHeader
        title={<span title={guardian.full_name}>{displayName(guardian)}</span>}
        meta={
          <div className="os-flex os-gap-2 os-items-center">
            <Tag size="sm" type="gray">
              {relationshipLabel(guardian.relationship)}
            </Tag>
            {guardian.user_id ? (
              <Tag size="sm" type="green">
                <Locked size={12} className="os-mr-1" />
                Portal erişimi
              </Tag>
            ) : (
              <Tag size="sm" type="cool-gray">
                Portal girişi yok
              </Tag>
            )}
            <Button renderIcon={Edit} kind="ghost" size="sm" onClick={() => setEditing(true)}>
              Düzenle
            </Button>
            <Button
              renderIcon={TrashCan}
              kind="danger--ghost"
              size="sm"
              onClick={() => {
                deleteGuardian.reset();
                setConfirmDelete(true);
              }}
            >
              Sil
            </Button>
          </div>
        }
      />
      <div className="os-section__body">
        <MutationErrorNotification
          isError={deleteGuardian.isError}
          error={deleteGuardian.error}
          title="Veli silinemedi"
          fallback="Bu veli hâlâ bir öğrenciye bağlı olabilir."
          onClose={() => deleteGuardian.reset()} className="os-mb-4"
        />

        <div className="os-guardian-contact-grid os-mb-6">
          <ContactCard icon={<Phone size={18} className="os-fill-accent" />} label="Telefon" value={guardian.phone} />
          <ContactCard icon={<Email size={18} className="os-fill-accent" />} label="E-posta" value={guardian.email || "Girilmedi"} />
          <ContactCard icon={<Identification size={18} className="os-fill-accent" />} label="T.C. Kimlik No" value={guardian.nic_number || "Girilmedi"} />
        </div>

        <div className="os-guardian-section-heading">
          <div>
            <h3 className="os-text-sm os-fw-600 os-mt-0 os-mx-0">Bağlı öğrenciler</h3>
            <p className="os-m-0 os-text-xs os-c-tertiary">Bu veli profiline bağlı öğrenciler</p>
          </div>
          {students && <Tag size="sm" type="cool-gray">{students.length}</Tag>}
        </div>
        {studentsLoading ? (
          <SkeletonText width="60%" />
        ) : students && students.length > 0 ? (
          <div className="os-flex os-gap-2 os-wrap os-mb-6">
            {students.map((s) => (
              <Link
                key={s.id}
                to={`/students/${s.id}`} className="os-flex os-items-center os-gap-1h os-py-1h os-px-3 os-border os-text-sm os-no-underline os-c-primary"
              >
                <UserMultiple size={14} className="os-fill-accent" />
                {displayName(s)}
              </Link>
            ))}
          </div>
        ) : (
          <p className="os-text-sm os-c-tertiary os-mb-6">Bağlı öğrenci yok.</p>
        )}

        <div className="os-guardian-section-heading os-mt-6">
          <div>
            <h3 className="os-text-sm os-fw-600 os-mt-0 os-mx-0">Bildirim geçmişi</h3>
            <p className="os-m-0 os-text-xs os-c-tertiary">Bu velinin portalına teslim edilen mesajlar</p>
          </div>
          {notifications && <Notification size={18} className="os-fill-accent" />}
        </div>
        {!guardian.user_id ? (
          <p className="os-text-sm os-c-tertiary">
            Bu velinin portal girişi yok, bu nedenle uygulama içi bildirim almamıştır.
          </p>
        ) : notificationsLoading ? (
          <SkeletonText width="80%" />
        ) : notifications && notifications.length > 0 ? (
          <div>
            <div className="os-guardian-notification-list">
            {notificationItems.map((n) => (
              <div key={n.recipient_id} className="os-guardian-notification os-py-2h os-px-0 os-border-b">
                <div className="os-flex os-items-center os-gap-2">
                  <span className="os-fw-600 os-text-sm os-truncate">{n.title}</span>
                  <Tag size="sm" type="cool-gray">
                    {n.category}
                  </Tag>
                  <div className="os-flex-1" />
                  <span className="os-text-xs os-c-tertiary">
                    {formatDateTime(n.sent_at)}
                  </span>
                </div>
                <p className="os-mt-1 os-mx-0 os-mb-0 os-text-sm os-c-secondary">{n.message}</p>
              </div>
            ))}
            </div>
            {notifications.length > NOTIFICATIONS_PAGE_SIZE && (
              <Pagination
                className="os-guardian-notification-pagination"
                totalItems={notifications.length}
                page={notificationPage}
                pageSize={NOTIFICATIONS_PAGE_SIZE}
                pageSizes={[NOTIFICATIONS_PAGE_SIZE]}
                onChange={({ page }) => setNotificationPage(page)}
                size="sm"
              />
            )}
          </div>
        ) : (
          <p className="os-text-sm os-c-tertiary">Henüz bildirim gönderilmedi.</p>
        )}
      </div>

      {editing && <EditGuardianModal guardian={guardian} onClose={() => setEditing(false)} />}

      <ConfirmDeleteModal
        open={confirmDelete}
        title="Veliyi sil"
        description={
          studentsLoading ? (
            "Bağlı öğrenciler denetleniyor…"
          ) : hasStudents ? (
            <>
               <strong>{displayName(guardian)}</strong> hâlâ {students?.length} öğrenciye bağlı. Önce her
              öğrencinin profilinden bağlantıyı kaldırın, sonra silin.
            </>
          ) : (
            <>
               <strong>{displayName(guardian)}</strong> silinsin mi? Bu işlem geri alınamaz.
            </>
          )
        }
        subject="Veli"
        successVerb="silindi"
        confirmLabel="Sil"
        pendingLabel="Siliniyor…"
        mutation={deleteGuardian}
        disabled={deleteBlocked}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (deleteBlocked) return;
          deleteGuardian.mutate(guardian.id);
        }}
        onSuccess={onDeleted}
      />
    </div>
  );
}
