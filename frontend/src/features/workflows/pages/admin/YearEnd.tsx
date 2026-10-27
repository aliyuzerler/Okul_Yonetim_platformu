import { Link } from "react-router";
import { Button, Tag } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { useWorkflowCatalog } from "@/features/workflows/queries/useWorkflows";
import { RUN_STATE_TAG } from "@/features/workflows/runState";
import ListState from "@/shared/ui/ListState";
import InfoTip from "@/shared/ui/InfoTip";
import { formatDateTime } from "@/shared/lib/date";

// The year-end pipeline in order. Each card is one deterministic workflow from the backend catalogue.
export default function YearEnd() {
  const { data: allWorkflows, isLoading, isError, refetch } = useWorkflowCatalog();
  const catalog = allWorkflows?.filter((w) => w.group === "year_end");

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Yıl sonu</h1>
          <div className="os-page__subtitle os-page__subtitle--tip">
            Gelecek yılı adım adım hazırlayın. İnceleyip uygulayana kadar hiçbir şey değişmez.
            <InfoTip>Her adım önce öneri hazırlar, her satır için karar gerekçesini gösterir ve gerçek yoklama veya notlara bağımlılık oluşana kadar geri alınabilir. Her adım ayrıca ilgili sayfalardan elle de yapılabilir.</InfoTip>
          </div>
        </div>
        <Button kind="tertiary" size="md" as={Link} to="/promotion">Sınıf geçmeyi elle yap</Button>
      </div>

      <ListState
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        errorMessage="Yıl sonu adımları yüklenemedi."
        isEmpty={!catalog?.length}
        empty={{ title: "Henüz yıl sonu adımı yok", description: "Sunucu hiçbir akış döndürmedi." }}
        skeleton={<div className="os-section os-p-6">Yükleniyor…</div>}
      >
        <ol className="os-pipeline">
          {catalog?.map((w) => (
            <li key={w.key} className="os-pipeline__item">
              <span className="os-pipeline__number" aria-hidden="true">{w.order}</span>
              <div className="os-flex-1 os-min-w-0">
                <div className="os-flex os-items-center os-gap-2 os-wrap">
                  <h2 className="os-pipeline__title">{w.title}</h2>
                  {w.last_run && <Tag type={RUN_STATE_TAG[w.last_run.state].type} size="sm">{RUN_STATE_TAG[w.last_run.state].label}</Tag>}
                </div>
                <p className="os-m-0 os-text-sm os-c-secondary">{w.description}</p>
                {w.last_run?.summary && (
                  <p className="os-mt-1 os-mb-0 os-text-xs os-c-tertiary">
                    {w.last_run.summary} · {formatDateTime(w.last_run.applied_at ?? w.last_run.created_at)}
                  </p>
                )}
              </div>
              <Button kind="ghost" size="sm" renderIcon={ArrowRight} as={Link} to={`/year-end/${w.key}`}>
                Aç
              </Button>
            </li>
          ))}
        </ol>
      </ListState>
    </div>
  );
}
