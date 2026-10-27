// ChildDetailScreen — parent's per-child portal. Renders the exact same
// AttendanceView / MarksView / TimetableView the student screens use, so the
// two roles never drift.
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { commonApi, guardianApi } from "../api";
import {
  AttendanceView,
  Chip,
  MarksView,
  TimetableView,
} from "../components/portal";
import { ErrorNote, LoadingView, Screen } from "../components/Screen";
import { useI18n } from "../i18n/I18nContext";
import type { RootStackParamList } from "../navigation/navigationRef";
import { palette, spacing } from "../theme/tokens";

type Segment = "attendance" | "marks" | "timetable";

export default function ChildDetailScreen() {
  const { t } = useI18n();
  const route = useRoute<RouteProp<RootStackParamList, "ChildDetail">>();
  const childId = route.params.childId;

  const [segment, setSegment] = useState<Segment>("attendance");
  const [termId, setTermId] = useState<string | null>(null);

  const childQuery = useQuery({
    queryKey: ["parent", "children"],
    queryFn: guardianApi.children,
  });
  const child = useMemo(
    () => (childQuery.data ?? []).find((c) => c.id === childId),
    [childQuery.data, childId],
  );

  const attendanceQuery = useQuery({
    queryKey: ["parent", "child-attendance", childId],
    queryFn: () => guardianApi.childAttendance(childId),
  });

  // Terms power the marks picker: current year → its terms.
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
    queryKey: ["parent", "child-marks", childId, termId],
    queryFn: () => guardianApi.childMarks(childId, termId as string),
    enabled: Boolean(termId),
  });

  const timetableQuery = useQuery({
    queryKey: ["parent", "child-timetable", childId],
    queryFn: () => guardianApi.childTimetable(childId),
  });

  if (childQuery.isLoading || !child) return <LoadingView />;

  const segments: Array<{ key: Segment; label: string }> = [
    { key: "attendance", label: t("child.segment.attendance") },
    { key: "marks", label: t("child.segment.marks") },
    { key: "timetable", label: t("child.segment.timetable") },
  ];

  return (
    <Screen>
      <Text style={styles.childName}>{child.full_name}</Text>
      <Text style={styles.childMeta}>
        {t("home.child.class")}: {child.class_name ?? "—"}
        {child.grade_name ? ` · ${child.grade_name}` : ""}
      </Text>

      <View style={styles.chipRow}>
        {segments.map((s) => (
          <Chip
            key={s.key}
            label={s.label}
            active={s.key === segment}
            onPress={() => setSegment(s.key)}
          />
        ))}
      </View>

      {segment === "attendance" ? (
        attendanceQuery.isError ? (
          <ErrorNote message={t("common.error")} onRetry={() => void attendanceQuery.refetch()} />
        ) : attendanceQuery.isLoading ? (
          <LoadingView />
        ) : (
          <AttendanceView records={attendanceQuery.data} />
        )
      ) : null}

      {segment === "marks" ? (
        marksQuery.isError ? (
          <ErrorNote message={t("common.error")} onRetry={() => void marksQuery.refetch()} />
        ) : marksQuery.isLoading ? (
          <LoadingView />
        ) : (
          <MarksView
            terms={terms}
            termId={termId}
            onTermChange={setTermId}
            marks={marksQuery.data}
          />
        )
      ) : null}

      {segment === "timetable" ? (
        timetableQuery.isError ? (
          <ErrorNote message={t("common.error")} onRetry={() => void timetableQuery.refetch()} />
        ) : timetableQuery.isLoading ? (
          <LoadingView />
        ) : (
          <TimetableView
            timetable={timetableQuery.data?.timetable}
            entries={timetableQuery.data?.entries}
          />
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  childName: {
    fontSize: 22,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: spacing.xs,
  },
  childMeta: {
    fontSize: 13,
    color: palette.textTertiary,
    marginBottom: spacing.m,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.s,
    marginBottom: spacing.m,
  },
});
