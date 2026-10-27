import { Toggle, Tag, Button, SkeletonText } from "@carbon/react";
import { Play } from "@carbon/icons-react";
import { useJobs, useSetJobEnabled, useRunJobNow } from "@/features/system/queries/useJobs";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import type { JobRunStatus } from "@/features/system/api/jobs";
import { formatDateTime } from "@/shared/lib/date";
import InfoTip from "@/shared/ui/InfoTip";
import WorkflowAgents from "@/features/workflows/components/WorkflowAgents";

function statusTag(status: JobRunStatus) {
  switch (status) {
    case "ok":
      return <Tag type="green" size="sm">OK</Tag>;
    case "failed":
      return <Tag type="red" size="sm">Başarısız</Tag>;
    case "running":
      return <Tag type="blue" size="sm">Çalışıyor</Tag>;
  }
}

export default function Automation({ inline = false }: { inline?: boolean }) {
  const { data: jobs, isLoading, isError, refetch } = useJobs();
  const setEnabled = useSetJobEnabled();
  const runNow = useRunJobNow();

  return (
    <div className={inline ? "" : "os-page"}>
      {!inline && (
        <div className="os-page__header">
          <div className="os-page__header-left">
            <h1 className="os-page__title">Otomasyon</h1>
            <div className="os-page__subtitle os-page__subtitle--tip">
              Kendiliğinden çalışan zamanlanmış ajanlar; ayrıca talebinizde çalışan yıl sonu akışları ve kurulum araçları. Her biri ne yaptığını listeler.
              <InfoTip>Diğer özellikler bu denetimlere bağlı değildir. Yedekleme gibi "Her zaman açık" olarak işaretli ajanlar kapatılamaz.</InfoTip>
            </div>
          </div>
        </div>
      )}

      {isError && (
        <div className="os-mb-6">
          <ErrorMessage message="Arka plan ajanları yüklenemedi." onRetry={refetch} />
        </div>
      )}

      <MutationErrorNotification
        isError={setEnabled.isError || runNow.isError}
        error={setEnabled.error ?? runNow.error}
        title="İşlem başarısız"
        fallback="Lütfen yeniden deneyin."
        onClose={() => {
          setEnabled.reset();
          runNow.reset();
        }} className="os-mb-6"
      />

      <div className="os-section os-mt-0">
        <div className="os-section__header">
          <h2 className="os-section__title">Zamanlanmış ajanlar</h2>
          <span className="os-section__meta">Kendiliğinden çalışır; her birini açıp kapatabilirsiniz</span>
        </div>
        {isLoading && (
          <div className="os-py-5 os-px-6">
            <SkeletonText width="60%" />
          </div>
        )}

        {!isLoading &&
          (jobs ?? []).map((job, i) => (
            <div
              key={job.name} className={`os-flex os-items-start os-justify-between os-gap-6 os-py-4 os-px-6 os-wrap ${i < (jobs?.length ?? 0) - 1 ? "os-border-b" : ""}`}
            >
              <div className="os-flex-1 os-min-w-20">
                <div className="os-flex os-items-center os-gap-2h os-wrap">
                  <span className="os-fw-600 os-text-md">{job.title}</span>
                  <Tag type="blue" size="sm">{job.schedule_label}</Tag>
                </div>
                <p className="os-mt-1 os-mx-0 os-mb-0 os-text-sm os-c-secondary">{job.description}</p>
                {job.checks.length > 0 && (
                  <details className="os-agent-checks os-mt-2">
                    <summary className="os-text-sm os-c-accent-dark os-pointer">Neleri denetler ({job.checks.length})</summary>
                    <ul>
                      {job.checks.map((c) => (
                        <li key={c.key}>
                          <span className="os-fw-600">{c.title}.</span> {c.description}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {job.last_run ? (
                  <div className="os-flex os-items-center os-gap-2 os-mt-2h os-wrap">
                    {statusTag(job.last_run.status)}
                    {job.last_run.findings > 0 && (
                      <Tag type="magenta" size="sm">{job.last_run.findings} bulgu</Tag>
                    )}
                    <span className="os-text-xs os-c-tertiary">
                      Son çalıştırma {formatDateTime(job.last_run.started_at)}
                    </span>
                  </div>
                ) : (
                  <p className="os-mt-2h os-mx-0 os-mb-0 os-text-xs os-c-tertiary">Henüz çalıştırma yok</p>
                )}
                {job.last_run?.summary && (
                  <p className="os-mt-1h os-mx-0 os-mb-0 os-text-sm os-c-primary">{job.last_run.summary}</p>
                )}
              </div>

              <div className="os-flex os-items-center os-gap-4 os-shrink-0">
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Play}
                  disabled={!job.enabled || runNow.isPending}
                  onClick={() => runNow.mutate(job.name)}
                >
                  Şimdi çalıştır
                </Button>
                {!job.can_disable ? (
                  <Tag type="gray" size="sm">Her zaman açık</Tag>
                ) : (
                  <Toggle
                    id={`job-toggle-${job.name}`}
                    size="sm"
                    labelText={`${job.title} aç/kapat`}
                    hideLabel
                    toggled={job.enabled}
                    disabled={setEnabled.isPending}
                    onToggle={(checked) => setEnabled.mutate({ name: job.name, enabled: checked })}
                  />
                )}
              </div>
            </div>
          ))}
      </div>

      <WorkflowAgents />
    </div>
  );
}