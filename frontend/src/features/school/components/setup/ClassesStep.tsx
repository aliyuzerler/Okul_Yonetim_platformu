import type { Dispatch, SetStateAction } from "react";
import { Checkbox, NumberInput, Select, SelectItem, TextInput } from "@carbon/react";
import { Building, Information } from "@carbon/icons-react";
import StepShell from "@/features/school/components/setup/StepShell";
import { AL_STREAM_DEFS, type AlStreamsByGradeState } from "@/features/school/setupConstants";

interface Props {
  yearLabel: string;
  setYearLabel: Dispatch<SetStateAction<string>>;
  classCapacity: number;
  setClassCapacity: Dispatch<SetStateAction<number>>;
  orderedSelectedGrades: number[];
  regularGradeNumbers: number[];
  alGradeNumbers: number[];
  sectionsPerGrade: Record<number, number>;
  setSectionsPerGrade: Dispatch<SetStateAction<Record<number, number>>>;
  selectedMediumNames: string[];
  sectionMediums: Record<string, string>;
  setSectionMediums: Dispatch<SetStateAction<Record<string, string>>>;
  alStreams: AlStreamsByGradeState;
  setAlStreams: Dispatch<SetStateAction<AlStreamsByGradeState>>;
}

export default function ClassesStep({
  yearLabel,
  setYearLabel,
  classCapacity,
  setClassCapacity,
  orderedSelectedGrades,
  regularGradeNumbers,
  alGradeNumbers,
  sectionsPerGrade,
  setSectionsPerGrade,
  selectedMediumNames,
  sectionMediums,
  setSectionMediums,
  alStreams,
  setAlStreams,
}: Props) {
  return (
    <StepShell
      icon={Building}
      title="Sınıflar"
      subtitle="Eğitim-öğretim yılını, şube sayılarını ve A/L alanlarını ayarlayın. Sınıf adlarını OpenSchool sizin için oluşturacak."
    >
      <div className="os-class-year-field">
        <TextInput
          id="ss-year-label"
          labelText="Eğitim-öğretim yılı etiketi"
          helperText="Bu etiket, bu kurulumda oluşturulan sınıflar için kullanılır."
          placeholder="örn. 2026"
          value={yearLabel}
          onChange={(e) => setYearLabel(e.target.value)}
        />
        <NumberInput
          id="ss-class-capacity"
          label="Tüm sınıflar için kapasite"
          helperText="Tüm normal ve A/L sınıflarına uygulanır. Derslik kapasiteleri ayrıca yapılandırılır."
          min={1}
          max={200}
          value={classCapacity}
          onChange={(_e, { value }) => setClassCapacity(value === "" ? 1 : Number(value))}
        />
      </div>

      {orderedSelectedGrades.length === 0 ? (
        <div className="os-class-empty-state">
          <Information size={20} />
          <p>Önceki adımda sınıf seviyesi seçilmediği için henüz sınıf eklenecek bir seviye yok.</p>
        </div>
      ) : (
        <>
          {regularGradeNumbers.length > 0 && (
            <section className={`os-class-section ${alGradeNumbers.length > 0 ? "os-mb-7" : ""}`} aria-labelledby="regular-classes-title">
              <div className="os-class-section__heading">
                <div>
                  <h3 id="regular-classes-title">Normal sınıf seviyeleri</h3>
                  <p>Her sınıf seviyesi için şube sayısını belirleyin ve gerektiğinde bir öğretim dili atayın.</p>
                </div>
              </div>
              <div className="os-class-grade-list">
                {regularGradeNumbers.map((gradeNumber) => {
                  const count = sectionsPerGrade[gradeNumber] ?? 1;
                  return (
                    <div key={gradeNumber} className="os-class-grade-row">
                      <div className="os-class-grade-row__topline">
                        <div>
                          <h4>{gradeNumber}. sınıf seviyesi</h4>
                          <p>{count > 0 ? `${count} şube oluşturulacak` : "Şube oluşturulmayacak"}</p>
                        </div>
                        <NumberInput
                          id={`sections-${gradeNumber}`}
                          label={`${gradeNumber}. sınıf seviyesi için şube sayısı`}
                          size="sm"
                          min={0}
                          max={10}
                          value={count}
                          onChange={(_e, { value }) =>
                            setSectionsPerGrade((prev) => ({ ...prev, [gradeNumber]: value === "" ? 0 : Number(value) }))
                          }
                        />
                      </div>
                      {selectedMediumNames.length > 0 && count > 0 && (
                        <div className="os-class-medium-grid">
                          {Array.from({ length: count }).map((_, i) => (
                            <Select
                              key={i}
                              id={`section-medium-${gradeNumber}-${i}`}
                              labelText={`${gradeNumber}-${String.fromCharCode(65 + i)} şubesinin öğretim dili`}
                              size="sm"
                              value={sectionMediums[`${gradeNumber}-${i}`] ?? selectedMediumNames[0] ?? ""}
                              onChange={(e) => setSectionMediums((prev) => ({ ...prev, [`${gradeNumber}-${i}`]: e.target.value }))}
                            >
                              <SelectItem value="" text="Öğretim dili yok" />
                              {selectedMediumNames.map((medium) => <SelectItem key={medium} value={medium} text={medium} />)}
                            </Select>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {alGradeNumbers.map((gradeNumber) => {
            const gradeStreams = alStreams[gradeNumber];
            return (
              <section key={gradeNumber} className="os-class-section" aria-labelledby={`al-streams-title-${gradeNumber}`}>
                <div className="os-class-section__heading">
                  <div>
                    <h3 id={`al-streams-title-${gradeNumber}`}>{gradeNumber}. sınıf (A/L) alanları</h3>
                    <p>{gradeNumber}. sınıfı ayrı yapılandırın. Bu ayarlar {gradeNumber === 12 ? 13 : 12}. sınıfı etkilemez.</p>
                  </div>
                </div>
                <p className="os-class-section__hint">Bu sınıf seviyesi için alanları etkinleştirin ve bir kod ile şube sayısı belirleyin.</p>
                <div className="os-al-stream-list">
                  {AL_STREAM_DEFS.map((def) => {
                    const cfg = gradeStreams[def.key];
                    return (
                      <div key={def.key} className={`os-al-stream-row ${cfg.enabled ? "" : "is-disabled"}`}>
                        <div className="os-al-stream-row__name">
                          <Checkbox
                            id={`al-${gradeNumber}-${def.key}`}
                            labelText={def.label}
                            checked={cfg.enabled}
                            onChange={(_e, { checked }) => setAlStreams((prev) => ({ ...prev, [gradeNumber]: { ...prev[gradeNumber], [def.key]: { ...prev[gradeNumber][def.key], enabled: checked } } }))}
                          />
                        </div>
                        <TextInput
                          id={`al-code-${gradeNumber}-${def.key}`}
                          labelText="Alan kodu"
                          size="sm"
                          maxLength={3}
                          disabled={!cfg.enabled}
                          value={cfg.code}
                          onChange={(e) => setAlStreams((prev) => ({ ...prev, [gradeNumber]: { ...prev[gradeNumber], [def.key]: { ...prev[gradeNumber][def.key], code: e.target.value } } }))}
                        />
                        <NumberInput
                          id={`al-sections-${gradeNumber}-${def.key}`}
                          label="Şube sayısı"
                          size="sm"
                          min={0}
                          max={10}
                          disabled={!cfg.enabled}
                          value={cfg.sections}
                          onChange={(_e, { value }) => setAlStreams((prev) => ({ ...prev, [gradeNumber]: { ...prev[gradeNumber], [def.key]: { ...prev[gradeNumber][def.key], sections: value === "" ? 0 : Number(value) } } }))}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="os-class-section__hint os-class-section__hint--example">
                  Örnek: “Fen Bilimleri (Fizik)” alanı “M” kodu ve 2 şube ile {gradeNumber}-M1 ve {gradeNumber}-M2 sınıflarını oluşturur.
                </p>
              </section>
            );
          })}
        </>
      )}
    </StepShell>
  );
}
