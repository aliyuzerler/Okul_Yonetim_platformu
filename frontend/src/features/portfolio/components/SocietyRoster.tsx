import { useState } from "react";
import { Add } from "@carbon/icons-react";
import {
  Button,
  Select,
  SelectItem,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SkeletonText,
} from "@carbon/react";
import { Link } from "react-router";
import { useStudents } from "@/features/students/queries/useStudents";
import { useSocietyMembers, useAssignSocietyMember, useRemoveSocietyMember } from "@/features/portfolio/queries/useSocieties";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import type { SocietyMember, SocietyRole } from "@/features/portfolio/api/society";
import { displayName } from "@/shared/lib/name";

const ROLES: { value: SocietyRole; label: string; singular: string }[] = [
  { value: "leader", label: "Liderler", singular: "Lider" },
  { value: "deputy_leader", label: "Lider yardımcıları", singular: "Lider yardımcısı" },
  { value: "secretary", label: "Sekreterler", singular: "Sekreter" },
  { value: "treasurer", label: "Saymanlar", singular: "Sayman" },
  { value: "member", label: "Üyeler", singular: "Üye" },
];

interface Props {
  societyId: string;
  readOnly?: boolean;
}

// Roster editor shared by the admin Societies page and the teacher My Society page; the backend enforces who may mutate.
export default function SocietyRoster({ societyId, readOnly }: Props) {
  const { data: members, isLoading, isError, refetch } = useSocietyMembers(societyId);
  const [studentSearch, setStudentSearch] = useState("");
  const { data: studentPage } = useStudents({ limit: 25, search: studentSearch });
  const assignMember = useAssignSocietyMember(societyId);
  const removeMember = useRemoveSocietyMember(societyId);

  const [assignOpen, setAssignOpen] = useState(false);
  const [studentChoice, setStudentChoice] = useState("");
  const [roleChoice, setRoleChoice] = useState<SocietyRole>("member");
  const [memberToRemove, setMemberToRemove] = useState<SocietyMember | null>(null);

  const openAssign = () => {
    assignMember.reset();
    setStudentChoice("");
    setRoleChoice("member");
    setAssignOpen(true);
  };

  const handleAssign = () => {
    if (!studentChoice) return;
    assignMember.mutate(
      { student_id: studentChoice, role: roleChoice },
      { onSuccess: () => setAssignOpen(false) },
    );
  };

  const confirmRemove = () => {
    if (!memberToRemove) return;
    removeMember.mutate({ memberId: memberToRemove.id, studentId: memberToRemove.student_id });
  };

  const byRole = (role: SocietyRole) => (members ?? []).filter((m) => m.role === role);
  const memberStudentIds = new Set((members ?? []).map((m) => m.student_id));
  const availableStudents = (studentPage?.items ?? []).filter((s) => !memberStudentIds.has(s.id));

  if (isError) {
    return <ErrorMessage message="Üye listesi yüklenemedi." onRetry={refetch} />;
  }

  return (
    <div className="os-society-roster">
      <div className="os-flex os-justify-end os-mb-4">
        {!readOnly && (
          <Button renderIcon={Add} kind="primary" size="sm" onClick={openAssign}>
            Üye ekle
          </Button>
        )}
      </div>

      <MutationErrorNotification
        isError={removeMember.isError}
        error={removeMember.error}
        title="Üye çıkarılamadı"
        fallback="Lütfen yeniden deneyin."
        onClose={() => removeMember.reset()}
      />

      {isLoading ? (
        <SkeletonText width="40%" />
      ) : (members ?? []).length === 0 ? (
        <EmptyState title="Henüz üye yok" description="Bu topluluğun kadrosuna bir öğrenci ekleyin." />
      ) : (
        ROLES.map(({ value, label }) =>
          byRole(value).length === 0 ? null : (
            <div key={value} className="os-mb-4">
              <div className="os-flex os-items-center os-gap-2 os-mb-1">
                <h3 className="os-text-xs os-fw-600 os-uppercase os-c-tertiary os-m-0">
                  {label}
                </h3>
                <span className="os-text-xs os-c-tertiary">{byRole(value).length}</span>
              </div>
              {byRole(value).map((m) => (
                <div key={m.id} className="os-list-row os-list-row--compact os-society-member-row">
                  <div className="os-flex-1 os-min-w-0">
                    <Link to={`/students/${m.student_id}`} className="os-table__link os-text-md os-fw-500">
                      {m.student_name}
                    </Link>
                    <p className="os-mt-h os-mx-0 os-mb-0 os-text-xs os-c-secondary">
                      {[m.grade_name, m.student_index].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {!readOnly && (
                    <RemoveIconButton disabled={removeMember.isPending} onClick={() => setMemberToRemove(m)} />
                  )}
                </div>
              ))}
            </div>
          ),
        )
      )}

      <ComposedModal open={assignOpen} size="sm" onClose={() => setAssignOpen(false)} aria-label="Topluluğa üye ekle">
        <ModalHeader title="Topluluğa üye ekle" />
        <ModalBody>
          <MutationErrorNotification
            isError={assignMember.isError}
            error={assignMember.error}
            title="Üye eklenemedi" fallback="Lütfen yeniden deneyin."
          />
          <div className="os-grid os-gap-4">
            <EntityCombobox
              id="society-member-student"
              labelText="Öğrenci"
              items={availableStudents}
              selectedId={studentChoice}
              onSelect={setStudentChoice}
              onSearch={setStudentSearch}
              getId={(s) => s.id}
              itemToString={(s) => `${displayName(s)} - ${s.index_number}`}
              placeholder="Ada veya okul numarasına göre öğrenci ara…"
            />
            <Select
              id="society-member-role"
              labelText="Rol"
              value={roleChoice}
              onChange={(e) => setRoleChoice(e.target.value as SocietyRole)}
            >
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value} text={r.singular} />
              ))}
            </Select>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setAssignOpen(false)}>
            İptal
          </Button>
          <Button kind="primary" onClick={handleAssign} disabled={!studentChoice || assignMember.isPending}>
            {assignMember.isPending ? "Kaydediliyor…" : "Ekle"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      <ConfirmDeleteModal
        open={!!memberToRemove}
        title="Üyeyi kaldır"
        description={
          <>
            <strong>{memberToRemove?.student_name}</strong>, bu topluluktan kaldırılsın mı?
          </>
        }
        confirmLabel="Kaldır"
        pendingLabel="Kaldırılıyor…"
        subject="Üye"
        successVerb="kaldırıldı"
        mutation={removeMember}
        onClose={() => setMemberToRemove(null)}
        onConfirm={confirmRemove}
      />
    </div>
  );
}
