import { useState } from "react";
import { Add, Edit, TrashCan } from "@carbon/icons-react";
import { Button, IconButton, Tag } from "@carbon/react";
import { useClassrooms, useCreateClassroom, useUpdateClassroom, useDeleteClassroom } from "@/features/timetable/queries/useClassrooms";
import type { Classroom, ClassroomType } from "@/features/timetable/api/classroom";
import ClassroomFormModal from "@/features/timetable/components/ClassroomFormModal";
import { EMPTY_CLASSROOM_FORM, isLabMissingSubject, type ClassroomForm } from "@/features/timetable/lib/classroomForm";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import InfoTip from "@/shared/ui/InfoTip";
import BackfillHomeroomsButton from "@/features/timetable/components/BackfillHomeroomsButton";

const TYPE_LABEL: Record<ClassroomType, string> = { regular: "Sınıf öğretmenliği", lab: "Branş laboratuvarı", eca: "Tesis" };
const TYPE_TAG: Record<ClassroomType, "gray" | "purple" | "teal"> = { regular: "gray", lab: "purple", eca: "teal" };
const FACILITY_LABEL: Record<string, string> = {
  library: "Kütüphane",
  scienceLab: "Fen laboratuvarı",
  itLab: "Bilgisayar laboratuvarı",
  technicalLab: "Teknik laboratuvar",
  homeEconomicsLab: "Ev ekonomisi laboratuvarı",
  languageLab: "Dil laboratuvarı",
  artRoom: "Sanat odası",
  musicRoom: "Müzik odası",
  danceRoom: "Dans odası",
  dramaRoom: "Drama odası",
  auditorium: "Çok amaçlı salon",
  medicalRoom: "Revir / sağlık odası",
  counselingRoom: "Rehberlik odası",
  staffRoom: "Öğretmenler odası",
};

export default function Classrooms({ inline = false }: { inline?: boolean }) {
  const { data: classrooms, isLoading, isError, refetch } = useClassrooms();
  const createClassroom = useCreateClassroom();
  const updateClassroom = useUpdateClassroom();
  const deleteClassroom = useDeleteClassroom();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [form, setForm] = useState<ClassroomForm>(EMPTY_CLASSROOM_FORM);
  const [toDelete, setToDelete] = useState<Classroom | null>(null);
  const saving = editing ? updateClassroom : createClassroom;

  const openCreate = () => {
    createClassroom.reset();
    setForm(EMPTY_CLASSROOM_FORM);
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (c: Classroom) => {
    updateClassroom.reset();
    setForm({ name: c.name, code: c.code ?? "", capacity: c.capacity != null ? String(c.capacity) : "", room_type: c.room_type, subject_id: c.subject_id ?? "" });
    setEditing(c);
    setModalOpen(true);
  };

  const save = () => {
    if (!form.name.trim() || isLabMissingSubject(form)) return;
    const data = {
      name: form.name.trim(),
      // Preserve setup's internal facility category when editing; new rooms
      // do not expose or require a separate code.
      code: editing ? form.code.trim() || undefined : undefined,
      capacity: form.capacity.trim() ? Number(form.capacity) : null,
      room_type: form.room_type,
      subject_id: form.room_type === "lab" ? form.subject_id : null,
    };
    const close = { onSuccess: () => setModalOpen(false) };
    if (editing) updateClassroom.mutate({ id: editing.id, data }, close);
    else createClassroom.mutate(data, close);
  };

  const columns: GridColumn<Classroom>[] = [
    { key: "name", header: "Ad", render: (c) => c.name },
    { key: "category", header: "Kategori", render: (c) => c.room_type === "eca" && c.code ? FACILITY_LABEL[c.code] ?? c.code : <span className="os-table__muted">-</span> },
    { key: "capacity", header: "Kapasite", render: (c) => c.capacity ?? <span className="os-table__muted">-</span> },
    { key: "type", header: "Tür", render: (c) => <Tag type={TYPE_TAG[c.room_type]} size="sm">{TYPE_LABEL[c.room_type]}{c.room_type === "lab" && c.subject_name ? ` - ${c.subject_name}` : ""}</Tag> },
    {
      key: "actions",
      header: "İşlemler",
      align: "end",
      render: (c) => (
        <div className="os-grid__actions">
          <IconButton label="Düzenle" kind="ghost" size="sm" onClick={() => openEdit(c)}><Edit /></IconButton>
          <IconButton label="Sil" kind="ghost" size="sm" onClick={() => setToDelete(c)}><TrashCan /></IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className={inline ? "" : "os-page"}>
      {!inline && (
        <div className="os-page__header">
          <div className="os-page__header-left">
            <h1 className="os-page__title">Derslikler ve tesisler</h1>
            <div className="os-page__subtitle os-page__subtitle--tip">
              Ders programlarında kullanılan sınıf öğretmenlikleri, laboratuvarlar ve diğer odalar.
              <InfoTip>Odalar ders saatlerine atanır; böylece iki sınıf asla çakışmaz.</InfoTip>
            </div>
          </div>
          <div className="os-flex os-gap-2">
            <BackfillHomeroomsButton />
            <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>Derslik ekle</Button>
          </div>
        </div>
      )}
      {inline && (
        <div className="os-flex os-justify-between os-items-center os-mb-4 os-wrap os-gap-4">
          <p className="os-m-0 os-text-md os-c-secondary">Normal sınıf öğretmenlikleri, branşa bağlı laboratuvarlar ve ECA tesisleri.</p>
          <div className="os-flex os-gap-2">
            <BackfillHomeroomsButton size="sm" />
            <Button renderIcon={Add} kind="primary" size="sm" onClick={openCreate}>Derslik ekle</Button>
          </div>
        </div>
      )}

      <div className="os-section">
        <MutationErrorNotification isError={deleteClassroom.isError} error={deleteClassroom.error} title="Derslik silinemedi" fallback="Hâlâ bir ders programında kullanılıyor olabilir." onClose={() => deleteClassroom.reset()} className="os-section__notice os-mt-4" />
        <ListState
          isLoading={isLoading}
          isError={isError}
          isEmpty={!classrooms?.length}
          errorMessage="Derslikler yüklenemedi"
          onRetry={refetch}
          skeleton={<TableSkeleton headers={columns.map((c) => c.header)} />}
          empty={{ title: "Henüz derslik yok", description: "Ders programı düzenleyicisinin onları ders saatlerine atayabilmesi için oda/laboratuvar ekleyin.", action: <Button renderIcon={Add} kind="primary" onClick={openCreate}>Derslik ekle</Button> }}
        >
          <DataGrid rows={classrooms ?? []} columns={columns} getRowId={(c) => c.id} pageSize={20} countLabel={(shown, total) => `${total} odadan ${shown} gösteriliyor`} />
        </ListState>
      </div>

      {modalOpen && <ClassroomFormModal editing={!!editing} form={form} onChange={setForm} isPending={saving.isPending} isError={saving.isError} error={saving.error} onClose={() => setModalOpen(false)} onSubmit={save} />}

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Dersliği sil"
        description={<><strong>{toDelete?.name}</strong> silinsin mi? Bu işlem geri alınamaz.</>}
        subject="Derslik"
        successVerb="silindi"
        confirmLabel="Sil"
        pendingLabel="Siliniyor…"
        mutation={deleteClassroom}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteClassroom.mutate(toDelete.id)}
      />
    </div>
  );
}
