// StudentTimetableScreen — the published class timetable via the shared view.
import { useQuery } from "@tanstack/react-query";

import { studentApi } from "../api";
import { TimetableView } from "../components/portal";
import { ErrorNote, LoadingView, Screen } from "../components/Screen";
import { useI18n } from "../i18n/I18nContext";

export default function StudentTimetableScreen() {
  const { t } = useI18n();
  const query = useQuery({
    queryKey: ["student", "timetable"],
    queryFn: studentApi.timetable,
  });

  if (query.isLoading) return <LoadingView />;
  if (query.isError) {
    return (
      <Screen title={t("timetable.title")}>
        <ErrorNote message={t("common.error")} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen title={t("timetable.title")}>
      <TimetableView timetable={query.data?.timetable} entries={query.data?.entries} />
    </Screen>
  );
}
