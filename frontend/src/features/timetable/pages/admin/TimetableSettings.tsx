import { useState } from "react";
import { Save } from "@carbon/icons-react";
import { Button, TextInput, NumberInput, InlineNotification, SkeletonText, Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useTimetableSettings, useUpsertTimetableSettings } from "@/features/timetable/queries/useTimetableSettings";
import type { TimetableSettings as TimetableSettingsData } from "@/features/timetable/api/timetableSettings";
import EmptyState from "@/shared/ui/EmptyState";
import GradeSections from "@/features/timetable/pages/admin/GradeSections";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";

const DEFAULTS = {
  school_start_time: "08:00",
  school_end_time: "13:25",
  number_of_periods: 8,
  period_duration_minutes: 40,
  interval_duration_minutes: 30,
};

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="os-text-xs os-c-secondary os-mt-0 os-mx-0 os-mb-1 os-fw-600 os-uppercase">
        {label}
      </p>
      <p className="os-text-lg os-fw-300 os-c-primary os-m-0">{value}</p>
    </div>
  );
}

function SettingsForm({
  academicYearId,
  initial,
}: {
  academicYearId: string;
  initial: TimetableSettingsData | undefined;
}) {
  const upsert = useUpsertTimetableSettings();
  const [form, setForm] = useState(
    initial
      ? {
          school_start_time: initial.school_start_time,
          school_end_time: initial.school_end_time,
          number_of_periods: initial.number_of_periods,
          period_duration_minutes: initial.period_duration_minutes,
          interval_duration_minutes: initial.interval_duration_minutes,
        }
      : DEFAULTS,
  );

  const [loadedForYear, setLoadedForYear] = useState<string | null>(null);
  if (initial && loadedForYear !== academicYearId) {
    setForm({
      school_start_time: initial.school_start_time,
      school_end_time: initial.school_end_time,
      number_of_periods: initial.number_of_periods,
      period_duration_minutes: initial.period_duration_minutes,
      interval_duration_minutes: initial.interval_duration_minutes,
    });
    setLoadedForYear(academicYearId);
  }

  const handleSave = () => {
    upsert.mutate({ academic_year_id: academicYearId, ...form });
  };

  return (
    <>
      {initial && (
        <div className="os-grid os-grid-cols-3 os-gap-5 os-bg-layer-hover os-py-4 os-px-6 os-mb-6 os-border"
        >
          <SummaryStat label="Okul saatleri" value={`${initial.school_start_time} – ${initial.school_end_time}`} />
          <SummaryStat
            label="Ders saatleri ve süre"
            value={`${initial.number_of_periods} ders saati (${initial.period_duration_minutes} dk)`}
          />
          <SummaryStat label="Varsayılan teneffüs" value={`${initial.interval_duration_minutes} dakika`} />
        </div>
      )}

      <div className="os-flex os-justify-end os-mb-4">
        <Button renderIcon={Save} kind="primary" onClick={handleSave} disabled={upsert.isPending}>
          {upsert.isPending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
      <MutationErrorNotification
        isError={upsert.isError}
        error={upsert.error}
        title="Ayarlar kaydedilemedi"
        onClose={() => upsert.reset()} className="os-mb-4"
      />
      {upsert.isSuccess && (
        <InlineNotification
          kind="success"
          title="Ayarlar kaydedildi"
          lowContrast
          onClose={() => upsert.reset()} className="os-max-w-full os-mb-4"
        />
      )}
      <div className="os-grid os-grid-2-max-20 os-gap-5">
        <TextInput
          id="school-start-time"
          labelText="Okul başlangıç saati"
          type="time"
          value={form.school_start_time}
          onChange={(e) => setForm((f) => ({ ...f, school_start_time: e.target.value }))}
        />
        <TextInput
          id="school-end-time"
          labelText="Okul bitiş saati"
          type="time"
          value={form.school_end_time}
          onChange={(e) => setForm((f) => ({ ...f, school_end_time: e.target.value }))}
        />
        <NumberInput
          id="number-of-periods"
          label="Ders saati sayısı"
          min={1}
          max={15}
          value={form.number_of_periods}
          onChange={(_e, { value }) =>
            setForm((f) => ({ ...f, number_of_periods: Number(value ?? f.number_of_periods) }))
          }
        />
        <NumberInput
          id="period-duration"
          label="Ders saati süresi (dakika)"
          min={10}
          max={120}
          value={form.period_duration_minutes}
          onChange={(_e, { value }) =>
            setForm((f) => ({ ...f, period_duration_minutes: Number(value ?? f.period_duration_minutes) }))
          }
        />
        <NumberInput
          id="interval-duration"
          label="Varsayılan teneffüs süresi (dakika)"
          min={5}
          max={120}
          value={form.interval_duration_minutes}
          onChange={(_e, { value }) =>
            setForm((f) => ({ ...f, interval_duration_minutes: Number(value ?? f.interval_duration_minutes) }))
          }
        />
      </div>
    </>
  );
}


export default function TimetableSettings({ inline = false }: { inline?: boolean }) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: settings, isLoading } = useTimetableSettings(currentYear?.id ?? "");

  if (!currentYear) {
    return (
      <div className={inline ? "" : "os-page"}>
        {!inline && (
          <div className="os-page__header">
            <div className="os-page__header-left">
              <h1 className="os-page__title">Ders programı ayarları</h1>
            </div>
          </div>
        )}
        <div className="os-section">
          <EmptyState
            title="Güncel eğitim-öğretim yılı yok"
            description="Ders programı ayarlarını yapılandırmadan önce bir eğitim-öğretim yılını güncel olarak ayarlayın."
          />
        </div>
      </div>
    );
  }

  return (
    <div className={inline ? "" : "os-page"}>
      {!inline && (
        <div className="os-page__header">
          <div className="os-page__header-left">
            <h1 className="os-page__title">Ders programı ayarları</h1>
            <p className="os-page__subtitle">{currentYear.label} için varsayılan ders saatleri ve teneffüs zamanları.</p>
          </div>
        </div>
      )}

      <Tabs>
        <TabList aria-label="Ders programı ayarları sekmeleri">
          <Tab>Varsayılan şablonlar</Tab>
          <Tab>Seviye teneffüs saatleri</Tab>
        </TabList>
        <TabPanels>
          <TabPanel className="os-py-4 os-px-0">
            <div className="os-section os-p-6">
              {isLoading ? (
                <SkeletonText width="40%" />
              ) : (
                <SettingsForm key={settings ? "loaded" : "empty"} academicYearId={currentYear.id} initial={settings} />
              )}
            </div>
          </TabPanel>
          <TabPanel className="os-py-4 os-px-0">
            <GradeSections inline />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
