import { useState } from "react";
import { Button, Select, SelectItem, TextInput, Tag } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import {
  useStudentActivities,
  useCreateStudentActivity,
  useDeleteStudentActivity,
} from "@/features/portfolio/queries/useStudentPortfolio";
import { useStudentSocietyMemberships } from "@/features/portfolio/queries/useSocieties";
import { ACTIVITY_CATEGORIES } from "@/features/portfolio/api/studentPortfolio";
import type { ActivityCategory } from "@/features/portfolio/api/studentPortfolio";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

const SOCIETY_ROLE_LABELS: Record<string, string> = {
  leader: "Lider",
  deputy_leader: "Lider yardımcısı",
  secretary: "Sekreter",
  treasurer: "Sayman",
  member: "Üye",
};

function StudentSocietyMemberships({ studentId }: { studentId: string }) {
  const { data: memberships, isLoading, isError, refetch } = useStudentSocietyMemberships(studentId);

  if (isLoading) return null;

  if (isError) {
    return (
      <div className="os-mb-6">
        <ErrorMessage message="Topluluk üyelikleri yüklenemedi." onRetry={refetch} />
      </div>
    );
  }

  if ((memberships?.length ?? 0) === 0) return null;

  return (
    <div className="os-mb-6">
      <h3 className="os-text-xs os-fw-600 os-uppercase os-c-tertiary os-mt-0 os-mx-0 os-mb-2">
        Topluluk üyelikleri
      </h3>
      {memberships?.map((m) => (
        <div key={m.id} className="os-list-row os-list-row--compact os-gap-2h">
          <Tag size="sm" type="purple">{SOCIETY_ROLE_LABELS[m.role] ?? m.role}</Tag>
          <span className="os-fw-500 os-text-md">{m.society_name}</span>
          <span className="os-text-sm os-c-tertiary">{m.academic_year_label}</span>
        </div>
      ))}
    </div>
  );
}

export default function StudentActivities({ studentId }: { studentId: string }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: activities, isLoading } = useStudentActivities(studentId);
  const createActivity = useCreateStudentActivity(studentId);
  const deleteActivity = useDeleteStudentActivity(studentId);

  const [category, setCategory] = useState<ActivityCategory | "">("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!category || !name.trim() || !currentYear) return;
    createActivity.mutate(
      {
        academic_year_id: currentYear.id,
        category,
        name: name.trim(),
        role: role.trim() || undefined,
      },
      { onSuccess: () => { setName(""); setRole(""); } },
    );
  };

  return (
    <div className="os-section os-mt-4">
      <div className="os-section__header">
        <h2 className="os-section__title">Etkinlikler</h2>
        <span className="os-text-xs os-c-tertiary">Kulüpler, spor, topluluklar ve yarışmalar</span>
      </div>
      <div className="os-section__body">
        <StudentSocietyMemberships studentId={studentId} />

        <MutationErrorNotification
          isError={createActivity.isError}
          error={createActivity.error}
          title="Etkinlik eklenemedi" fallback="Lütfen yeniden deneyin." className="os-mb-4"
        />

        <div className="os-grid os-grid-form-10-1-10-auto os-gap-3 os-items-grid-end os-mb-6">
          <Select id="activity-category" labelText="Kategori" value={category} onChange={(e) => setCategory(e.target.value as ActivityCategory)}>
            <SelectItem value="" text="Seçin…" />
            {ACTIVITY_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value} text={c.label} />
            ))}
          </Select>
          <TextInput id="activity-name" labelText="Ad" value={name} onChange={(e) => setName(e.target.value)} />
          <TextInput id="activity-role" labelText="Rol (isteğe bağlı)" value={role} onChange={(e) => setRole(e.target.value)} />
          <Button renderIcon={Add} kind="primary" size="md" onClick={handleAdd} disabled={!category || !name.trim() || createActivity.isPending}>
            Ekle
          </Button>
        </div>

        {!isLoading && (activities?.length ?? 0) === 0 && (
          <EmptyState title="Henüz etkinlik yok" description="Bu öğrencinin katıldığı kulüp, spor, topluluk veya yarışmaları ekleyin." />
        )}

        {activities?.map((a) => (
          <div key={a.id} className="os-list-row os-list-row--compact os-justify-between">
            <div className="os-flex os-items-center os-gap-2h">
              <Tag size="sm" type="gray">{ACTIVITY_CATEGORIES.find((c) => c.value === a.category)?.label ?? a.category}</Tag>
              <span className="os-fw-500 os-text-md">{a.name}</span>
              {a.role && <span className="os-text-sm os-c-tertiary">{a.role}</span>}
            </div>
            <RemoveIconButton label="Sil" onClick={() => setPendingDeleteId(a.id)} />
          </div>
        ))}
      </div>

      <ConfirmDeleteModal
        open={pendingDeleteId !== null}
        title="Etkinliği sil"
        description="Bu etkinlik kaydı kalıcı olarak kaldırılır. Bu işlem geri alınamaz."
        subject="Etkinlik"
        mutation={deleteActivity}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId) deleteActivity.mutate(pendingDeleteId);
        }}
      />
    </div>
  );
}
