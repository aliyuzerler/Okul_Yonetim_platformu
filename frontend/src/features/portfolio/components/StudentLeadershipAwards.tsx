import { useState } from "react";
import { Button, TextInput } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import {
  useLeadershipRoles,
  useCreateLeadershipRole,
  useDeleteLeadershipRole,
  useStudentAwards,
  useCreateStudentAward,
  useDeleteStudentAward,
} from "@/features/portfolio/queries/useStudentPortfolio";
import { todayISODate } from "@/shared/lib/date";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import DateField from "@/shared/ui/DateField";

export default function StudentLeadershipAwards({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();

  const { data: roles, isLoading: rolesLoading } = useLeadershipRoles(studentId);
  const createRole = useCreateLeadershipRole(studentId);
  const deleteRole = useDeleteLeadershipRole(studentId);
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [pendingDeleteRoleId, setPendingDeleteRoleId] = useState<string | null>(null);

  const { data: awards, isLoading: awardsLoading } = useStudentAwards(studentId);
  const createAward = useCreateStudentAward(studentId);
  const deleteAward = useDeleteStudentAward(studentId);
  const [awardTitle, setAwardTitle] = useState("");
  const [awardDate, setAwardDate] = useState(todayISODate());
  const [pendingDeleteAwardId, setPendingDeleteAwardId] = useState<string | null>(null);

  const addRole = () => {
    if (!title.trim() || !currentYear) return;
    createRole.mutate(
      { academic_year_id: currentYear.id, title: title.trim(), scope: scope.trim() || undefined },
      { onSuccess: () => { setTitle(""); setScope(""); } },
    );
  };

  const addAward = () => {
    if (!awardTitle.trim() || !currentYear) return;
    createAward.mutate(
      { academic_year_id: currentYear.id, title: awardTitle.trim(), awarded_date: new Date(awardDate).toISOString() },
      { onSuccess: () => setAwardTitle("") },
    );
  };

  return (
    <>
      <div className="os-section os-mt-4">
        <div className="os-section__header">
          <h2 className="os-section__title">Liderlik rolleri</h2>
        </div>
        <div className="os-section__body">
          <MutationErrorNotification
            isError={createRole.isError}
            error={createRole.error}
            title="Rol eklenemedi" fallback="Lütfen yeniden deneyin." className="os-mb-4"
          />
          <div className="os-grid os-grid-form-2-auto os-gap-3 os-items-grid-end os-mb-6">
            <TextInput id="leadership-title" labelText="Ünvan" placeholder="örn. Münazara Kulübü Başkanı" value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextInput id="leadership-scope" labelText="Kapsam (isteğe bağlı)" value={scope} onChange={(e) => setScope(e.target.value)} />
            <Button renderIcon={Add} kind="primary" size="md" onClick={addRole} disabled={!title.trim() || createRole.isPending}>Ekle</Button>
          </div>
          {!rolesLoading && (roles?.length ?? 0) === 0 && <EmptyState title="Henüz liderlik rolü yok" description="Temsilci kurulu dışındaki roller (kulüp başkanı, spor kaptanı vb.)." />}
          {roles?.map((r) => (
            <div key={r.id} className="os-list-row os-list-row--compact os-justify-between">
              <div>
                <span className="os-fw-500 os-text-md">{r.title}</span>
                {r.scope && <span className="os-ml-2 os-text-sm os-c-tertiary">{r.scope}</span>}
              </div>
              <RemoveIconButton label="Sil" onClick={() => setPendingDeleteRoleId(r.id)} />
            </div>
          ))}
        </div>
      </div>

      <ConfirmDeleteModal
        open={pendingDeleteRoleId !== null}
        title="Liderlik rolünü sil"
        description="Bu liderlik rolü kalıcı olarak kaldırılır. Bu işlem geri alınamaz."
        subject="Liderlik rolü"
        mutation={deleteRole}
        onClose={() => setPendingDeleteRoleId(null)}
        onConfirm={() => {
          if (pendingDeleteRoleId) deleteRole.mutate(pendingDeleteRoleId);
        }}
      />

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Ödüller ve başarılar</h2>
        </div>
        <div className="os-section__body">
          <MutationErrorNotification
            isError={createAward.isError}
            error={createAward.error}
            title="Ödül eklenemedi" fallback="Lütfen yeniden deneyin." className="os-mb-4"
          />
          <div className="os-grid os-grid-form-1-12-auto os-gap-3 os-items-grid-end os-mb-6">
            <TextInput id="award-title" labelText="Ödül adı" value={awardTitle} onChange={(e) => setAwardTitle(e.target.value)} />
            <DateField value={awardDate} onChange={(ymd) => {
              if (ymd) setAwardDate(ymd);
            }} id="award-date" labelText="Tarih" />
            <Button renderIcon={Add} kind="primary" size="md" onClick={addAward} disabled={!awardTitle.trim() || createAward.isPending}>Ekle</Button>
          </div>
          {!awardsLoading && (awards?.length ?? 0) === 0 && <EmptyState title="Henüz ödül yok" description="Bu öğrenci için ödül ve başarı ekleyin." />}
          {awards?.map((a) => (
            <div key={a.id} className="os-list-row os-list-row--compact os-justify-between">
              <div>
                <span className="os-fw-500 os-text-md">{a.title}</span>
                <span className="os-ml-2 os-text-sm os-c-tertiary">{a.awarded_date}</span>
              </div>
              <RemoveIconButton label="Sil" onClick={() => setPendingDeleteAwardId(a.id)} />
            </div>
          ))}
        </div>
      </div>

      <ConfirmDeleteModal
        open={pendingDeleteAwardId !== null}
        title="Ödülü sil"
        description="Bu ödül kalıcı olarak kaldırılır. Bu işlem geri alınamaz."
        subject="Ödül"
        mutation={deleteAward}
        onClose={() => setPendingDeleteAwardId(null)}
        onConfirm={() => {
          if (pendingDeleteAwardId) deleteAward.mutate(pendingDeleteAwardId);
        }}
      />
    </>
  );
}
