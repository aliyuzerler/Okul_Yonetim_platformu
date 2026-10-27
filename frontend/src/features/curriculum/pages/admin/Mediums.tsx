import { useState } from "react";
import { Add, Language } from "@carbon/icons-react";
import {
  Button,
  TextInput,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@carbon/react";
import {
  useMediums,
  useCreateMedium,
  useUpdateMedium,
  useDeleteMedium,
} from "@/features/curriculum/queries/useCurriculum";
import type { Medium } from "@/features/curriculum/api/curriculum";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import SectionHeader from "@/shared/ui/SectionHeader";
import ListRowSkeleton from "@/shared/ui/ListRowSkeleton";
import InfoTip from "@/shared/ui/InfoTip";

export default function Mediums() {
  const { data: mediums, isLoading, isError, refetch } = useMediums();
  const createMedium = useCreateMedium();
  const updateMedium = useUpdateMedium();
  const deleteMedium = useDeleteMedium();

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Medium | null>(null);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [toDelete, setToDelete] = useState<Medium | null>(null);

  const openCreate = () => {
    createMedium.reset();
    setName("");
    setNameTouched(false);
    setEditing(null);
    setModal("create");
  };

  const openEdit = (m: Medium) => {
    updateMedium.reset();
    setName(m.name);
    setNameTouched(false);
    setEditing(m);
    setModal("edit");
  };

  const handleSave = () => {
    setNameTouched(true);
    if (!name.trim()) return;
    const data = { name: name.trim() };
    if (modal === "create") {
      createMedium.mutate(data, { onSuccess: () => setModal(null) });
    } else if (editing) {
      updateMedium.mutate(
        { id: editing.id, data },
        { onSuccess: () => setModal(null) },
      );
    }
  };

  const handleDelete = () => {
    if (!toDelete) return;
    deleteMedium.mutate(toDelete.id);
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Öğretim dilleri</h1>
          <div className="os-page__subtitle os-page__subtitle--tip">
            Derslerin öğretildiği diller.
            <InfoTip>Bir seçim grubundaki dersi tek bir dille sınırlamak için bunları kullanın.</InfoTip>
          </div>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={openCreate}>
          Yeni öğretim dili
        </Button>
      </div>

      <div className="os-section">
        <SectionHeader
          title="Öğretim dilleri"
          meta={mediums && <span className="os-section__meta">Toplam {mediums.length}</span>}
        />

        {isLoading && (
          <div>
            {Array.from({ length: 3 }).map((_, i) => (
              <ListRowSkeleton key={i} leadingWidth="1.5rem" titleWidth="30%" subtitleWidth={null} trailingWidth={null} />
            ))}
          </div>
        )}
        {isError && (
          <ErrorMessage message="Öğretim dilleri yüklenemedi." onRetry={refetch} />
        )}

        <MutationErrorNotification
          isError={deleteMedium.isError}
          error={deleteMedium.error}
          title="Öğretim dili silinemedi"
          fallback="Öğretim dili, bir grup dersi veya kayıt tarafından kullanılıyor olabilir."
          onClose={() => deleteMedium.reset()} className="os-mt-0 os-mx-6 os-mb-4"
        />

        {!isLoading && !isError && mediums?.length === 0 && (
          <EmptyState
            title="Henüz öğretim dili yok"
            description="Okulunuzun öğretim yaptığı dilleri ekleyin, örneğin Sinhala, Tamil veya İngilizce."
            action={
              <Button renderIcon={Add} kind="primary" onClick={openCreate}>
                Yeni öğretim dili
              </Button>
            }
          />
        )}

        {!isLoading && mediums && mediums.length > 0 && (
          <div>
            {mediums.map((m) => (
              <div key={m.id} className="os-list-row">
                <Language size={20} className="os-fill-accent os-shrink-0" />
                <span className="os-flex-1 os-fw-600 os-text-md os-c-primary">
                  {m.name}
                </span>
                <Button kind="ghost" size="sm" onClick={() => openEdit(m)}>
                  Düzenle
                </Button>
                <Button
                  kind="danger--ghost"
                  size="sm"
                  onClick={() => setToDelete(m)}
                >
                  Sil
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ComposedModal open={!!modal} size="sm" onClose={() => setModal(null)} aria-label={modal === "create" ? "Yeni öğretim dili" : "Öğretim dilini düzenle"}>
        <ModalHeader title={modal === "create" ? "Yeni öğretim dili" : "Öğretim dilini düzenle"} />
        <ModalBody>
          <MutationErrorNotification
            isError={createMedium.isError || updateMedium.isError}
            error={createMedium.error ?? updateMedium.error}
            title="Öğretim dili kaydedilemedi" fallback="Lütfen yeniden deneyin." className="os-mb-4"
          />
          <TextInput
            id="medium-name"
            labelText="Ad"
            placeholder="örn. İngilizce"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setNameTouched(true)}
            invalid={nameTouched && !name.trim()}
            invalidText="Öğretim dili adı zorunludur."
          />
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setModal(null)}>
            İptal
          </Button>
          <Button
            kind="primary"
            onClick={handleSave}
            disabled={
              !name.trim() || createMedium.isPending || updateMedium.isPending
            }
          >
            {createMedium.isPending || updateMedium.isPending
              ? "Kaydediliyor…"
              : "Kaydet"}
          </Button>
        </ModalFooter>
      </ComposedModal>

      <ConfirmDeleteModal
        open={!!toDelete}
        title="Öğretim dilini sil"
        description={
          <>
            <strong>{toDelete?.name}</strong> silinsin mi? Bu işlem geri alınamaz.
          </>
        }
        subject="Öğretim dili"
        mutation={deleteMedium}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
