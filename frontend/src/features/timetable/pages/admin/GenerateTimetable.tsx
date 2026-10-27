// Generates draft timetables for every class in a grade section at once; unsatisfiable periods are reported as gaps.

import { useState } from "react";
import { Link } from "react-router";
import { Button, Select, SelectItem, Tag, SkeletonText } from "@carbon/react";
import { Rocket } from "@carbon/icons-react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useGradeSections } from "@/features/timetable/queries/useGradeSections";
import { useGenerateTimetables } from "@/features/timetable/queries/useGenerate";
import EmptyState from "@/shared/ui/EmptyState";
import type { ClassGenerationResult } from "@/features/timetable/api/generate";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import InfoTip from "@/shared/ui/InfoTip";

function ClassResultCard({ result }: { result: ClassGenerationResult }) {
  if (result.skipped) {
    return (
      <div className="os-section os-py-4 os-px-6">
        <div className="os-flex os-justify-between os-items-center">
          <span className="os-fw-500">{result.class_name}</span>
          <Tag type="gray" size="sm">
            Atlandı
          </Tag>
        </div>
        <p className="os-mt-1 os-mx-0 os-mb-0 os-text-sm os-c-tertiary">{result.skip_reason}</p>
      </div>
    );
  }

  const complete = result.placed >= result.required && result.required > 0;

  return (
    <div className="os-section os-py-4 os-px-6">
      <div className="os-flex os-justify-between os-items-center">
        <span className="os-fw-500">{result.class_name}</span>
        <div className="os-flex os-gap-2 os-items-center">
          <Tag type={complete ? "green" : result.placed > 0 ? "blue" : "gray"} size="sm">
            {result.placed} / {result.required} ders saati yerleştirildi
          </Tag>
          {result.timetable_id && (
            <Button kind="ghost" size="sm" as={Link} to={`/timetables/${result.timetable_id}`}>
              Taslağı aç →
            </Button>
          )}
        </div>
      </div>
      {result.gaps.length > 0 && (
        <ul className="os-mt-2 os-mx-0 os-mb-0 os-pl-5 os-text-sm os-c-warning-text">
          {result.gaps.map((g, i) => (
            <li key={i}>
              {g.subject_name || "Bilinmeyen ders"}
              {g.teacher_name ? ` (${g.teacher_name})` : ""} - {g.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function GenerateTimetable({ inline = false }: { inline?: boolean }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const yearId = currentYear?.id ?? "";
  const { data: gradeSections } = useGradeSections(yearId);
  const [sectionId, setSectionId] = useState("");
  const generate = useGenerateTimetables();

  const handleGenerate = () => {
    if (!yearId || !sectionId) return;
    generate.mutate({ grade_section_id: sectionId, academic_year_id: yearId });
  };

  const result = generate.data;

  return (
    <div className={inline ? "" : "os-page"}>
      {!inline && (
        <div className="os-page__header">
          <div className="os-page__header-left">
            <h1 className="os-page__title">Ders programı üret</h1>
            <div className="os-page__subtitle os-page__subtitle--tip">
              Bir seviye şubesindeki tüm sınıflar için taslak ders programlarını tek seferde doldurur.
              <InfoTip>Öğrenciler sınıf öğretmenliklerinde kalır, öğretmenler hareket eder ve lab ders saatleri uygun bir laboratuvara atanır. Yerleştirilemeyen her şey elle tamamlamanız için bırakılır.</InfoTip>
            </div>
          </div>
        </div>
      )}

      <div className="os-section os-p-6">
        {!currentYear ? (
          <EmptyState title="Güncel eğitim-öğretim yılı yok" description="Önce bir eğitim-öğretim yılını güncel olarak ayarlayın." />
        ) : !gradeSections ? (
          <SkeletonText width="40%" />
        ) : gradeSections.length === 0 ? (
          <EmptyState
            title="Henüz seviye şubesi yok"
            description="Önce Ders programı ayarları altında ders saati düzeni olan bir seviye şubesi oluşturun."
          />
        ) : (
          <div className="os-flex os-gap-3 os-items-end os-mb-4">
            <div className="os-w-20">
              <Select
                id="generate-grade-section"
                labelText="Seviye şubesi"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
              >
                <SelectItem value="" text="Bir seviye şubesi seçin…" />
                {gradeSections.map((gs) => (
                  <SelectItem key={gs.id} value={gs.id} text={gs.name} />
                ))}
              </Select>
            </div>
            <Button renderIcon={Rocket} kind="primary" onClick={handleGenerate} disabled={!sectionId || generate.isPending}>
              {generate.isPending ? "Üretiliyor…" : "Üret"}
            </Button>
          </div>
        )}

        <MutationErrorNotification
          isError={generate.isError}
          error={generate.error}
          title="Ders programları üretilemedi"
          onClose={() => generate.reset()} className="os-mb-4"
        />

        {result && (
          <div className="os-grid os-gap-3 os-mt-4">
            {result.classes.map((c) => (
              <ClassResultCard key={c.class_id} result={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
