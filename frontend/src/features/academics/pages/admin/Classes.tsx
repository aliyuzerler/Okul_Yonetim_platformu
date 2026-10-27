import { useState } from "react";
import { Add } from "@carbon/icons-react";
import { Button, InlineNotification } from "@carbon/react";
import type { Grade } from "@/features/academics/api/grade";
import type { ClassWithDetails } from "@/features/academics/api/class";
import { useGradesPage } from "@/features/academics/hooks/useGradesPage";
import GradeGroup, { GradeGroupSkeleton } from "@/features/academics/components/GradeGroup";
import GradeFormModal from "@/features/academics/components/GradeFormModal";
import ClassFormModal from "@/features/academics/components/ClassFormModal";
import EditClassModal from "@/features/academics/components/EditClassModal";
import { useUpdateClass } from "@/features/academics/queries/useClasses";
import { useMediums } from "@/features/curriculum/queries/useCurriculum";
import { useClassrooms } from "@/features/timetable/queries/useClassrooms";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import SectionCard from "@/shared/ui/SectionCard";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import AgentFindingsBanner from "@/features/notifications/components/AgentFindingsBanner";
export default function Classes() {
  const page = useGradesPage();
  const { orderedGrades, classesByGrade, mutations, form } = page;
  const { createGrade, updateGrade, deleteGrade, reorder, deleteClass } = mutations;
  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassWithDetails | null>(null);
  const [classModalGradeId, setClassModalGradeId] = useState<string | null>(null);
  const [classToEdit, setClassToEdit] = useState<ClassWithDetails | null>(null);
  const [nameEdit, setNameEdit] = useState("");
  const [mediumEdit, setMediumEdit] = useState("");
  const [homeClassroomEdit, setHomeClassroomEdit] = useState("");
  const updateClass = useUpdateClass(classToEdit?.id ?? "");
  const { data: mediums } = useMediums();
  const { data: classrooms } = useClassrooms();

  const busy = reorder.isPending;
  const isLoading = page.grades.isLoading || page.classes.isLoading;
  const isError = page.grades.isError || page.classes.isError;
  const isEdit = form.gradeModal === "edit";
  const saving = isEdit ? updateGrade : createGrade;
  const openEditClass = (cls: ClassWithDetails) => {
    updateClass.reset();
    setClassToEdit(cls);
    setNameEdit(cls.name);
    setMediumEdit(cls.medium_id ?? "");
    setHomeClassroomEdit(cls.home_classroom_id ?? "");
  };
  const closeEditClass = () => setClassToEdit(null);
  const saveClass = () => {
    const name = nameEdit.trim();
    if (!name || !classToEdit) return;
    updateClass.mutate(
      { name, form_teacher_id: classToEdit.form_teacher_id, medium_id: mediumEdit || null, home_classroom_id: homeClassroomEdit || null },
      { onSuccess: closeEditClass },
    );
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Sınıf seviyeleri ve sınıflar</h1>
          <p className="os-page__subtitle">Güncel eğitim-öğretim yılında sınıf seviyeleri ve bu seviyelere bağlı sınıflar.</p>
        </div>
        <div className="os-flex os-gap-3">
          <Button renderIcon={Add} kind="secondary" size="md" onClick={page.openCreateGrade}>Sınıf seviyesi ekle</Button>
          <Button renderIcon={Add} kind="primary" size="md" onClick={() => setClassModalGradeId("")}>Sınıf ekle</Button>
        </div>
      </div>

      <AgentFindingsBanner />

      <SectionCard
        title="Sınıf seviyesi listesi"
        meta={!isLoading && !isError && <span className="os-section__meta">{orderedGrades.length} sınıf seviyesi</span>}
        flush
      >

        {(deleteGrade.isError || deleteClass.isError || reorder.isError) && (
          <div className="os-pt-4 os-px-6 os-pb-0">
            <MutationErrorNotification isError={deleteGrade.isError} error={deleteGrade.error} title="Sınıf seviyesi silinemedi" fallback="Sınıf seviyesi bir sınıf veya müfredat düzeyi tarafından kullanılıyor olabilir." onClose={() => deleteGrade.reset()} />
            <MutationErrorNotification isError={deleteClass.isError} error={deleteClass.error} title="Sınıf silinemedi" fallback="Sınıfta hâlâ kayıtlı öğrenciler olabilir." onClose={() => deleteClass.reset()} />
            <MutationErrorNotification isError={reorder.isError} error={reorder.error} title="Sıralama güncellenemedi" fallback="Lütfen yeniden deneyin." onClose={() => reorder.reset()} />
          </div>
        )}

        {isError && (
          <div className="os-py-5 os-px-6">
            <ErrorMessage message="Sınıf seviyeleri ve sınıflar yüklenemedi." onRetry={() => { page.grades.refetch(); page.classes.refetch(); }} />
          </div>
        )}

        {!isLoading && !isError && page.needsRenumber && orderedGrades.length > 0 && (
          <div className="os-flex os-items-center os-gap-2 os-wrap os-pt-4 os-px-6 os-pb-0">
            <InlineNotification
              kind="warning"
              title={page.duplicateCount > 0 ? `${page.duplicateCount} sınıf seviyesi aynı konumu paylaşıyor` : "Konumlarda boşluklar var"}
              subtitle="Aşağıda gösterilen sıraya göre yeniden numaralandırın."
              lowContrast
              hideCloseButton
              className="os-max-w-full os-m-0 os-flex-1"
            />
            <Button kind="tertiary" size="sm" disabled={busy} onClick={() => reorder.mutate(orderedGrades)}>
              {busy ? "Düzeltiliyor…" : "Sıralamayı düzelt"}
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="os-py-4 os-px-6">
            {Array.from({ length: 4 }).map((_, i) => <GradeGroupSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && !isError && orderedGrades.length === 0 && (
          <EmptyState
            title="Henüz sınıf seviyesi yok"
            description="Okulun yürüttüğü sınıf seviyelerini ekleyin, ardından her birinin altında sınıflar oluşturun."
            action={<Button renderIcon={Add} kind="primary" onClick={page.openCreateGrade}>Sınıf seviyesi ekle</Button>}
          />
        )}

        {!isLoading && orderedGrades.length > 0 && (
          <div className={`os-flex os-col os-gap-4 os-py-4 os-px-6${busy ? " os-opacity-60" : ""}`}>
              {orderedGrades.map((g, i) => (
                <GradeGroup
                  key={g.id}
                  grade={g}
                  index={i}
                  isLast={i === orderedGrades.length - 1}
                  from={page.range.from}
                  to={page.range.to}
                  busy={busy}
                  classes={classesByGrade.get(g.id) ?? []}
                  onMoveUp={() => page.move(i, -1)}
                  onMoveDown={() => page.move(i, 1)}
                  onEditGrade={() => page.openEditGrade(g)}
                  onDeleteGrade={() => setGradeToDelete(g)}
                  onDeleteClass={setClassToDelete}
                  onAddClass={setClassModalGradeId}
                  onEditClass={openEditClass}
                  streamName={page.streamName}
                  streamGroupName={page.streamGroupName}
                  teacherName={page.teacherName}
                />
              ))}
          </div>
        )}
      </SectionCard>

      {form.gradeModal && (
        <GradeFormModal
          mode={form.gradeModal}
          name={form.gradeName}
          onNameChange={form.setGradeName}
          nameTouched={form.gradeNameTouched}
          onNameBlur={() => form.setGradeNameTouched(true)}
          onClose={form.closeModal}
          onSubmit={page.saveGrade}
          isPending={saving.isPending}
          isError={saving.isError}
          error={saving.error}
        />
      )}

      {classModalGradeId !== null && <ClassFormModal key={classModalGradeId} open gradeId={classModalGradeId} onClose={() => setClassModalGradeId(null)} />}

      <EditClassModal
        open={!!classToEdit}
        nameEdit={nameEdit}
        onNameEditChange={setNameEdit}
        mediumEdit={mediumEdit}
        onMediumEditChange={setMediumEdit}
        mediums={mediums}
        homeClassroomEdit={homeClassroomEdit}
        onHomeClassroomEditChange={setHomeClassroomEdit}
        classrooms={classrooms}
        updateClass={updateClass}
        onClose={closeEditClass}
        onSave={saveClass}
      />

      <ConfirmDeleteModal
        open={!!gradeToDelete}
        title="Sınıf seviyesini sil"
        description={<><strong>{gradeToDelete?.name}</strong> silinsin mi? Bir sınıf veya müfredat düzeyi tarafından kullanılıyorsa silme işlemi engellenir.</>}
        subject="Sınıf seviyesi"
        mutation={deleteGrade}
        onClose={() => setGradeToDelete(null)}
        onConfirm={() => gradeToDelete && deleteGrade.mutate(gradeToDelete.id)}
      />

      <ConfirmDeleteModal
        open={!!classToDelete}
        title="Sınıfı sil"
        description={<><strong>{classToDelete?.name}</strong> silinsin mi? Sınıfta hâlâ kayıtlı öğrenciler varken silme işlemi engellenir.</>}
        subject="Sınıf"
        mutation={deleteClass}
        onClose={() => setClassToDelete(null)}
        onConfirm={() => classToDelete && deleteClass.mutate(classToDelete.id)}
      />
    </div>
  );
}
