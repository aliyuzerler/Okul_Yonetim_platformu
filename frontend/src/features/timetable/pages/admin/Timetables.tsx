import { useState } from "react";
import { useNavigate } from "react-router";
import { Add } from "@carbon/icons-react";
import { Button, Tag, SkeletonText, OverflowMenu, OverflowMenuItem } from "@carbon/react";
import { TIMETABLE_STATUS_TAG } from "@/shared/lib/constants/tags";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import { formatDateTime } from "@/shared/lib/date";
import FormModal from "@/shared/ui/FormModal";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import {
  useTimetablesByYear,
  useCreateTimetable,
  useCopyTimetable,
  useReviseTimetable,
  useDeleteTimetable,
} from "@/features/timetable/queries/useTimetables";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import type { TimetableWithClass } from "@/features/timetable/api/timetable";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import InfoTip from "@/shared/ui/InfoTip";

const statusTag = (st: string) => TIMETABLE_STATUS_TAG[st as keyof typeof TIMETABLE_STATUS_TAG];

export default function Timetables({ inline = false }: { inline?: boolean }) {
  const navigate = useNavigate();
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: classes } = useCurrentClasses();
  const yearId = currentYear?.id ?? "";
  const { data: timetables, isLoading, isError, refetch } = useTimetablesByYear(yearId);
  const createTimetable = useCreateTimetable();
  const copyTimetable = useCopyTimetable();
  const reviseTimetable = useReviseTimetable();
  const deleteTimetable = useDeleteTimetable();

  const [newClassId, setNewClassId] = useState("");

  const [copySource, setCopySource] = useState<TimetableWithClass | null>(null);
  const [copyTargetClassId, setCopyTargetClassId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TimetableWithClass | null>(null);

  const handleCreate = () => {
    if (!yearId || !newClassId) return;
    createTimetable.mutate(
      { academic_year_id: yearId, class_id: newClassId },
      { onSuccess: (tt) => navigate(`/timetables/${tt.id}`) },
    );
  };

  const openCopy = (t: TimetableWithClass) => {
    copyTimetable.reset();
    setCopyTargetClassId("");
    setCopySource(t);
  };

  const handleCopy = () => {
    if (!yearId || !copySource || !copyTargetClassId) return;
    copyTimetable.mutate(
      { academic_year_id: yearId, class_id: copyTargetClassId, source_timetable_id: copySource.id },
      { onSuccess: (tt) => navigate(`/timetables/${tt.id}`) },
    );
  };

  const handleRevise = (t: TimetableWithClass) => {
    reviseTimetable.mutate(t.id, { onSuccess: (tt) => navigate(`/timetables/${tt.id}`) });
  };


  const columns: GridColumn<TimetableWithClass>[] = [
    { key: "grade", header: "Sınıf seviyesi", render: (t) => t.grade_name },
    { key: "class", header: "Sınıf", render: (t) => t.class_name },
    { key: "version", header: "Sürüm", render: (t) => `v${t.version}` },
    { key: "status", header: "Durum", render: (t) => <Tag type={statusTag(t.status)?.type ?? "gray"} size="sm">{statusTag(t.status)?.label ?? t.status}</Tag> },
    { key: "updated", header: "Son güncelleme", render: (t) => formatDateTime(t.updated_at) },
    {
      key: "menu",
      header: "",
      align: "end",
      render: (t) => (
        <div onClick={(e) => e.stopPropagation()}>
          <OverflowMenu size="sm" flipped>
            <OverflowMenuItem itemText="Başka bir sınıfa kopyala" onClick={() => openCopy(t)} />
            {t.status === "published" && <OverflowMenuItem itemText="Revize et (yeni taslak)" onClick={() => handleRevise(t)} />}
            <OverflowMenuItem itemText="Sil" isDelete onClick={() => { deleteTimetable.reset(); setDeleteTarget(t); }} />
          </OverflowMenu>
        </div>
      ),
    },
  ];

  return (
    <div className={inline ? "" : "os-page"}>
      {!inline && (
        <div className="os-page__header">
          <div className="os-page__header-left">
            <h1 className="os-page__title">Ders programları</h1>
            <div className="os-page__subtitle os-page__subtitle--tip">
              {currentYear?.label ?? "güncel eğitim-öğretim yılı"} için sınıf ders programları.
              <InfoTip>Yalnızca yayınlanmış sürüm öğretmenlere, öğrencilere ve velilere gösterilir.</InfoTip>
            </div>
          </div>
        </div>
      )}

      <div className="os-section os-p-6">
        <div className="os-flex os-gap-3 os-items-end os-mb-6">
          <div className="os-w-20">
            <EntityCombobox
              id="new-timetable-class"
              items={classes ?? []}
              selectedId={newClassId}
              onSelect={setNewClassId}
              getId={(c) => c.id}
              itemToString={(c) => `${c.grade_name} - ${c.name}`}
              labelText="Bir sınıf için taslak ders programı oluştur"
              placeholder="Sınıflarda ara…"
            />
          </div>
          <Button renderIcon={Add} kind="primary" onClick={handleCreate} disabled={!newClassId || createTimetable.isPending}>
            {createTimetable.isPending ? "Oluşturuluyor…" : "Yeni taslak"}
          </Button>
        </div>

        <MutationErrorNotification
          isError={createTimetable.isError}
          error={createTimetable.error}
          title="Ders programı oluşturulamadı"
          onClose={() => createTimetable.reset()} className="os-mb-4"
        />
        <MutationErrorNotification
          isError={reviseTimetable.isError}
          error={reviseTimetable.error}
          title="Ders programı revize edilemedi"
          onClose={() => reviseTimetable.reset()} className="os-mb-4"
        />
        <MutationErrorNotification
          isError={deleteTimetable.isError}
          error={deleteTimetable.error}
          title="Ders programı silinemedi"
          onClose={() => deleteTimetable.reset()} className="os-mb-4"
        />

        {!currentYear ? (
          <EmptyState title="Güncel eğitim-öğretim yılı yok" description="Önce bir eğitim-öğretim yılını güncel olarak ayarlayın." />
        ) : isLoading ? (
          <SkeletonText width="40%" />
        ) : isError ? (
          <ErrorMessage message="Ders programları yüklenemedi." onRetry={refetch} />
        ) : !timetables || timetables.length === 0 ? (
          <EmptyState title="Henüz ders programı yok" description="Başlamak için yukarıda bir sınıf için taslak ders programı oluşturun." />
        ) : (
          <DataGrid rows={timetables} columns={columns} getRowId={(t) => t.id} pageSize={20} onRowClick={(t) => navigate(`/timetables/${t.id}`)} />
        )}
      </div>

      <FormModal
        open={!!copySource}
        title="Ders programını kopyala"
        onClose={() => setCopySource(null)}
        onSubmit={handleCopy}
        isPending={copyTimetable.isPending}
        pendingLabel="Kopyalanıyor…"
        submitLabel="Kopyala"
        submitDisabled={!copyTargetClassId}
        isError={copyTimetable.isError}
        error={copyTimetable.error}
        errorFallback="Ders programı kopyalanamadı"
      >
        <p className="os-text-sm os-c-secondary os-mb-4">
          {copySource?.grade_name} - {copySource?.class_name} sınıfının ders saatlerini başka bir sınıf için yeni bir taslağa kopyalar; örneğin yeni bir yılda 6A&apos;nın ders programını 7A&apos;ya taşımak gibi.
        </p>
        <EntityCombobox id="copy-target-class" labelText="Hedef sınıf" items={classes ?? []} selectedId={copyTargetClassId} onSelect={setCopyTargetClassId} getId={(c) => c.id} itemToString={(c) => `${c.grade_name} - ${c.name}`} placeholder="Sınıflarda ara…" />
      </FormModal>

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Ders programını sil"
        description={
          <>
            {deleteTarget?.grade_name} - {deleteTarget?.class_name} v{deleteTarget?.version} ders programı silinsin mi?
            Bu işlem geri alınamaz.
          </>
        }
        subject="Ders programı"
        successVerb="silindi"
        confirmLabel="Sil"
        pendingLabel="Siliniyor…"
        mutation={deleteTimetable}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteTimetable.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
