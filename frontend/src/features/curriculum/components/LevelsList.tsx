import { Link } from "react-router";
import { Add, ChevronRight, Copy, Edit, Layers } from "@carbon/icons-react";
import { Button, Tag } from "@carbon/react";
import type { useLevels, useDeleteLevel } from "@/features/curriculum/queries/useCurriculum";
import type { useGrades } from "@/features/academics/queries/useGrades";
import type { Level } from "@/features/curriculum/api/curriculum";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import ListRowSkeleton from "@/shared/ui/ListRowSkeleton";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import SectionHeader from "@/shared/ui/SectionHeader";

interface Props {
  levels: ReturnType<typeof useLevels>["data"];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  grades: ReturnType<typeof useGrades>["data"];
  deleteLevel: ReturnType<typeof useDeleteLevel>;
  onOpenCreate: () => void;
  onEdit: (level: Level) => void;
  onDuplicate: (level: Level) => void;
  onRequestDelete: (level: Level) => void;
}

export default function LevelsList({
  levels,
  isLoading,
  isError,
  refetch,
  grades,
  deleteLevel,
  onOpenCreate,
  onEdit,
  onDuplicate,
  onRequestDelete,
}: Props) {
  const gradeName = (id: string | null) => grades?.find((g) => g.id === id)?.name ?? null;

  return (
    <div className="os-section">
      <SectionHeader
        title="Seviyeler"
        meta={levels && <span className="os-section__meta">Toplam {levels.length}</span>}
      />

      {isLoading && (
        <div>
          {Array.from({ length: 4 }).map((_, i) => (
            <ListRowSkeleton key={i} titleWidth="30%" subtitleWidth="15%" trailingWidth="4rem" />
          ))}
        </div>
      )}
      {isError && <ErrorMessage message="Seviyeler yüklenemedi." onRetry={refetch} />}

      <MutationErrorNotification
        isError={deleteLevel.isError}
        error={deleteLevel.error}
        title="Seviye silinemedi"
        fallback="Seviyedeki gruplar aracılığıyla kayıtlı öğrenciler olabilir."
        onClose={() => deleteLevel.reset()} className="os-mt-0 os-mx-6 os-mb-4"
      />

      {!isLoading && !isError && levels?.length === 0 && (
        <EmptyState
          title="Henüz seviye yok"
          description="Farklı ders kurallarının geçerli olduğu her yer için bir seviye oluşturun - örneğin her sınıf seviyesi veya her alan için bir seviye."
          action={
            <Button renderIcon={Add} kind="primary" onClick={onOpenCreate}>
              Yeni seviye
            </Button>
          }
        />
      )}

      {!isLoading && levels && levels.length > 0 && (
        <div>
          {levels.map((l) => (
            <div key={l.id} className="os-list-row">
              <Layers size={20} className="os-fill-accent os-shrink-0" />
              <div className="os-flex-1">
                <p className="os-mt-0 os-mx-0 os-mb-h os-fw-600 os-text-md os-c-primary">
                  {l.label}
                </p>
                <p className="os-m-0 os-text-xs os-c-secondary">Sıra {l.sort_order}</p>
              </div>
              {gradeName(l.grade_id) ? (
                <Tag type="teal" size="sm">
                  {gradeName(l.grade_id)}
                </Tag>
              ) : (
                <Tag type="gray" size="sm">
                  Sınıf seviyesi yok
                </Tag>
              )}
              <Button kind="ghost" size="sm" renderIcon={ChevronRight} as={Link} to={`/curriculum/${l.id}`}>
                Yapılandır
              </Button>
              <Button kind="ghost" size="sm" renderIcon={Edit} onClick={() => onEdit(l)}>
                Düzenle
              </Button>
              <Button kind="ghost" size="sm" renderIcon={Copy} onClick={() => onDuplicate(l)}>
                Kopyala
              </Button>
              <Button kind="danger--ghost" size="sm" onClick={() => onRequestDelete(l)}>
                Sil
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
