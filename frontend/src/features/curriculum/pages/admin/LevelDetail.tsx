/* eslint-disable max-lines */
import { useMemo, useState } from "react";
import { useBlocker, useNavigate, useParams } from "react-router";
import { Add, ArrowLeft } from "@carbon/icons-react";
import { Button, InlineNotification } from "@carbon/react";
import {
  useLevelTree,
  useMediums,
  useCreateSelectionGroup,
  useUpdateSelectionGroup,
  useDeleteSelectionGroup,
  useAddGroupSubject,
  useRemoveGroupSubject,
} from "@/features/curriculum/queries/useCurriculum";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import type { CurriculumTreeGroup, GroupSubject } from "@/features/curriculum/api/curriculum";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import ConfirmActionModal from "@/shared/ui/ConfirmActionModal";
import GroupsList from "@/features/curriculum/components/GroupsList";
import GroupFormModal, { type GroupForm } from "@/features/curriculum/components/GroupFormModal";
import AddSubjectModal, { type SubjectForm } from "@/features/curriculum/components/AddSubjectModal";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import InfoTip from "@/shared/ui/InfoTip";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";

const EMPTY_GROUP: GroupForm = { label: "", min_select: 1, max_select: 1, sort_order: 0 };
const EMPTY_SUBJECT: SubjectForm = {
  subject_id: "",
  medium_id: "",
  prerequisite_note: "",
  sort_order: 0,
};

export default function LevelDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const { data: tree, isLoading, isError, refetch } = useLevelTree(id);
  usePageTitle(tree?.level.label);
  const { data: subjects, isLoading: subjectsLoading, isError: subjectsError, refetch: refetchSubjects } = useSubjects();
  const { data: mediums } = useMediums();

  const createGroup = useCreateSelectionGroup(id);
  const updateGroup = useUpdateSelectionGroup(id);
  const deleteGroup = useDeleteSelectionGroup(id);
  const addSubject = useAddGroupSubject(id);
  const removeSubject = useRemoveGroupSubject(id);

  const [groupModal, setGroupModal] = useState<"create" | "edit" | null>(null);
  const [editingGroup, setEditingGroup] = useState<CurriculumTreeGroup | null>(null);
  const [groupForm, setGroupForm] = useState(EMPTY_GROUP);

  const [subjectModalGroup, setSubjectModalGroup] = useState<CurriculumTreeGroup | null>(null);
  const [subjectForm, setSubjectForm] = useState(EMPTY_SUBJECT);

  const [toDeleteGroup, setToDeleteGroup] = useState<CurriculumTreeGroup | null>(null);
  const [toRemoveSubject, setToRemoveSubject] = useState<{
    group: CurriculumTreeGroup;
    subject: GroupSubject;
  } | null>(null);
  const [subjectChanges, setSubjectChanges] = useState<Record<string, GroupSubject[]>>({});
  const [subjectsDirty, setSubjectsDirty] = useState(false);
  const [savingSubjects, setSavingSubjects] = useState(false);
  const [subjectsSaveError, setSubjectsSaveError] = useState(false);
  // Covers refresh/close; useBlocker covers Back, sidebar links and history back/forward.
  useUnsavedChangesGuard(subjectsDirty);
  const blocker = useBlocker(subjectsDirty);

  const draftTree = useMemo(
    () => tree ? { ...tree, groups: tree.groups.map((group) => ({ ...group, subjects: subjectChanges[group.id] ?? group.subjects })) } : null,
    [tree, subjectChanges],
  );

  // subjects not already in the group being edited
  const available = useMemo(() => {
    if (!subjects || !subjectModalGroup) return [];
    const taken = new Set((subjectChanges[subjectModalGroup.id] ?? subjectModalGroup.subjects).map((s) => s.subject_id));
    return subjects.filter((s) => !taken.has(s.id));
  }, [subjects, subjectModalGroup, subjectChanges]);

  const openCreateGroup = () => {
    createGroup.reset();
    setGroupForm(EMPTY_GROUP);
    setEditingGroup(null);
    setGroupModal("create");
  };

  const openEditGroup = (g: CurriculumTreeGroup) => {
    updateGroup.reset();
    setGroupForm({
      label: g.label,
      min_select: g.min_select,
      max_select: g.max_select,
      sort_order: g.sort_order,
    });
    setEditingGroup(g);
    setGroupModal("edit");
  };

  const handleSaveGroup = () => {
    const data = {
      label: groupForm.label.trim(),
      min_select: groupForm.min_select,
      max_select: groupForm.max_select,
      sort_order: groupForm.sort_order,
    };

    if (groupModal === "create") {
      createGroup.mutate(data, { onSuccess: () => setGroupModal(null) });
    } else if (editingGroup) {
      updateGroup.mutate({ groupId: editingGroup.id, data }, { onSuccess: () => setGroupModal(null) });
    }
  };

  const openAddSubject = (g: CurriculumTreeGroup) => {
    addSubject.reset();
    // Max existing + 1, not length, so a gap from a deleted subject doesn't hand out a colliding sort_order.
    const nextSortOrder = g.subjects.reduce((max, s) => Math.max(max, s.sort_order), -1) + 1;
    setSubjectForm({ ...EMPTY_SUBJECT, sort_order: nextSortOrder });
    setSubjectModalGroup(g);
  };

  const handleAddSubject = () => {
    if (!subjectModalGroup) return;
    const subject = subjects?.find((item) => item.id === subjectForm.subject_id);
    if (!subject) return;
    const current = subjectChanges[subjectModalGroup.id] ?? subjectModalGroup.subjects;
    if (current.some((item) => item.subject_id === subject.id)) return;
    const medium = mediums?.find((item) => item.id === subjectForm.medium_id);
    const staged: GroupSubject = {
      subject_id: subject.id,
      subject_name: subject.name,
      subject_code: subject.code,
      subject_type: subject.type,
      medium_id: medium?.id ?? null,
      medium_name: medium?.name ?? null,
      prerequisite_note: subjectForm.prerequisite_note.trim() || null,
      sort_order: subjectForm.sort_order,
    };
    setSubjectChanges((draft) => ({ ...draft, [subjectModalGroup.id]: [...current, staged] }));
    setSubjectsDirty(true);
    setSubjectsSaveError(false);
    setSubjectModalGroup(null);
  };

  const handleRemoveSubject = () => {
    if (!toRemoveSubject) return;
    const { group, subject } = toRemoveSubject;
    setSubjectChanges((draft) => ({
      ...draft,
      [group.id]: (draft[group.id] ?? group.subjects).filter((item) => item.subject_id !== subject.subject_id),
    }));
    setSubjectsDirty(true);
    setSubjectsSaveError(false);
    setToRemoveSubject(null);
  };

  const saveSubjects = async () => {
    if (!tree) return;
    setSavingSubjects(true);
    setSubjectsSaveError(false);
    try {
      for (const group of tree.groups) {
        const original = group.subjects;
        const next = subjectChanges[group.id] ?? original;
        const nextIds = new Set(next.map((subject) => subject.subject_id));
        const originalIds = new Set(original.map((subject) => subject.subject_id));

        for (const subject of original) {
          if (!nextIds.has(subject.subject_id)) {
            await removeSubject.mutateAsync({ groupId: group.id, subjectId: subject.subject_id });
          }
        }
        for (const subject of next) {
          if (!originalIds.has(subject.subject_id)) {
            await addSubject.mutateAsync({
              groupId: group.id,
              data: {
                subject_id: subject.subject_id,
                medium_id: subject.medium_id ?? undefined,
                prerequisite_note: subject.prerequisite_note ?? undefined,
                sort_order: subject.sort_order,
              },
            });
          }
        }
      }
      setSubjectsDirty(false);
      setSubjectChanges({});
    } catch {
      setSubjectsSaveError(true);
    } finally {
      setSavingSubjects(false);
    }
  };

  const handleDeleteGroup = () => {
    if (!toDeleteGroup) return;
    deleteGroup.mutate(toDeleteGroup.id);
  };

  if (isLoading) return <LoadingSpinner />;
  if (isError || !tree) {
    return (
      <div className="os-page">
        <ErrorMessage message="Bu seviye yüklenemedi." onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">{tree.level.label}</h1>
          <div className="os-page__subtitle os-page__subtitle--tip">
            Ders grupları ve her birinin seçim kuralı.
            <InfoTip>Tüm dersleri zorunlu yapmak için en az ve en çok değerlerini gruptaki ders sayısına eşitleyin.</InfoTip>
          </div>
        </div>
        <div className="os-flex os-gap-2">
          <Button renderIcon={ArrowLeft} kind="ghost" size="md" onClick={() => navigate("/curriculum")}>
            Geri
          </Button>
          <Button renderIcon={Add} kind="primary" size="md" onClick={openCreateGroup}>
            Yeni grup
          </Button>
          <Button kind="primary" size="md" disabled={!subjectsDirty || savingSubjects} onClick={() => void saveSubjects()}>
            {savingSubjects ? "Dersler kaydediliyor…" : "Dersleri kaydet"}
          </Button>
        </div>
      </div>

      {subjectsDirty && (
        <InlineNotification
          kind="info"
          title="Kaydedilmemiş ders değişiklikleri"
          subtitle="Aşağıdaki gruplara ders ekleyin veya gruptan çıkarın, sonra bunları birlikte kaydedin."
          lowContrast
          hideCloseButton
          className="os-mb-4"
        />
      )}
      {subjectsSaveError && (
        <InlineNotification
          kind="error"
          title="Dersler kaydedilemedi"
          subtitle="Bazı değişiklikler kaydedilmemiş olabilir. Grupları gözden geçirin ve yeniden deneyin."
          lowContrast
          onClose={() => setSubjectsSaveError(false)}
          className="os-mb-4"
        />
      )}

      <GroupsList
        tree={draftTree!}
        deleteGroup={deleteGroup}
        removeSubject={removeSubject}
        onOpenCreateGroup={openCreateGroup}
        onEditGroup={openEditGroup}
        onRequestDeleteGroup={setToDeleteGroup}
        onAddSubject={openAddSubject}
        onRequestRemoveSubject={(group, subject) => setToRemoveSubject({ group, subject })}
      />

      <GroupFormModal
        groupModal={groupModal}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        createGroup={createGroup}
        updateGroup={updateGroup}
        onClose={() => setGroupModal(null)}
        onSave={handleSaveGroup}
      />

      <AddSubjectModal
        subjectModalGroup={subjectModalGroup}
        subjects={subjects}
        subjectsLoading={subjectsLoading}
        subjectsError={subjectsError}
        onRetrySubjects={refetchSubjects}
        available={available}
        mediums={mediums}
        subjectForm={subjectForm}
        setSubjectForm={setSubjectForm}
        addSubject={addSubject}
        onClose={() => setSubjectModalGroup(null)}
        onAdd={handleAddSubject}
      />

      <ConfirmActionModal
        open={!!toRemoveSubject}
        title="Dersi gruptan çıkar"
        description={
          <>
            <strong>{toRemoveSubject?.subject.subject_name}</strong>, {" "}
            <strong>{toRemoveSubject?.group.label}</strong> grubundan çıkarılsın mı? Ders katalogda kalır.
          </>
        }
        confirmLabel="Gruptan çıkar"
        danger
        onClose={() => setToRemoveSubject(null)}
        onConfirm={handleRemoveSubject}
      />

      <ConfirmDeleteModal
        open={!!toDeleteGroup}
        title="Seçim grubunu sil"
        description={
          <>
            <strong>{toDeleteGroup?.label}</strong> silinsin mi? Dersleri katalogda kalır.
          </>
        }
        subject="Seçim grubu"
        mutation={deleteGroup}
        onClose={() => setToDeleteGroup(null)}
        onConfirm={handleDeleteGroup}
      />

      <ConfirmActionModal
        open={blocker.state === "blocked"}
        title="Kaydedilmemiş ders değişiklikleri var"
        description="Değişiklikleri kaydetmeden bu sayfadan ayrılırsanız yaptığınız ders değişiklikleri kaybolur."
        confirmLabel="Sayfadan ayrıl"
        danger
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      />
    </div>
  );
}
