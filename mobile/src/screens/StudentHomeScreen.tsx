// StudentHomeScreen — profile card + this month's attendance rate +
// today's classes + shortcuts into the detail screens.
import { useNavigation } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { commonApi, studentApi } from "../api";
import { AttendanceView, Card, ProgressBar, SectionTitle } from "../components/portal";
import { ErrorNote, LoadingView, Screen } from "../components/Screen";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import type { RootStackParamList, TabParamList } from "../navigation/navigationRef";
import { palette, radius, spacing } from "../theme/tokens";

export type StudentHomeProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "StudentHome">,
  NativeStackScreenProps<RootStackParamList>
>;

export default function StudentHomeScreen(_props: StudentHomeProps) {
  void _props;
  const { t } = useI18n();
  const navigation = useNavigation<StudentHomeProps["navigation"]>();

  const profileQuery = useQuery({ queryKey: ["student", "profile"], queryFn: studentApi.profile });
  const attendanceQuery = useQuery({
    queryKey: ["student", "attendance"],
    queryFn: studentApi.attendance,
  });
  const timetableQuery = useQuery({
    queryKey: ["student", "timetable"],
    queryFn: studentApi.timetable,
  });

  const profile = profileQuery.data;

  // This month's attendance rate from the raw records.
  const nowMonth = new Date().toISOString().slice(0, 7);
  const monthRecords = (attendanceQuery.data ?? []).filter((r) =>
    r.session_date.startsWith(nowMonth),
  );
  const attended = monthRecords.filter((r) => r.status === "present" || r.status === "late").length;
  const rate = monthRecords.length > 0 ? Math.round((attended / monthRecords.length) * 1000) / 10 : null;

  // Today's classes: JS day 1–5 map onto the timetable's day_of_week.
  const jsDay = new Date().getDay(); // 0 Sun … 6 Sat
  const today = jsDay >= 1 && jsDay <= 5 ? jsDay : null;
  const todayEntries = (timetableQuery.data?.entries ?? [])
    .filter((e) => e.day_of_week === today)
    .sort((a, b) => a.period_number - b.period_number);

  if (profileQuery.isLoading || attendanceQuery.isLoading) return <LoadingView />;

  if (profileQuery.isError) {
    return (
      <Screen>
        <ErrorNote message={t("student.noProfile")} onRetry={() => void profileQuery.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen title={t("student.title")}>
      {/* Profile card */}
      <Card>
        <Text style={styles.name}>{profile?.full_name}</Text>
        <View style={styles.metaGrid}>
          <MetaLine label={t("student.index")} value={profile?.index_number} />
          <MetaLine
            label={t("student.class")}
            value={[profile?.grade_name, profile?.class_name].filter(Boolean).join(" · ")}
          />
          <MetaLine label={t("student.house")} value={profile?.house_name} />
          <MetaLine label={t("student.year")} value={profile?.academic_year} />
          <MetaLine label={t("student.status")} value={profile?.enrollment_status} />
        </View>
      </Card>

      {/* Month attendance rate */}
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.cardLabel}>{t("student.attendanceThisMonth")}</Text>
          <Text style={styles.rate}>{rate === null ? "—" : `${rate}%`}</Text>
        </View>
        <ProgressBar ratio={rate === null ? 0 : rate / 100} />
      </Card>

      {/* Today's classes */}
      <SectionTitle text={t("student.today")} />
      {today === null || todayEntries.length === 0 ? (
        <Card>
          <Text style={styles.muted}>{t("student.todayEmpty")}</Text>
        </Card>
      ) : (
        todayEntries.map((entry) => (
          <Card key={entry.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.entrySubject}>
                {entry.option_block_name ?? entry.subject_name ?? "—"}
              </Text>
              <Text style={styles.entryPeriod}>
                {t("timetable.period")} {entry.period_number}
              </Text>
            </View>
            <Text style={styles.muted}>
              {entry.teacher_name ? `${t("timetable.teacher")}: ${entry.teacher_name}` : ""}
              {entry.classroom_name
                ? `${entry.teacher_name ? " · " : ""}${t("timetable.room")}: ${entry.classroom_name}`
                : ""}
            </Text>
          </Card>
        ))
      )}

      {/* Shortcuts */}
      <SectionTitle text={t("profile.title")} />
      <View style={styles.shortcutRow}>
        <Shortcut label={t("student.shortcuts.attendance")} icon="calendar" onPress={() => navigation.navigate("StudentAttendance")} />
        <Shortcut label={t("student.shortcuts.marks")} icon="stats-chart" onPress={() => navigation.navigate("StudentMarks")} />
        <Shortcut label={t("student.shortcuts.timetable")} icon="grid" onPress={() => navigation.navigate("StudentTimetable")} />
      </View>

      {/* Full history below for zero-tap browsing */}
      <AttendanceView records={attendanceQuery.data} />
    </Screen>
  );
}

function MetaLine({ label, value }: { label: string; value?: string | null }) {
  return (
    <Text style={styles.metaLine}>
      <Text style={styles.metaLabel}>{label}: </Text>
      <Text style={styles.metaValue}>{value || "—"}</Text>
    </Text>
  );
}

function Shortcut({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.shortcut}>
      <Ionicons name={icon} size={20} color={palette.accent} />
      <Text style={styles.shortcutLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: spacing.s,
  },
  metaGrid: {
    gap: 2,
  },
  metaLine: {
    fontSize: 14,
    color: palette.textPrimary,
  },
  metaLabel: {
    color: palette.textTertiary,
  },
  metaValue: {
    color: palette.textPrimary,
    fontWeight: "600",
  },
  cardLabel: {
    color: palette.textPrimary,
    fontSize: 15,
  },
  rate: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.accent,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.s,
    gap: spacing.s,
  },
  muted: {
    color: palette.textTertiary,
    fontSize: 13,
  },
  entrySubject: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
  entryPeriod: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  shortcutRow: {
    flexDirection: "row",
    gap: spacing.s,
    marginBottom: spacing.l,
  },
  shortcut: {
    flex: 1,
    backgroundColor: palette.layer,
    borderColor: palette.borderSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.m,
    padding: spacing.m,
    alignItems: "center",
    gap: spacing.xs,
  },
  shortcutLabel: {
    color: palette.textPrimary,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
