import { useState } from "react";
import { Button } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import {
  useGuardiansByStudent,
  useUnlinkGuardian,
  useSetPrimaryGuardian,
} from "@/features/guardians/queries/useGuardians";
import type { GuardianWithPrimary } from "@/features/guardians/api/guardian";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import AddGuardianModal from "@/features/students/components/AddGuardianModal";
import ProvisionLoginModal from "@/features/students/components/ProvisionLoginModal";
import GuardianRow from "@/features/students/components/GuardianRow";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import SectionCard from "@/shared/ui/SectionCard";
import ListRowSkeleton from "@/shared/ui/ListRowSkeleton";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import { displayName } from "@/shared/lib/name";

// A student can have at most 2 guardians on file.
const MAX_GUARDIANS = 2;

export default function StudentGuardians({ studentId }: { studentId: string }) {
  const { data: guardians, isLoading, isError, refetch } = useGuardiansByStudent(studentId);
  const unlinkGuardian = useUnlinkGuardian(studentId);
  const setPrimary = useSetPrimaryGuardian(studentId);

  const [addOpen, setAddOpen] = useState(false);
  const [loginFor, setLoginFor] = useState<GuardianWithPrimary | null>(null);
  const [toUnlink, setToUnlink] = useState<GuardianWithPrimary | null>(null);

  const atMax = (guardians?.length ?? 0) >= MAX_GUARDIANS;

  return (
    <SectionCard
      title="Veliler"
      meta={
        <Button
          renderIcon={Add}
          kind="ghost"
          size="sm"
          onClick={() => setAddOpen(true)}
          disabled={isLoading || isError || atMax}
        >
          Veli ekle
        </Button>
      }
    >
        <MutationErrorNotification
          isError={setPrimary.isError}
          error={setPrimary.error}
          title="Birincil iletişim atanamadı"
          fallback="Lütfen tekrar deneyin."
          onClose={() => setPrimary.reset()} className="os-mb-4"
        />
        <MutationErrorNotification
          isError={unlinkGuardian.isError}
          error={unlinkGuardian.error}
          title="Veli kaldırılamadı"
          fallback="Lütfen tekrar deneyin."
          onClose={() => unlinkGuardian.reset()} className="os-mb-4"
        />
        {atMax && (
          <p className="os-mt-0 os-mx-0 os-mb-4 os-text-xs os-c-tertiary">
            Bir öğrenci için en fazla {MAX_GUARDIANS} veli kaydedilebilir. Başka eklemek için önce birini kaldırın.
          </p>
        )}

        {isLoading && <ListRowSkeleton leadingWidth="2.25rem" titleWidth="45%" subtitleWidth="30%" trailingWidth="5rem" />}

        {isError && <ErrorMessage message="Veliler yüklenemedi." onRetry={refetch} />}

        {!isLoading && !isError && guardians?.length === 0 && (
          <EmptyState
            title="Henüz veli yok"
            description="Her öğrencinin en az bir velisi kayıtlı olmalıdır."
          />
        )}

        {!isLoading && !isError && guardians && guardians.length > 0 && (
          <div className="os-grid os-gap-3">
            {guardians.map((g) => (
              <GuardianRow
                key={g.id}
                guardian={g}
                onSetPrimary={() => setPrimary.mutate(g.id)}
                isSettingPrimary={setPrimary.isPending}
                onSetUpLogin={() => setLoginFor(g)}
                onRemove={() => setToUnlink(g)}
              />
            ))}
          </div>
        )}
      {addOpen && (
        <AddGuardianModal
          studentId={studentId}
          existingGuardianIds={(guardians ?? []).map((g) => g.id)}
          onClose={() => setAddOpen(false)}
        />
      )}
      {loginFor && (
        <ProvisionLoginModal
          studentId={studentId}
          guardian={loginFor}
          onClose={() => setLoginFor(null)}
        />
      )}

      <ConfirmDeleteModal
        open={!!toUnlink}
        title="Veliyi kaldır"
        description={
          <>
             <strong>{toUnlink && displayName(toUnlink)}</strong> bu öğrenciden kaldırılsın mı? Veli kaydı
            silinmez - bu işlem yalnızca velinin bu öğrenciyle bağını kaldırır.
          </>
        }
        subject="Veli"
        successVerb="kaldırıldı"
        confirmLabel="Kaldır"
        pendingLabel="Kaldırılıyor…"
        mutation={unlinkGuardian}
        onClose={() => setToUnlink(null)}
        onConfirm={() => {
          if (toUnlink) unlinkGuardian.mutate(toUnlink.id);
        }}
      />
    </SectionCard>
  );
}
