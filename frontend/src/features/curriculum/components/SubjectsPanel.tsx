import { useMemo, useState } from "react";
import { Add, Edit, TrashCan } from "@carbon/icons-react";
import { Button, IconButton, Tag } from "@carbon/react";
import { useSubjects, useUpdateSubject, useDeleteSubject } from "@/features/curriculum/queries/useSubjects";
import type { Subject } from "@/features/curriculum/api/subject";
import EditSubjectModal, { type SubjectForm } from "@/features/curriculum/components/EditSubjectModal";
import CreateSubjectModal from "@/features/curriculum/components/CreateSubjectModal";
import DataGrid, { type GridColumn } from "@/shared/ui/DataGrid";
import FilterBar from "@/shared/ui/FilterBar";
import ListState from "@/shared/ui/ListState";
import TableSkeleton from "@/shared/ui/TableSkeleton";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import { useListFilters } from "@/shared/hooks/useListFilters";

type SubjectTagType = "blue" | "cyan" | "teal" | "purple" | "magenta" | "green" | "gray";

function subjectTypeTag(type: string): SubjectTagType {
  const value = type.trim().toLowerCase();
  if (value.includes("core") || value.includes("compulsory")) return "blue";
  if (value.includes("language")) return "purple";
  if (value.includes("aesthetic") || value.includes("art") || value.includes("music")) return "magenta";
  if (value.includes("practical") || value.includes("technical")) return "teal";
  if (value.includes("elective")) return "cyan";
  if (value.includes("religion") || value.includes("ethic")) return "green";
  return "gray";
}

export default function SubjectsPanel() {
  const { data: subjects, isLoading, isError, refetch } = useSubjects();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  const { filters, set, debouncedSearch } = useListFilters({ query: "" });

  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState<SubjectForm>({ name: "", code: "", type: "", max_marks: 100 });
  const [touched, setTouched] = useState<{ name?: boolean; code?: boolean }>({});
  const [toDelete, setToDelete] = useState<Subject | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return (subjects ?? []).filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || (s.type ?? "").toLowerCase().includes(q));
  }, [subjects, debouncedSearch]);
  const searching = debouncedSearch.trim().length > 0;

  const openEdit = (s: Subject) => {
    updateSubject.reset();
    setForm({ name: s.name, code: s.code, type: s.type ?? "", max_marks: s.max_marks });
    setTouched({});
    setEditing(s);
  };

  const update = () => {
    setTouched({ name: true, code: true });
    if (!editing || !form.name.trim() || !form.code.trim()) return;
    updateSubject.mutate(
      { id: editing.id, data: { name: form.name.trim(), code: form.code.trim(), type: form.type.trim(), max_marks: form.max_marks } },
      { onSuccess: () => setEditing(null) },
    );
  };

  const columns: GridColumn<Subject>[] = [
    { key: "code", header: "Kod", render: (s) => <span className="os-table__mono">{s.code}</span> },
    { key: "name", header: "Ders", render: (s) => s.name },
    { key: "type", header: "Tür", render: (s) => (s.type ? <Tag type={subjectTypeTag(s.type)} size="sm">{s.type}</Tag> : <span className="os-table__muted">-</span>) },
    { key: "max", header: "En yüksek puan", render: (s) => s.max_marks },
    {
      key: "actions",
      header: "İşlemler",
      align: "end",
      render: (s) => (
        <div className="os-grid__actions">
          <IconButton label="Düzenle" kind="ghost" size="sm" onClick={() => openEdit(s)}><Edit /></IconButton>
          <IconButton label="Sil" kind="ghost" size="sm" onClick={() => setToDelete(s)}><TrashCan /></IconButton>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="os-flex os-items-center os-justify-between os-gap-4 os-wrap os-my-4">
        <p className="os-m-0 os-text-sm os-c-secondary">Okulun ders kataloğu. Bir dersi öğrencilere sunmak için müfredat sekmesindeki bir seçim grubuna ekleyin.</p>
        <Button renderIcon={Add} kind="primary" size="md" onClick={() => setCreateOpen(true)}>Ders ekle</Button>
      </div>

      <div className="os-section">
        <FilterBar search={{ value: filters.query, onChange: (v) => set("query", v), placeholder: "Ad, kod veya türe göre ara…" }} />
        <MutationErrorNotification isError={deleteSubject.isError} error={deleteSubject.error} title="Ders silinemedi" fallback="Ders, bir sınıf veya müfredat grubu tarafından kullanılıyor olabilir." onClose={() => deleteSubject.reset()} className="os-section__notice" />
        {isError ? (
          <div className="os-p-5">
            <ErrorMessage message="Dersler yüklenemedi." onRetry={refetch} />
          </div>
        ) : <ListState
          isLoading={isLoading}
          isError={false}
          isEmpty={filtered.length === 0}
          errorMessage="Dersler yüklenemedi."
          onRetry={refetch}
          skeleton={<TableSkeleton headers={columns.map((c) => c.header)} />}
          empty={{
            title: searching ? "Ders bulunamadı" : "Henüz ders yok",
            description: searching ? `"${debouncedSearch}" ile eşleşen ders yok.` : "Müfredat gruplarını yapılandırmadan önce okulunuzda okutulan dersleri ekleyin.",
            action: searching ? undefined : <Button renderIcon={Add} kind="primary" onClick={() => setCreateOpen(true)}>Ders ekle</Button>,
          }}
        >
          <DataGrid rows={filtered} columns={columns} getRowId={(s) => s.id} countLabel={(shown, total) => `Toplam ${total} dersten ${shown} tanesi gösteriliyor`} />
        </ListState>}
      </div>

      <CreateSubjectModal open={createOpen} subjects={subjects ?? []} onClose={() => setCreateOpen(false)} />

      {editing && (
        <EditSubjectModal form={form} onChange={setForm} touched={touched} onTouch={(f) => setTouched((t) => ({ ...t, [f]: true }))} isPending={updateSubject.isPending} isError={updateSubject.isError} error={updateSubject.error} onClose={() => setEditing(null)} onSubmit={update} />
      )}

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Dersi sil"
        description={<><strong>{toDelete?.name}</strong> ({toDelete?.code}) silinsin mi? Bu işlem geri alınamaz; ders bir sınıf veya müfredat grubu tarafından kullanılıyorsa silme engellenir.</>}
        subject="Ders"
        mutation={deleteSubject}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteSubject.mutate(toDelete.id)}
      />
    </div>
  );
}
