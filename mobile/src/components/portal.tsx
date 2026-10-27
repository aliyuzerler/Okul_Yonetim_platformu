// Shared read-only portal views. Both the parent (ChildDetailScreen) and the
// student screens render exactly these, so the two roles always agree.
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { MessageKey } from "../i18n/messages";
import type {
  AttendanceRecordItem,
  ChildSummary,
  GuardianChild,
  StudentMarkRow,
  Term,
  TimetableEntryItem,
  TimetableInfo,
} from "../api/types";
import { useI18n } from "../i18n/I18nContext";
import { palette, radius, spacing } from "../theme/tokens";

// ---- primitives -----------------------------------------------------------

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ text }: { text: string }) {
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

export function StatPill({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={[styles.statPill, tone ? { backgroundColor: tone } : null]}>
      <Text style={styles.statPillValue}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ ratio, color }: { ratio: number; color?: string }) {
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.round(clamped * 100)}%`, backgroundColor: color ?? palette.accent },
        ]}
      />
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : null]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  present: { bg: palette.statusPresent.bg, border: palette.statusPresent.border, text: palette.statusPresent.text },
  absent: { bg: palette.statusAbsent.bg, border: palette.statusAbsent.border, text: palette.statusAbsent.text },
  late: { bg: palette.statusLate.bg, border: palette.statusLate.border, text: palette.statusLate.text },
  excused: { bg: palette.statusExcused.bg, border: palette.statusExcused.border, text: palette.statusExcused.text },
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const tone = STATUS_STYLES[status] ?? {
    bg: palette.layerSelected,
    border: palette.borderStrong,
    text: palette.textPrimary,
  };
  const labels: Record<string, string> = {
    present: t("attendance.present"),
    absent: t("attendance.absent"),
    late: t("attendance.late"),
    excused: t("attendance.excused"),
  };
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Text style={[styles.badgeText, { color: tone.text }]}>
        {labels[status] ?? status}
      </Text>
    </View>
  );
}

const PRIORITY_TONES: Record<string, { bg: string; text: string }> = {
  normal: { bg: palette.layerSelected, text: palette.textSecondary },
  important: { bg: palette.statusLate.bg, text: palette.warningText },
  urgent: { bg: palette.statusAbsent.bg, text: palette.statusAbsent.text },
};

export function TagBadge({ label, tone }: { label: string; tone: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: tone, borderColor: palette.borderStrong }]}>
      <Text style={[styles.badgeText, { color: palette.textPrimary }]}>{label}</Text>
    </View>
  );
}

export function NotificationBadges({ category, priority }: { category: string; priority: string }) {
  const { t } = useI18n();
  const categoryKey = `category.${category}` as MessageKey;
  const priorityKey = `priority.${priority}` as MessageKey;
  return (
    <View style={styles.badgeRow}>
      <TagBadge label={t(categoryKey)} tone={palette.accentLight} />
      <TagBadge label={t(priorityKey)} tone={PRIORITY_TONES[priority]?.bg ?? palette.layerSelected} />
    </View>
  );
}

// ---- attendance -----------------------------------------------------------

const monthKey = (iso: string) => iso.slice(0, 7);

/**
 * Devamsızlık: month filter + status badges + totals.
 * Data comes from /me/children/:id/attendance or /me/student/attendance.
 */
export function AttendanceView({ records }: { records: AttendanceRecordItem[] | undefined }) {
  const { t, formatDate } = useI18n();
  const months = useMemo(() => {
    const set = new Set<string>((records ?? []).map((r) => monthKey(r.session_date)));
    const list = Array.from(set).sort().reverse();
    const now = new Date().toISOString().slice(0, 7);
    return list.includes(now) ? list : [now, ...list];
  }, [records]);
  const [selected, setSelected] = useState<string | null>(null);
  const activeMonth = selected ?? months[0] ?? new Date().toISOString().slice(0, 7);

  const monthRecords = (records ?? []).filter((r) => monthKey(r.session_date) === activeMonth);
  const totals = monthRecords.reduce(
    (acc, r) => {
      if (r.status === "present") acc.present += 1;
      else if (r.status === "absent") acc.absent += 1;
      else if (r.status === "late") acc.late += 1;
      else if (r.status === "excused") acc.excused += 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0, excused: 0 },
  );
  const attended = totals.present + totals.late;
  const sessions = monthRecords.length;
  const rate = sessions > 0 ? Math.round((attended / sessions) * 1000) / 10 : null;

  return (
    <View>
      <SectionTitle text={t("attendance.title")} />
      {months.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {months.map((m) => (
            <Chip
              key={m}
              label={formatDate(`${m}-01`, "short")}
              active={m === activeMonth}
              onPress={() => setSelected(m)}
            />
          ))}
        </ScrollView>
      ) : null}

      {sessions > 0 ? (
        <>
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.bodyText}>{t("attendance.rate")}</Text>
              <Text style={styles.rateText}>{rate === null ? "—" : `${rate}%`}</Text>
            </View>
            <ProgressBar ratio={rate === null ? 0 : rate / 100} color={palette.accent} />
            <View style={styles.totalsRow}>
              <Text style={styles.mutedText}>{t("attendance.totals")}:</Text>
              <Text style={styles.mutedText}>
                {t("attendance.present")} {totals.present} · {t("attendance.absent")} {totals.absent} ·{" "}
                {t("attendance.late")} {totals.late} · {t("attendance.excused")} {totals.excused}
              </Text>
            </View>
          </Card>
          {monthRecords
            .slice()
            .sort((a, b) => b.session_date.localeCompare(a.session_date))
            .map((r) => (
              <Card key={r.id}>
                <View style={styles.rowBetween}>
                  <Text style={styles.bodyText}>{formatDate(r.session_date, "short")}</Text>
                  <StatusBadge status={r.status} />
                </View>
                {r.note ? (
                  <Text style={styles.mutedText}>
                    {t("attendance.note")}: {r.note}
                  </Text>
                ) : null}
              </Card>
            ))}
        </>
      ) : (
        <Card>
          <Text style={styles.mutedText}>{t("attendance.empty")}</Text>
        </Card>
      )}
    </View>
  );
}

// ---- marks ----------------------------------------------------------------

/**
 * Notlar: term picker + percentage bars per subject.
 * Data comes from /me/children/:id/marks?term_id or /me/student/marks?term_id.
 */
export function MarksView({
  terms,
  termId,
  onTermChange,
  marks,
}: {
  terms: Term[] | undefined;
  termId: string | null;
  onTermChange: (id: string) => void;
  marks: StudentMarkRow[] | undefined;
}) {
  const { t } = useI18n();

  return (
    <View>
      <SectionTitle text={t("marks.title")} />
      {terms && terms.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {terms
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((term) => (
              <Chip
                key={term.id}
                label={term.name}
                active={term.id === termId}
                onPress={() => onTermChange(term.id)}
              />
            ))}
        </ScrollView>
      ) : null}

      {marks && marks.length > 0 ? (
        marks
          .slice()
          .sort((a, b) => a.subject_name.localeCompare(b.subject_name))
          .map((row) => {
            const percent =
              row.is_absent || row.max_marks <= 0
                ? null
                : Math.round((row.marks / row.max_marks) * 1000) / 10;
            return (
              <Card key={row.id}>
                <View style={styles.rowBetween}>
                  <Text style={styles.subjectText}>{row.subject_name}</Text>
                  <Text style={styles.rateText}>
                    {row.is_absent ? t("marks.absent") : `${row.marks}/${row.max_marks}`}
                  </Text>
                </View>
                <ProgressBar
                  ratio={percent === null ? 0 : percent / 100}
                  color={percent !== null && percent < 50 ? palette.danger : palette.accent}
                />
                <View style={styles.totalsRow}>
                  <Text style={styles.mutedText}>
                    {t("marks.percent")}: {percent === null ? "—" : `${percent}%`}
                  </Text>
                  {row.teacher_name ? (
                    <Text style={styles.mutedText}>
                      {t("marks.teacher")}: {row.teacher_name}
                    </Text>
                  ) : null}
                </View>
              </Card>
            );
          })
      ) : (
        <Card>
          <Text style={styles.mutedText}>{t("marks.empty")}</Text>
        </Card>
      )}
    </View>
  );
}

// ---- timetable ------------------------------------------------------------

/**
 * Ders Programı: day chips + subject/teacher/classroom/option-block blocks.
 * Data comes from /me/children/:id/timetable or /timetable/my-class.
 */
export function TimetableView({
  timetable,
  entries,
}: {
  timetable: TimetableInfo | undefined;
  entries: TimetableEntryItem[] | undefined;
}) {
  const { t } = useI18n();
  const [day, setDay] = useState<number>(1);
  const dayEntries = (entries ?? [])
    .filter((e) => e.day_of_week === day)
    .sort((a, b) => a.period_number - b.period_number);

  if (!timetable) {
    return (
      <View>
        <SectionTitle text={t("timetable.title")} />
        <Card>
          <Text style={styles.mutedText}>{t("timetable.empty")}</Text>
        </Card>
      </View>
    );
  }

  return (
    <View>
      <SectionTitle text={t("timetable.title")} />
      <View style={styles.chipRow}>
        {[1, 2, 3, 4, 5].map((d) => (
          <Chip
            key={d}
            label={t(`timetable.day.${d}` as MessageKey)}
            active={d === day}
            onPress={() => setDay(d)}
          />
        ))}
      </View>
      {dayEntries.length > 0 ? (
        dayEntries.map((entry) => (
          <Card key={entry.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.subjectText}>
                {entry.option_block_name ?? entry.subject_name ?? "—"}
                {entry.option_block_id ? ` (${t("timetable.optionBlock")})` : ""}
              </Text>
              <Text style={styles.periodText}>
                {t("timetable.period")} {entry.period_number}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              {entry.teacher_name ? (
                <Text style={styles.mutedText}>
                  {t("timetable.teacher")}: {entry.teacher_name}
                </Text>
              ) : null}
              {entry.classroom_name ? (
                <Text style={styles.mutedText}>
                  {t("timetable.room")}: {entry.classroom_name}
                </Text>
              ) : null}
            </View>
          </Card>
        ))
      ) : (
        <Card>
          <Text style={styles.mutedText}>{t("common.empty")}</Text>
        </Card>
      )}
    </View>
  );
}

// ---- parent home card -----------------------------------------------------

export function ChildCard({
  child,
  summary,
  onPress,
}: {
  child: GuardianChild;
  summary: ChildSummary | undefined;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const sessions = summary?.sessions_this_month ?? 0;
  const attended = summary?.attended_this_month ?? 0;
  const rate = sessions > 0 ? Math.round((attended / sessions) * 1000) / 10 : null;

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card>
        <Text style={styles.subjectText}>{child.full_name}</Text>
        <Text style={styles.mutedText}>
          {t("home.child.class")}: {child.class_name ?? "—"}
          {child.grade_name ? ` · ${child.grade_name}` : ""}
        </Text>
        <View style={[styles.totalsRow, { marginTop: spacing.s }]}>
          <StatPill
            label={t("home.child.attendanceThisMonth")}
            value={rate === null ? "—" : `${rate}%`}
            tone={palette.accentLight}
          />
          <StatPill
            label={summary?.has_marks ? summary.latest_term_name : t("home.child.noMarks")}
            value={
              summary?.has_marks ? `${Math.round(summary.latest_average_percent)}%` : "—"
            }
          />
        </View>
        <Text style={styles.linkText}>{t("home.child.viewDetail")} →</Text>
      </Card>
    </Pressable>
  );
}

// ---- styles ---------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.layer,
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderSubtle,
    padding: spacing.m,
    marginBottom: spacing.m,
    gap: spacing.s,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: palette.textPrimary,
    marginBottom: spacing.s,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.s,
  },
  totalsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.s,
  },
  chipRow: {
    flexDirection: "row",
    marginBottom: spacing.m,
    gap: spacing.s,
  },
  chip: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    backgroundColor: palette.layer,
    marginRight: spacing.s,
  },
  chipActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  chipText: {
    color: palette.textPrimary,
    fontSize: 13,
  },
  chipTextActive: {
    color: palette.textOnColor,
    fontWeight: "600",
  },
  badge: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.s + 2,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.s,
    flexWrap: "wrap",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bodyText: {
    color: palette.textPrimary,
    fontSize: 15,
  },
  subjectText: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
  },
  mutedText: {
    color: palette.textTertiary,
    fontSize: 13,
  },
  rateText: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  periodText: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  linkText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  statPill: {
    borderRadius: radius.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: palette.layerSelected,
    alignItems: "center",
    minWidth: 96,
  },
  statPillValue: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.textPrimary,
  },
  statPillLabel: {
    fontSize: 11,
    color: palette.textTertiary,
    textAlign: "center",
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.layerSelected,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
});
