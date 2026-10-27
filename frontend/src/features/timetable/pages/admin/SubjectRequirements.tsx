import { useState } from "react";
import { NumberInput, SkeletonText, Dropdown } from "@carbon/react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useSubjects } from "@/features/curriculum/queries/useSubjects";
import {
  useSubjectPeriodRequirements,
  useUpsertSubjectPeriodRequirement,
  useDeleteSubjectPeriodRequirement,
} from "@/features/timetable/queries/useSubjectPeriodRequirements";
import EmptyState from "@/shared/ui/EmptyState";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import RemoveIconButton from "@/shared/ui/RemoveIconButton";
import type { Grade } from "@/features/academics/api/grade";
import type { SubjectPeriodRequirement } from "@/features/timetable/api/subjectPeriodRequirement";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import InfoTip from "@/shared/ui/InfoTip";

export default function SubjectRequirements({ inline = false }: { inline?: boolean }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: grades } = useGrades();
  const { data: subjects } = useSubjects();
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);

  const yearId = currentYear?.id ?? "";
  const gradeId = selectedGrade?.id ?? "";
  const { data: requirements, isLoading } = useSubjectPeriodRequirements(yearId, gradeId);
  const upsert = useUpsertSubjectPeriodRequirement();
  const remove = useDeleteSubjectPeriodRequirement(yearId, gradeId);

  const [toRemove, setToRemove] = useState<SubjectPeriodRequirement | null>(null);

  const requirementFor = (subjectId: string) =>
    requirements?.find((r) => r.subject_id === subjectId);

  const periodsFor = (subjectId: string) =>
    requirementFor(subjectId)?.periods_per_week ?? 0;

  const labPeriodsFor = (subjectId: string) =>
    requirementFor(subjectId)?.lab_periods_per_week ?? 0;

  const doubleBlocksFor = (subjectId: string) =>
    requirementFor(subjectId)?.double_period_blocks ?? 0;

  const handleChange = (subjectId: string, periodsPerWeek: number, labPeriodsPerWeek: number, doublePeriodBlocks: number) => {
    if (!yearId || !gradeId) return;
    const maxBlocks = Math.floor(periodsPerWeek / 2);
    upsert.mutate({
      academic_year_id: yearId,
      grade_id: gradeId,
      subject_id: subjectId,
      periods_per_week: periodsPerWeek,
      lab_periods_per_week: Math.min(labPeriodsPerWeek, periodsPerWeek),
      double_period_blocks: Math.min(doublePeriodBlocks, maxBlocks),
    });
  };

  return (
    <div className={inline ? "" : "os-page"}>
      {!inline && (
        <div className="os-page__header">
          <div className="os-page__header-left">
            <h1 className="os-page__title">Ders gereksinimleri</h1>
            <div className="os-page__subtitle os-page__subtitle--tip">
              Her sınıf seviyesinin ders başına ihtiyaç duyduğu haftalık ders saatleri.
              <InfoTip>Bir sınıf ders programı, incelemeye gönderilmeden önce bunları karşılamalıdır. Çift bloklar art arda gelen ikililerdir: 6 ders saatinden 2 blok, 4 saati eşleştirir ve 2 tek ders saati bırakır. Üretici tam bu kadarını yerleştirir.</InfoTip>
            </div>
          </div>
        </div>
      )}

      <div className="os-section os-p-6">
        <div className="os-max-w-20 os-mb-6">
          <Dropdown
            id="requirements-grade"
            titleText="Sınıf seviyesi"
            label="Bir sınıf seviyesi seçin…"
            items={grades ?? []}
            itemToString={(g) => (g as Grade)?.name ?? ""}
            selectedItem={selectedGrade}
            onChange={({ selectedItem }) => setSelectedGrade(selectedItem ?? null)}
          />
        </div>

        {!currentYear ? (
          <EmptyState title="Güncel eğitim-öğretim yılı yok" description="Önce bir eğitim-öğretim yılını güncel olarak ayarlayın." />
        ) : !selectedGrade ? (
          <EmptyState title="Bir sınıf seviyesi seçin" description="Ders saatlerini yapılandırmak için yukarıdan bir sınıf seviyesi seçin." />
        ) : isLoading ? (
          <SkeletonText width="40%" />
        ) : !subjects || subjects.length === 0 ? (
          <EmptyState title="Henüz ders yok" description="Önce Dersler altına ders ekleyin." />
        ) : (
          <>
            <MutationErrorNotification
              isError={upsert.isError}
              error={upsert.error}
              title="Kaydedilemedi"
              onClose={() => upsert.reset()} className="os-mb-4"
            />
            <MutationErrorNotification
              isError={remove.isError}
              error={remove.error}
              title="Gereksinim temizlenemedi"
              onClose={() => remove.reset()} className="os-mb-4"
            />
            <table className="os-table">
              <thead>
                <tr>
                  <th>Ders</th>
                  <th className="os-w-10">Ders saati / hafta</th>
                  <th className="os-w-10">Lab ders saati / hafta</th>
                  <th className="os-w-10">Çift blok / hafta</th>
                  <th className="os-w-4">{null}</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => {
                  const requirement = requirementFor(s.id);
                  const periods = periodsFor(s.id);
                  const doubleBlocks = doubleBlocksFor(s.id);
                  const maxBlocks = Math.floor(periods / 2);
                  return (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>
                        <NumberInput
                          id={`periods-${s.id}`}
                          label=""
                          size="sm"
                          min={0}
                          max={20}
                          value={periods}
                          onChange={(_e, { value }) => handleChange(s.id, Number(value ?? 0), labPeriodsFor(s.id), doubleBlocks)}
                        />
                      </td>
                      <td>
                        <NumberInput
                          id={`lab-periods-${s.id}`}
                          label=""
                          size="sm"
                          min={0}
                          max={periods}
                          value={labPeriodsFor(s.id)}
                          disabled={periods === 0}
                          onChange={(_e, { value }) => handleChange(s.id, periods, Number(value ?? 0), doubleBlocks)}
                        />
                      </td>
                      <td>
                        <NumberInput
                          id={`double-blocks-${s.id}`}
                          label=""
                          size="sm"
                          min={0}
                          max={maxBlocks}
                          value={doubleBlocks}
                          disabled={maxBlocks === 0}
                          helperText={maxBlocks > 0 ? `en fazla ${maxBlocks}` : undefined}
                          onChange={(_e, { value }) => handleChange(s.id, periods, labPeriodsFor(s.id), Number(value ?? 0))}
                        />
                      </td>
                      <td>
                        {/* Clearing removes the row (unset), distinct from setting 0 periods (checked by the validator as zero). */}
                        <RemoveIconButton
                          label="Gereksinimi temizle"
                          disabled={!requirement || remove.isPending}
                          onClick={() => requirement && setToRemove(requirement)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      <ConfirmDeleteModal
        open={!!toRemove}
        title="Gereksinimi temizle"
        description={
          <>
            {selectedGrade?.name} için <strong>{toRemove?.subject_name}</strong> dersinin haftalık ders saati
            gereksinimi temizlensin mi? Yeniden bir gereksinim ayarlanana kadar ders programı denetçisi bu
            seviye için bu dersi denetlemeyi bırakır.
          </>
        }
        confirmLabel="Temizle"
        pendingLabel="Temizleniyor…"
        subject="Gereksinim"
        successVerb="temizlendi"
        mutation={remove}
        onClose={() => setToRemove(null)}
        onConfirm={() => {
          if (toRemove) remove.mutate(toRemove.id);
        }}
      />
    </div>
  );
}
