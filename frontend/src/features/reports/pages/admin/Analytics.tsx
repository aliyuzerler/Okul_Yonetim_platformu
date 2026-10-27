/* eslint-disable max-lines */
import { useMemo, useState } from "react";
import { SkeletonText, Tabs, TabList, Tab, TabPanels, TabPanel, Button, Tag } from "@carbon/react";
import { useDashboardAnalytics, useLeadershipAnalytics } from "@/features/reports/queries/useDashboardAnalytics";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import { formatShortDayMonth } from "@/shared/lib/date";
import {
  Section,
  StatTile,
  BarList,
  Sparkline,
  TrendSummary,
  DonutChart,
} from "@/features/reports/components/ChartPrimitives";
import { ACCENT, STATUS_COLORS, CHART_BLUE, CHART_PURPLE, CATEGORICAL_PALETTE, GENDER_COLORS } from "@/features/reports/components/chartColors";
import type { CountRow, AttendanceTrendPoint } from "@/features/reports/api/dashboardAnalytics";

// Backend cinsiyet kodu değerlerini ("male"/"female"/"unspecified") Türkçe etiketlere map'ler; kod değerleri renk eşlemesi için korunur.
const GENDER_LABELS: Record<string, string> = {
  male: "Erkek",
  female: "Kız",
  unspecified: "Belirtilmemiş",
};

// scope picks the endpoint: admin analytics, or the Principal / Vice Principal scoped view with the same shape (ADR 0002).
export default function Analytics({ scope = "admin" }: { scope?: "admin" | "leadership" }) {
  const adminQuery = useDashboardAnalytics(scope === "admin");
  const leadershipQuery = useLeadershipAnalytics(scope === "leadership");
  const { data, isLoading, isError, refetch } = scope === "leadership" ? leadershipQuery : adminQuery;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Analitik</h1>
          <p className="os-page__subtitle">Okul genelinde notlar, yoklama, kollar ve büyüme.</p>
        </div>
      </div>

      {isLoading && (
        <div className="os-section">
          <div className="os-section__body os-p-6">
            <SkeletonText width="40%" />
            <SkeletonText width="70%" />
            <SkeletonText width="55%" />
          </div>
        </div>
      )}

      {!isLoading && (isError || !data) && (
        <div className="os-section">
          <div className="os-section__body">
            <ErrorMessage message="Analitik verileri yüklenemedi." onRetry={refetch} />
          </div>
        </div>
      )}

      {!isLoading && data && (
        <Tabs>
          <TabList aria-label="Analitik bölümleri">
            <Tab>Öğrenciler</Tab>
            <Tab>Akademik</Tab>
            <Tab>Personel</Tab>
            <Tab>Okul</Tab>
          </TabList>
          <TabPanels>
            <TabPanel className="os-p-0">
              <StudentsPanel data={data} />
            </TabPanel>
            <TabPanel className="os-p-0">
              <AcademicsPanel data={data} />
            </TabPanel>
            <TabPanel className="os-p-0">
              <StaffPanel data={data} />
            </TabPanel>
            <TabPanel className="os-p-0">
              <SchoolPanel data={data} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
    </div>
  );
}

type AnalyticsData = NonNullable<ReturnType<typeof useDashboardAnalytics>["data"]>;

function StudentsPanel({ data }: { data: AnalyticsData }) {
  const trendPoints = data.student.attendance_trend.map((t: AttendanceTrendPoint) => ({
    label: formatShortDayMonth(t.date),
    pct: t.total_count > 0 ? Math.round((t.present_count / t.total_count) * 100) : 0,
  }));

  return (
    <div className="os-my-4 os-mx-0">
      <div className="os-stat-grid">
        <StatTile label="Toplam öğrenci" value={data.student.total} color={ACCENT} />
        <StatTile label="Öğrencili sınıf seviyesi" value={data.student.by_grade.filter((row) => row.count > 0).length} color={CHART_BLUE} />
        <StatTile label="Aktif sınıf" value={data.student.by_class.length} color={CHART_PURPLE} />
      </div>

      <div className="os-grid os-grid-cols-2 os-gap-6 os-mt-6">
        <Section title="Cinsiyet dağılımı">
          <DonutChart
            slices={data.student.gender_distribution.map((g) => ({
              label: GENDER_LABELS[g.label] ?? g.label,
              value: g.count,
              color: GENDER_COLORS[g.label] ?? "var(--os-text-tertiary)",
            }))}
          />
        </Section>
        <Section title="Kol dağılımı">
          <DonutChart
            slices={data.student.house_distribution.map((h, i) => ({
              label: h.name,
              value: h.count,
              color: h.color || CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length],
            }))}
          />
        </Section>
      </div>

      <StudentEnrollmentSection byGrade={data.student.by_grade} byClass={data.student.by_class} />

      <div className="os-grid os-grid-cols-2 os-gap-6 os-mt-6">
        <Section title="Yoklama eğilimi (son 14 gün)">
          <Sparkline
            points={trendPoints.map((p) => ({ label: p.label, value: p.pct }))}
            min={0}
            max={100}
            formatValue={(v) => `${v}% mevcut`}
            emptyMessage="Son 14 günde yoklama oturumu yok."
          />
        </Section>
        <Section title="Kayıt öngörüsü">
          <EnrollmentInsight byGrade={data.student.by_grade} byClass={data.student.by_class} />
        </Section>
      </div>
    </div>
  );
}

function StudentEnrollmentSection({ byGrade, byClass }: { byGrade: CountRow[]; byClass: CountRow[] }) {
  const firstGrade = byGrade.find((row) => row.count > 0)?.label ?? byGrade[0]?.label ?? "";
  const [selectedGrade, setSelectedGrade] = useState(firstGrade);
  const effectiveSelectedGrade = byGrade.some((row) => row.label === selectedGrade) ? selectedGrade : firstGrade;
  const gradeRows = byGrade.map((row) => ({ label: row.label, value: row.count }));
  const classRows = useMemo(() => {
    const prefix = `${effectiveSelectedGrade} `;
    return byClass
      .filter((row) => row.label.startsWith(prefix))
      .map((row) => ({ label: row.label.slice(prefix.length), value: row.count }));
  }, [byClass, effectiveSelectedGrade]);
  const selectedCount = byGrade.find((row) => row.label === effectiveSelectedGrade)?.count ?? 0;

  return (
    <Section title="Sınıf seviyesine ve sınıfa göre öğrenci kaydı">
      <div className="os-grid os-grid-cols-2 os-gap-6">
        <div>
          <div className="os-flex os-items-center os-justify-between os-mb-3">
            <p className="os-m-0 os-text-xs os-fw-600 os-uppercase os-tracking-wide os-c-secondary">Sınıf seviyeleri</p>
            <span className="os-text-xs os-c-tertiary">Bir sınıf seviyesi seçin</span>
          </div>
          <div className="os-flex os-col os-gap-1h" aria-label="Sınıf seviyesine göre öğrenci sayıları">
            {gradeRows.map((row) => (
              <Button
                key={row.label}
                kind={effectiveSelectedGrade === row.label ? "tertiary" : "ghost"}
                size="sm"
                className="os-justify-start os-w-full"
                onClick={() => setSelectedGrade(row.label)}
                aria-pressed={effectiveSelectedGrade === row.label}
              >
                <span className="os-flex os-justify-between os-w-full os-text-left">
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </span>
              </Button>
            ))}
          </div>
        </div>
        <div>
          <div className="os-flex os-items-center os-justify-between os-mb-3">
            <p className="os-m-0 os-text-xs os-fw-600 os-uppercase os-tracking-wide os-c-secondary">{effectiveSelectedGrade || "seçili sınıf seviyesi"} sınıfları</p>
            <Tag type="blue" size="sm">{selectedCount} öğrenci</Tag>
          </div>
          <BarList rows={classRows} color={CHART_BLUE} />
        </div>
      </div>
    </Section>
  );
}

function EnrollmentInsight({ byGrade, byClass }: { byGrade: CountRow[]; byClass: CountRow[] }) {
  const largestGrade = byGrade.reduce<CountRow | null>((largest, row) => (!largest || row.count > largest.count ? row : largest), null);
  const largestClass = byClass.reduce<CountRow | null>((largest, row) => (!largest || row.count > largest.count ? row : largest), null);
  if (!largestGrade && !largestClass) return <p className="os-m-0 os-text-sm os-c-tertiary">Henüz kayıt verisi yok.</p>;
  return (
    <div className="os-flex os-col os-gap-4">
      {largestGrade && <div><p className="os-m-0 os-text-xs os-c-secondary">En kalabalık sınıf seviyesi</p><p className="os-m-0 os-text-lg os-fw-600">{largestGrade.label} · {largestGrade.count} öğrenci</p></div>}
      {largestClass && <div><p className="os-m-0 os-text-xs os-c-secondary">En kalabalık sınıf</p><p className="os-m-0 os-text-lg os-fw-600">{largestClass.label} · {largestClass.count} öğrenci</p></div>}
    </div>
  );
}

function AcademicsPanel({ data }: { data: AnalyticsData }) {
  return (
    <div className="os-my-4 os-mx-0">
      <div className="os-stat-grid">
        <StatTile label="Sınav ortalaması" value={`${data.academic.examination_average}%`} color={ACCENT} />
        <StatTile label="Notu girilen öğrenci" value={data.academic.students_with_marks} color={CHART_BLUE} />
        <StatTile label="Genel yoklama %" value={`${Math.round(data.academic.attendance_percentage)}%`} color={STATUS_COLORS.present} />
        <StatTile label="Bu dönemin not girişleri" value={data.academic.examination_entries} color={CHART_PURPLE} />
      </div>

      <div className="os-grid os-grid-cols-2 os-gap-6 os-mt-6">
        <Section title="Derslere göre notlar (ort. %, güncel dönem)">
          <BarList
            rows={data.academic.subject_performance.map((r) => ({ label: r.label, value: r.average_percentage }))}
            formatValue={(v) => `${v}%`}
          />
        </Section>
        <Section title="Sınıf seviyelerine göre notlar (ort. %, güncel dönem)">
          <BarList
            rows={data.academic.grade_wise_performance.map((r) => ({ label: r.label, value: r.average_percentage }))}
            color={CHART_BLUE}
            formatValue={(v) => `${v}%`}
          />
        </Section>
      </div>

      <div className="os-mt-6">
        <Section title="Sınıflara göre notlar (ort. %, güncel dönem)">
          <BarList
            rows={data.academic.class_wise_performance.map((r) => ({ label: r.label, value: r.average_percentage }))}
            color={STATUS_COLORS.present}
            formatValue={(v) => `${v}%`}
          />
        </Section>
      </div>
    </div>
  );
}

function StaffPanel({ data }: { data: AnalyticsData }) {
  return (
    <div className="os-my-4 os-mx-0">
      <div className="os-stat-grid">
        <StatTile label="Öğretmen kadrosu" value={data.staff.academic_staff_count} color={ACCENT} />
        <StatTile label="İdari personel" value={data.staff.non_academic_staff_count} color={CHART_PURPLE} />
      </div>

      <div className="os-grid os-grid-cols-2 os-gap-6 os-mt-6">
        <Section title="Bu ayın personel yoklaması">
          <DonutChart
            slices={[
              { label: "Mevcut", value: data.staff.attendance_this_month.present_count, color: STATUS_COLORS.present },
              { label: "Geç", value: data.staff.attendance_this_month.late_count, color: STATUS_COLORS.late },
              { label: "Devamsız", value: data.staff.attendance_this_month.absent_count, color: STATUS_COLORS.absent },
              { label: "İzin", value: data.staff.attendance_this_month.leave_count, color: STATUS_COLORS.leave },
            ]}
          />
        </Section>
        <TrendSummary title="Katılım yılına göre personel artışı" points={data.school.staff_growth} color={CHART_PURPLE} />
      </div>
    </div>
  );
}

function SchoolPanel({ data }: { data: AnalyticsData }) {
  return (
    <div className="os-my-4 os-mx-0">
      <div className="os-stat-grid">
        <StatTile label="Gönderilen bildirimler" value={data.school.notifications_sent_count} color={CHART_BLUE} />
        <StatTile label="Ders programı tamamlanma" value={`${Math.round(data.school.timetable_completion_pct)}%`} color={STATUS_COLORS.present} />
        <StatTile label="Toplam sınıf" value={data.school.total_classes} color={ACCENT} />
        <StatTile label="Yayınlanan ders programları" value={data.school.published_classes} color={CHART_PURPLE} />
      </div>

      <div className="os-mt-6">
        <TrendSummary title="Yıla göre öğrenci artışı" points={data.school.student_growth} color={ACCENT} />
      </div>
    </div>
  );
}
