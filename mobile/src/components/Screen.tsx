// Shared screen chrome: safe area + scroll container + centered width.
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useI18n } from "../i18n/I18nContext";
import { palette, spacing } from "../theme/tokens";

export function Screen({
  title,
  children,
  scroll = true,
  padded = true,
}: {
  title?: string;
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
}) {
  const content = (
    <View style={[styles.inner, padded ? styles.innerPadded : null]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>{content}</ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <View style={styles.errorNote}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Text onPress={onRetry} style={styles.retryText}>
          {t("common.retry")}
        </Text>
      ) : null}
    </View>
  );
}

export function LoadingView() {
  const { t } = useI18n();
  return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>{t("common.loading")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
  },
  inner: {
    width: "100%",
    maxWidth: 640,
  },
  innerPadded: {
    padding: spacing.m,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: palette.textPrimary,
    marginBottom: spacing.m,
  },
  errorNote: {
    backgroundColor: palette.statusAbsent.bg,
    borderColor: palette.statusAbsent.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: spacing.m,
    marginBottom: spacing.m,
  },
  errorText: {
    color: palette.statusAbsent.text,
    fontSize: 14,
  },
  retryText: {
    color: palette.accent,
    fontWeight: "700",
    marginTop: spacing.s,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  loadingText: {
    color: palette.textTertiary,
  },
});
