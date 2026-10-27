import { useState } from "react";
import { Button, Select, SelectItem } from "@carbon/react";
import { useActivationSettings, useGenerateCodes } from "@/features/activation/queries/useActivation";
import type { ActivationRole, GeneratedBatch } from "@/features/activation/api/activation";
import { useCurrentClasses } from "@/features/academics/queries/useClasses";
import IssuedBatchPanel from "@/features/activation/components/IssuedBatchPanel";
import SectionCard from "@/shared/ui/SectionCard";
import ConfirmActionModal from "@/shared/ui/ConfirmActionModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import { ROLE_LABELS } from "@/features/activation/lib/roles";


// Issues codes and shows them once; after leaving this card they can only be reissued, not viewed.
export default function GenerateCodesCard() {
  const { data: settings } = useActivationSettings();
  const { data: classes } = useCurrentClasses();
  const generate = useGenerateCodes();
  const [chosenRole, setChosenRole] = useState<ActivationRole | null>(null);
  const [classId, setClassId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [batch, setBatch] = useState<GeneratedBatch | null>(null);

  const enabled = (["student", "parent"] as const).filter((r) => (r === "student" ? settings?.student_enabled : settings?.parent_enabled));
  const role = enabled.find((r) => r === chosenRole) ?? enabled[0];

  const run = () => {
    setConfirming(false);
    if (!role) return;
    generate.mutate({ role, class_id: classId || undefined }, { onSuccess: setBatch });
  };

  return (
    <SectionCard title="Etkinleştirme kodları">
      {!role ? (
        <p className="os-text-sm os-c-secondary os-m-0">Kod üretmek için yukarıda öğrenciler veya veliler için kendi kendine etkinleştirmeyi açın.</p>
      ) : (
        <>
          <p className="os-text-sm os-c-secondary os-mt-0 os-mb-4">
            Giriş bilgisi olmayan her kişi bir kod alır. Aynı kişiler için yeniden üretim, önceki kodlarını geçersiz kılar.
          </p>
          <div className="os-grid os-grid-cols-2 os-gap-5 os-mb-5">
            <Select id="codes-role" labelText="Hesap türü" value={role} onChange={(e) => setChosenRole(e.target.value as ActivationRole)}>
              {enabled.map((r) => <SelectItem key={r} value={r} text={ROLE_LABELS[r].many} />)}
            </Select>
            <Select id="codes-class" labelText="Sınıf (güncel yıl)" helperText="Veliler için çocuğunun sınıfı." value={classId} onChange={(e) => setClassId(e.target.value)}>
              <SelectItem value="" text="Giriş bilgisi olmayan herkes" />
              {classes?.map((c) => <SelectItem key={c.id} value={c.id} text={c.name} />)}
            </Select>
          </div>
          <Button kind="primary" size="md" onClick={() => setConfirming(true)} disabled={generate.isPending}>
            {generate.isPending ? "Üretiliyor…" : "Kod üret"}
          </Button>
        </>
      )}
      <MutationErrorNotification isError={generate.isError} error={generate.error} title="Kodlar üretilemedi" className="os-mt-4" />

      {batch && (
        <div className="os-mt-5">
          <IssuedBatchPanel batch={batch} onDone={() => setBatch(null)} />
        </div>
      )}

      <ConfirmActionModal
        open={confirming}
        title="Etkinleştirme kodları üretilecek mi?"
        description={`Giriş bilgisi olmayan ${role ? ROLE_LABELS[role].many.toLowerCase() : ""}${classId ? " (seçilen sınıf)" : ""} için yeni kodlar üretilecek. Halihazırda sahip oldukları kodlar geçersiz olur.`}
        confirmLabel="Üret"
        onClose={() => setConfirming(false)}
        onConfirm={run}
      />
    </SectionCard>
  );
}
