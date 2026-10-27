import type { useRunCurriculumPreset } from "@/features/curriculum/queries/useCurriculumPreset";
import FormModal from "@/shared/ui/FormModal";

interface Props {
  open: boolean;
  runPreset: ReturnType<typeof useRunCurriculumPreset>;
  onClose: () => void;
  onLoad: () => void;
}

export default function PresetConfirmModal({ open, runPreset, onClose, onLoad }: Props) {
  return (
    <FormModal
      open={open}
      title="Sri Lanka müfredat ön ayarını yükle"
      onClose={onClose}
      onSubmit={onLoad}
      isPending={runPreset.isPending}
      submitLabel="Ön ayarı yükle"
      pendingLabel="Yükleniyor…"
      isError={runPreset.isError}
      error={runPreset.error}
      errorFallback="Müfredat ön ayarı yüklenemedi"
    >
      <p className="os-text-md os-c-secondary os-mb-3">
        Bu işlem standart 1-13. sınıf müfredatını oluşturur - ilkokul ve ilk ortaokul için zorunlu dersler,
        10. sınıf (O/L) ders sepetleri ve 12. sınıf (A/L) alanları - dersler, seviyeler ve seçim grupları olarak.
      </p>
      <p className="os-text-md os-c-secondary">
        Yalnızca okulunuzun fiilen sahip olduğu sınıf seviyeleri için eksikleri doldurur - birden fazla
        çalıştırmak güvenlidir ve elle kurduğunuz hiçbir şeye dokunmaz.
      </p>
    </FormModal>
  );
}
