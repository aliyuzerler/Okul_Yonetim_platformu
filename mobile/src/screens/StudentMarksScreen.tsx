// StudentMarksScreen — term picker + percentage bars via the shared view.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { commonApi, studentApi } from "../api";
import { MarksView } from "../components/portal";
import { ErrorNote, LoadingView, Screen } from "../components/Screen";
import { useI18n } from "../i18n/I18nContext";

export default function StudentMarksScreen() {
  const { t } = useI18n();
  const [termId, setTermId] = useState<string | null>(null);

  const yearQuery = useQuery({
    queryKey: ["common", "current-year"],
    queryFn: commonApi.currentAcademicYear,
  });
  const termsQuery = useQuery({
    queryKey: ["common", "terms", yearQuery.data?.id],
    queryFn: () => commonApi.terms(yearQuery.data!.id),
    enabled: Boolean(yearQuery.data?.id),
  });
  const terms = termsQuery.data;
  useEffect(() => {
    if (!termId && terms && terms.length > 0) {
      setTermId((terms.find((term) => term.is_current) ?? terms[0]).id);
    }
  }, [terms, termId]);

  const marksQuery = useQuery({
    queryKey: ["student", "marks", termId],
    queryFn: () => studentApi.marks(termId as string),
    enabled: Boolean(termId),
  });

  if (termsQuery.isLoading || marksQuery.isLoading) return <LoadingView />;

  return (
    <Screen title={t("marks.title")}>
      {marksQuery.isError ? (
        <ErrorNote message={t("common.error")} onRetry={() => void marksQuery.refetch()} />
      ) : (
        <MarksView
          terms={terms}
          termId={termId}
          onTermChange={setTermId}
          marks={marksQuery.data}
        />
      )}
    </Screen>
  );
}
