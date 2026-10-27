// StudentAttendanceScreen — the student's own attendance via the shared view.
import { useQuery } from "@tanstack/react-query";

import { studentApi } from "../api";
import { AttendanceView } from "../components/portal";
import { ErrorNote, LoadingView, Screen } from "../components/Screen";
import { useI18n } from "../i18n/I18nContext";

export default function StudentAttendanceScreen() {
  const { t } = useI18n();
  const query = useQuery({
    queryKey: ["student", "attendance"],
    queryFn: studentApi.attendance,
  });

  if (query.isLoading) return <LoadingView />;
  if (query.isError) {
    return (
      <Screen title={t("attendance.title")}>
        <ErrorNote message={t("common.error")} onRetry={() => void query.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen title={t("attendance.title")}>
      <AttendanceView records={query.data} />
    </Screen>
  );
}
