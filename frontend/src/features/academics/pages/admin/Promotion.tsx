import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button, Select, SelectItem, Checkbox, InlineNotification, SkeletonText } from "@carbon/react";
import { Renew } from "@carbon/icons-react";
import { useAcademicYears } from "@/features/school/queries/useAcademicYears";
import { useTerms } from "@/features/school/queries/useTerms";
import { useClassesByAcademicYear } from "@/features/academics/queries/useClasses";
import { usePromotionPreview, useCommitAssignments } from "@/features/academics/queries/usePromotion";
import EmptyState from "@/shared/ui/EmptyState";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import type { PromotionPreviewRow } from "@/features/academics/api/promotion";
import PromotionGroup from "@/features/academics/components/PromotionGroup";
import InfoTip from "@/shared/ui/InfoTip";

export default function Promotion() {
  const { data: years, isLoading: yearsLoading } = useAcademicYears();

  const currentYear = years?.find((y) => y.is_current);

  const [sourceYearId, setSourceYearId] = useState("");
  const [targetYearId, setTargetYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [rankByMarks, setRankByMarks] = useState(false);

  const effectiveSourceYearId = sourceYearId || currentYear?.id || "";
  // Excludes the current year and the chosen source year, promoting into the same year isn't a valid target.
  const otherYears = (years ?? []).filter((y) => !y.is_current && y.id !== effectiveSourceYearId);

  const { data: terms } = useTerms(effectiveSourceYearId);
  const { data: targetClasses } = useClassesByAcademicYear(targetYearId);
  const {
    data: preview,
    isLoading: previewLoading,
    isError: previewError,
    refetch,
  } = usePromotionPreview(effectiveSourceYearId, targetYearId, rankByMarks ? termId : undefined);

  const commit = useCommitAssignments();

  // student_id -> chosen target class_id; seeded from suggested_class_id per preview, then freely overridable.
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const previewKey = `${effectiveSourceYearId}|${targetYearId}`;
  if (preview && seededFor !== previewKey) {
    const seeded: Record<string, string> = {};
    for (const row of preview) {
      if (row.suggested_class_id) seeded[row.student_id] = row.suggested_class_id;
    }
    setAssignments(seeded);
    setSeededFor(previewKey);
  }

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSelected = (studentId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });

  const groups = useMemo(() => {
    const byGrade = new Map<string, { gradeName: string; rows: PromotionPreviewRow[] }>();
    for (const row of preview ?? []) {
      // Reads the same `graduating` flag `unassignedCount` uses, rather than inferring it from a null next_grade_id.
      const key = row.graduating ? "graduating" : row.next_grade_id!;
      const label = row.graduating ? "Mezun olacaklar (üst seviye yok)" : row.next_grade_name!;
      if (!byGrade.has(key)) byGrade.set(key, { gradeName: label, rows: [] });
      byGrade.get(key)!.rows.push(row);
    }
    const list = [...byGrade.entries()].map(([gradeId, v]) => ({ gradeId, ...v }));
    if (rankByMarks) {
      for (const g of list) {
        g.rows.sort((a, b) => (b.total_marks ?? -1) - (a.total_marks ?? -1));
      }
    }
    return list;
  }, [preview, rankByMarks]);

  const readyToCommit = Object.keys(assignments).length > 0;

  const handleCommit = () => {
    if (!targetYearId || targetYearId === effectiveSourceYearId) return;
    const entries = Object.entries(assignments)
      .filter(([, classId]) => !!classId)
      .map(([studentId, classId]) => ({ student_id: studentId, class_id: classId }));
    if (entries.length === 0) return;
    commit.mutate(
      { academic_year_id: targetYearId, assignments: entries },
      { onSuccess: () => setSelected(new Set()) },
    );
  };

  const unassignedCount = (preview ?? []).filter((r) => !r.graduating && !assignments[r.student_id]).length;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Sınıf geçme ve sınıf oluşturma</h1>
          <div className="os-page__subtitle os-page__subtitle--tip">
            Öğrencileri yeni bir eğitim-öğretim yılı için bir sonraki sınıf seviyelerine ve sınıflarına taşıyın.
            <InfoTip>Hedef yılı güncel yıl olarak ayarlayana kadar okulun geri kalanı için hiçbir şey değişmez.</InfoTip>
          </div>
        </div>
      </div>

      {!yearsLoading && otherYears.length === 0 && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Geçiş yapılacak başka eğitim-öğretim yılı yok"
          subtitle="Önce yeni eğitim-öğretim yılını (ve sınıflarını) oluşturun, sonra buraya dönün." className="os-mb-2 os-max-w-full"
        />
      )}
      {!yearsLoading && otherYears.length === 0 && (
        <div className="os-mb-6">
          <Link to="/academic-years" className="os-text-sm">
            Eğitim-öğretim yıllarına git →
          </Link>
        </div>
      )}

      <div className="os-section os-mb-6">
        <div className="os-section__body os-grid os-grid-form-3-auto os-gap-4 os-items-grid-end os-py-5 os-px-6">
          <Select
            id="source-year"
            labelText="Kaynak yıl"
            value={effectiveSourceYearId}
            onChange={(e) => {
              const nextSourceYearId = e.target.value;
              setSourceYearId(nextSourceYearId);
              // Clear a target year that now matches the new source, so preview never runs with identical source/target.
              if (targetYearId && targetYearId === (nextSourceYearId || currentYear?.id)) {
                setTargetYearId("");
              }
            }}
          >
            <SelectItem value="" text={currentYear ? `${currentYear.label} (güncel)` : "Seçin…"} />
            {(years ?? []).map((y) => (
              <SelectItem key={y.id} value={y.id} text={y.label + (y.is_current ? " (güncel)" : "")} />
            ))}
          </Select>
          <Select
            id="target-year"
            labelText="Hedef yıl"
            value={targetYearId}
            onChange={(e) => setTargetYearId(e.target.value)}
          >
            <SelectItem value="" text="Seçin…" />
            {otherYears.map((y) => (
              <SelectItem key={y.id} value={y.id} text={y.label} />
            ))}
          </Select>
          <Select id="rank-term" labelText="Notlara göre sırala (isteğe bağlı)" value={termId} onChange={(e) => setTermId(e.target.value)}>
            <SelectItem value="" text="Yok" />
            {(terms ?? []).map((t) => (
              <SelectItem key={t.id} value={t.id} text={t.name} />
            ))}
          </Select>
          <Checkbox
            id="rank-by-marks"
            labelText="Toplam nota göre sırala"
            checked={rankByMarks}
            disabled={!termId}
            onChange={(_e, { checked }) => setRankByMarks(checked)}
          />
        </div>
      </div>

      {previewError && (
        <div className="os-mb-6">
          <ErrorMessage message="Sınıf geçme önizlemesi yüklenemedi." onRetry={refetch} />
        </div>
      )}
      <MutationErrorNotification
        isError={commit.isError}
        error={commit.error}
        title="Atamalar kaydedilemedi"
        fallback="Lütfen yeniden deneyin."
        onClose={() => commit.reset()} className="os-mb-6"
      />
      {commit.isSuccess && (
        <InlineNotification
          kind="success"
          lowContrast
          title="Atamalar kaydedildi"
          subtitle={`Hedef yılda ${commit.data?.assigned ?? 0} öğrenciye sınıf atandı. Yayınlamaya hazır olduğunuzda Eğitim-öğretim yılları sayfasından bu yılı güncel yıl olarak ayarlayın.`}
          onClose={() => commit.reset()} className="os-mb-6 os-max-w-full"
        />
      )}

      {!targetYearId ? (
        <div className="os-section">
          <EmptyState title="Hedef yıl seçin" description="Öğrencileri geçireceğiniz eğitim-öğretim yılını seçin." />
        </div>
      ) : previewLoading ? (
        <div className="os-section os-p-6">
          <SkeletonText width="40%" />
        </div>
      ) : groups.length === 0 ? (
        <div className="os-section">
          <EmptyState title="Aktif öğrenci yok" description="Kaynak yılı için aktif olarak kayıtlı öğrenci bulunamadı." />
        </div>
      ) : (
        groups.map((group) => (
          <PromotionGroup
            key={group.gradeId}
            gradeId={group.gradeId}
            isGraduating={group.gradeId === "graduating"}
            gradeName={group.gradeName}
            rows={group.rows}
            targetClasses={(targetClasses ?? []).filter((c) => c.grade_id === group.gradeId)}
            assignments={assignments}
            onAssign={(studentId, classId) => setAssignments((a) => ({ ...a, [studentId]: classId }))}
            onBulkAssign={(map) => setAssignments((a) => ({ ...a, ...map }))}
            selected={selected}
            onToggleSelected={toggleSelected}
            rankByMarks={rankByMarks}
          />
        ))
      )}

      {groups.length > 0 && (
        <div className="os-flex os-items-center os-gap-4 os-py-6 os-px-0">
          {unassignedCount > 0 && (
            <span className="os-text-sm os-c-warning-text">
              {unassignedCount} öğrencinin hedef sınıfı yok - atanana kadar atlanacaklar.
            </span>
          )}
          <div className="os-flex-1" />
          <Button
            renderIcon={Renew}
            kind="primary"
            onClick={handleCommit}
            disabled={!readyToCommit || commit.isPending}
          >
            {commit.isPending ? "Kaydediliyor…" : "Atamaları kaydet"}
          </Button>
        </div>
      )}
    </div>
  );
}

