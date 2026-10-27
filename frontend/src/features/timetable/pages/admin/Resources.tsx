import { useMemo, useState } from "react";
import { Education, Home, Map as MapIcon, Information, Add, Edit, TrashCan } from "@carbon/icons-react";
import { Button, IconButton, Tag } from "@carbon/react";
import { useClassrooms, useCreateClassroom, useUpdateClassroom, useDeleteClassroom } from "@/features/timetable/queries/useClassrooms";
import type { Classroom, ClassroomType } from "@/features/timetable/api/classroom";
import ClassroomFormModal from "@/features/timetable/components/ClassroomFormModal";
import { EMPTY_CLASSROOM_FORM, isLabMissingSubject, type ClassroomForm } from "@/features/timetable/lib/classroomForm";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import BackfillHomeroomsButton from "@/features/timetable/components/BackfillHomeroomsButton";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import RoomAvatar from "@/features/timetable/components/RoomAvatar";
import { BAND_TAG, roomKind } from "@/features/timetable/lib/roomKind";
import { HallIcon } from "@/features/timetable/components/facilityIcons";

const RESOURCE_TYPES = [
  { key: "regular", label: "Sınıf öğretmenlikleri ve derslikler", icon: Home },
  { key: "lab", label: "Laboratuvarlar", icon: Education },
  { key: "eca", label: "Kütüphaneler, salonlar ve tesisler", icon: HallIcon },
] as const;

type ZoneKey = ClassroomType | "all";

const ZONES: { key: ZoneKey; label: string; description: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: "regular", label: "Öğrenme bloğu", description: "Sınıf öğretmenlikleri ve günlük öğretim alanları", icon: Home },
  { key: "lab", label: "Uygulamalı öğrenme", description: "Uygulamalı dersler için branş laboratuvarları", icon: Education },
  { key: "eca", label: "Ortak tesisler", description: "Kütüphaneler, salonlar, sanat, spor ve destek alanları", icon: HallIcon },
];

const FACILITY_LABEL: Record<string, string> = {
  library: "Kütüphane", scienceLab: "Fen laboratuvarı", itLab: "Bilgisayar laboratuvarı", technicalLab: "Teknik laboratuvar",
  homeEconomicsLab: "Ev ekonomisi laboratuvarı", languageLab: "Dil laboratuvarı", artRoom: "Sanat odası",
  musicRoom: "Müzik odası", danceRoom: "Dans odası", dramaRoom: "Drama odası",
  auditorium: "Çok amaçlı salon", medicalRoom: "Revir / sağlık odası", counselingRoom: "Rehberlik odası", staffRoom: "Öğretmenler odası",
};

const FACILITY_LAB_GROUPS = new Set(["scienceLab", "itLab", "technicalLab", "homeEconomicsLab", "languageLab"]);

function resourceType(resource: Classroom): ClassroomType {
  if (resource.room_type === "eca" && resource.code && FACILITY_LAB_GROUPS.has(resource.code)) return "lab";
  return resource.room_type;
}

function resourceMeta(resource: Classroom) {
  if (resource.room_type === "regular") return "Sınıf öğretmenliği";
  if (resource.room_type === "lab") return resource.subject_name ? `${resource.subject_name} laboratuvarı` : "Branş laboratuvarı";
  return resource.code ? FACILITY_LABEL[resource.code] ?? resource.code : "Tesis";
}

function resourceCapacity(resource: Classroom) {
  return resource.capacity == null ? "Kapasite belirtilmemiş" : `${resource.capacity} kişilik`;
}

function ResourceMap({ resources }: { resources: Classroom[] }) {
  const [activeZone, setActiveZone] = useState<ZoneKey>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [form, setForm] = useState<ClassroomForm>(EMPTY_CLASSROOM_FORM);
  const [toDelete, setToDelete] = useState<Classroom | null>(null);
  const createResource = useCreateClassroom();
  const updateResource = useUpdateClassroom();
  const deleteResource = useDeleteClassroom();
  const saving = editing ? updateResource : createResource;
  const visible = useMemo(() => activeZone === "all" ? resources : resources.filter((resource) => resourceType(resource) === activeZone), [activeZone, resources]);

  const openCreate = () => {
    createResource.reset();
    setEditing(null);
    setForm(EMPTY_CLASSROOM_FORM);
    setModalOpen(true);
  };
  const openEdit = (resource: Classroom) => {
    updateResource.reset();
    setEditing(resource);
    setForm({ name: resource.name, code: resource.code ?? "", capacity: resource.capacity == null ? "" : String(resource.capacity), room_type: resource.room_type, subject_id: resource.subject_id ?? "" });
    setModalOpen(true);
  };
  const save = () => {
    if (!form.name.trim() || isLabMissingSubject(form)) return;
    const data = { name: form.name.trim(), code: editing ? form.code.trim() || undefined : undefined, capacity: form.capacity.trim() ? Number(form.capacity) : null, room_type: form.room_type, subject_id: form.room_type === "lab" ? form.subject_id : null };
    if (editing) updateResource.mutate({ id: editing.id, data }, { onSuccess: () => setModalOpen(false) });
    else createResource.mutate(data, { onSuccess: () => setModalOpen(false) });
  };

  return (
    <section className="os-resource-map" aria-labelledby="resource-map-title">
      <div className="os-resource-map__header">
        <div>
          <div className="os-flex os-items-center os-gap-2">
            <MapIcon size={20} />
            <h2 id="resource-map-title">Okul kaynak haritası</h2>
            <Tag type="gray" size="sm">Şematik görünüm</Tag>
          </div>
          <p>Bu okulun yapılandırılmış odalarından ve tesislerinden otomatik düzenlenir.</p>
        </div>
      <div className="os-flex os-items-center os-gap-3">
          <BackfillHomeroomsButton size="sm" />
          <Information size={20} className="os-c-secondary" aria-label="Bu görsel bir önizlemedir, coğrafi bir kat planı değildir" />
          <Button renderIcon={Add} size="sm" kind="primary" onClick={openCreate}>Kaynak ekle</Button>
        </div>
      </div>

      <div className="os-resource-map__filters" role="group" aria-label="Kaynak haritası bölgeleri">
        <button type="button" aria-pressed={activeZone === "all"} className={activeZone === "all" ? "is-active" : ""} onClick={() => setActiveZone("all")}>Tüm kaynaklar <span>{resources.length}</span></button>
        {ZONES.map((zone) => {
          const count = resources.filter((resource) => resourceType(resource) === zone.key).length;
          return <button key={zone.key} type="button" aria-pressed={activeZone === zone.key} className={activeZone === zone.key ? "is-active" : ""} onClick={() => setActiveZone(zone.key)}>{zone.label} <span>{count}</span></button>;
        })}
      </div>

      <div className="os-resource-map__canvas">
        <div className="os-resource-map__zones">
          {ZONES.filter((zone) => activeZone === "all" || activeZone === zone.key).map((zone) => {
            const zoneResources = visible.filter((resource) => resourceType(resource) === zone.key);
            const ZoneIcon = zone.icon;
            return (
              <div key={zone.key} className={`os-resource-map__zone os-resource-map__zone--${zone.key}`}>
                <div className="os-resource-map__zone-heading">
                  <div className="os-resource-map__zone-title">
                    <span className="os-resource-map__zone-icon" aria-hidden="true"><ZoneIcon size={20} /></span>
                    <div><h3>{zone.label}</h3><p>{zone.description}</p></div>
                  </div>
                  <span className="os-resource-map__zone-count" aria-label={`${zoneResources.length} kaynak`}>{zoneResources.length}</span>
                </div>
                <div className="os-resource-map__rooms">
                  {zoneResources.length === 0 ? <span className="os-resource-map__empty">Yapılandırılmış kaynak yok</span> : zoneResources.map((resource) => (
                    <article key={resource.id} className="os-resource-map__room">
                      <RoomAvatar room={resource} />
                      <div className="os-resource-map__room-body">
                        <p className="os-resource-map__room-title" title={resource.name}>{resource.name}</p>
                        <div className="os-resource-map__room-meta">
                          <Tag type={BAND_TAG[roomKind(resource).band]} size="sm">{resourceMeta(resource)}</Tag>
                          <small>{resourceCapacity(resource)}</small>
                        </div>
                      </div>
                      <div className="os-resource-map__room-actions">
                        <IconButton label={`Düzenle: ${resource.name}`} kind="ghost" size="sm" onClick={() => openEdit(resource)}><Edit size={16} /></IconButton>
                        <IconButton label={`Sil: ${resource.name}`} kind="ghost" size="sm" onClick={() => setToDelete(resource)}><TrashCan size={16} /></IconButton>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalOpen && <ClassroomFormModal editing={!!editing} form={form} onChange={setForm} isPending={saving.isPending} isError={saving.isError} error={saving.error} onClose={() => setModalOpen(false)} onSubmit={save} />}
      <ConfirmDeleteModal open={!!toDelete} title="Kaynağı sil" description={<><strong>{toDelete?.name}</strong> silinsin mi? Bu işlem geri alınamaz.</>} subject="Kaynak" successVerb="silindi" confirmLabel="Sil" pendingLabel="Siliniyor…" mutation={deleteResource} onClose={() => setToDelete(null)} onConfirm={() => toDelete && deleteResource.mutate(toDelete.id)} />
    </section>
  );
}

export default function Resources() {
  const { data: classrooms, isLoading, isError, refetch } = useClassrooms();

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Okul kaynakları</h1>
          <p className="os-page__subtitle">Sınıf öğretmenliklerini, kütüphaneleri, salonları, laboratuvarları ve diğer tesisleri tek yerden görüntüleyin ve yönetin.</p>
        </div>
      </div>

      {isLoading ? <LoadingSpinner label="Okul kaynakları yükleniyor…" /> : isError ? <ErrorMessage message="Okul kaynakları yüklenemedi." onRetry={refetch} /> : (
        <>
          <div className="os-grid os-grid-cols-3 os-gap-4 os-mb-6">
            {RESOURCE_TYPES.map(({ key, label, icon: Icon }) => (
              <div key={key} className="os-bg-layer os-border os-p-5">
                <div className="os-flex os-items-center os-gap-2 os-mb-3">
                  <Icon size={20} className="os-fill-accent" />
                  <span className="os-text-sm os-fw-600 os-c-secondary">{label}</span>
                </div>
                <strong className="os-text-4xl os-fw-300 os-c-primary">{classrooms?.filter((room) => resourceType(room) === key).length ?? 0}</strong>
              </div>
            ))}
          </div>
          <ResourceMap resources={classrooms ?? []} />
        </>
      )}
    </div>
  );
}
