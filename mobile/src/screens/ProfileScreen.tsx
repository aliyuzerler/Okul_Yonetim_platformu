// ProfileScreen — language switch, change password entry, role badges,
// push notifications Switch section (with the simulator note) and sign-out.
import Constants from "expo-constants";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../auth/AuthContext";
import { Card } from "../components/portal";
import { Screen } from "../components/Screen";
import { useI18n, type Language } from "../i18n/I18nContext";
import { palette, radius, spacing } from "../theme/tokens";

const LANGUAGES: Array<{ key: Language; label: string }> = [
  { key: "tr", label: "Türkçe" },
  { key: "en", label: "English" },
];

export default function ProfileScreen() {
  const { t } = useI18n();
  const {
    me,
    role,
    language,
    changeLanguage,
    pushEnabled,
    requestPush,
    signOut,
    busy,
  } = useAuth();

  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const roles = me?.roles ?? (role ? [role] : []);
  const roleLabels = roles
    .map((r) =>
      r === "parent"
        ? t("profile.role.parent")
        : r === "student"
          ? t("profile.role.student")
          : r === "teacher"
            ? t("profile.role.teacher")
            : r === "admin"
              ? t("profile.role.admin")
              : r,
    )
    .filter((value, index, all) => all.indexOf(value) === index);

  const onPushToggle = async (enabled: boolean) => {
    setPushBusy(true);
    setPushError(null);
    try {
      await requestPush(enabled);
    } catch {
      setPushError(t("push.error"));
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <Screen title={t("profile.title")}>
      {/* Identity */}
      <Card>
        <Text style={styles.cardLabel}>{t("profile.signedInAs")}</Text>
        <Text style={styles.identity}>
          {me?.given_name || ""} {me?.family_name || ""}
        </Text>
        {me?.email ? <Text style={styles.muted}>{me.email}</Text> : null}
        <Text style={styles.cardLabel}>{t("profile.roles")}</Text>
        <View style={styles.badgeRow}>
          {roleLabels.map((label) => (
            <View key={label} style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Language */}
      <Card>
        <Text style={styles.cardLabel}>{t("profile.language")}</Text>
        <View style={styles.langRow}>
          {LANGUAGES.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => void changeLanguage(option.key)}
              style={[styles.langChip, language === option.key ? styles.langChipActive : null]}
              accessibilityRole="button"
              accessibilityState={{ selected: language === option.key }}
            >
              <Text
                style={[
                  styles.langChipText,
                  language === option.key ? styles.langChipTextActive : null,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* Push notifications */}
      <Card>
        <View style={styles.pushRow}>
          <View style={styles.pushText}>
            <Text style={styles.cardLabel}>{t("push.title")}</Text>
            <Text style={styles.muted}>{t("push.subtitle")}</Text>
          </View>
          {pushBusy ? (
            <ActivityIndicator color={palette.accent} />
          ) : (
            <Switch
              value={pushEnabled}
              onValueChange={(value) => void onPushToggle(value)}
              trackColor={{ false: palette.borderStrong, true: palette.accent }}
              thumbColor={palette.layer}
            />
          )}
        </View>
        {pushError ? <Text style={styles.error}>{pushError}</Text> : null}
        <Text style={styles.note}>{t("push.simulatorNote")}</Text>
      </Card>

      {/* Password + sign out */}
      <Card>
        <Pressable style={styles.link} onPress={() => setShowPassword((v) => !v)}>
          <Text style={styles.linkText}>{t("profile.changePassword")}</Text>
        </Pressable>
        {showPassword ? (
          <PasswordChangeInline onDone={() => setShowPassword(false)} />
        ) : null}
      </Card>

      <Card>
        <Pressable
          style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
          disabled={busy}
          onPress={() => void signOut()}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator color={palette.danger} />
          ) : (
            <Text style={styles.signOutText}>{t("auth.signOut")}</Text>
          )}
        </Pressable>
      </Card>

      <Text style={styles.version}>
        {t("profile.version")} {Constants.expoConfig?.version ?? "0.2.0"}
      </Text>
    </Screen>
  );
}

function PasswordChangeInline({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const { completePasswordChange } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (password.length < 10) return setError(t("password.tooShort"));
    if (password !== confirm) return setError(t("password.mismatch"));
    setBusy(true);
    try {
      await completePasswordChange(password);
      setDone(true);
      setTimeout(onDone, 1200);
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  if (done) return <Text style={styles.success}>{t("password.changed")}</Text>;

  return (
    <View style={styles.inlineForm}>
      <TextInput
        style={styles.input}
        secureTextEntry
        placeholder={t("password.new")}
        placeholderTextColor={palette.textDisabled}
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        secureTextEntry
        placeholder={t("password.confirm")}
        placeholderTextColor={palette.textDisabled}
        value={confirm}
        onChangeText={setConfirm}
        autoCapitalize="none"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={[styles.inlineButton, busy && styles.signOutPressed]} disabled={busy} onPress={submit}>
        {busy ? <ActivityIndicator color={palette.textOnColor} /> : (
          <Text style={styles.inlineButtonText}>{t("common.save")}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardLabel: {
    color: palette.textTertiary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: spacing.xs,
  },
  identity: {
    color: palette.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: spacing.m,
  },
  muted: {
    color: palette.textTertiary,
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.s,
    flexWrap: "wrap",
  },
  roleBadge: {
    backgroundColor: palette.accentLight,
    borderColor: palette.accentBorder,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: spacing.m,
    paddingVertical: 4,
  },
  roleBadgeText: {
    color: palette.accentDeeper,
    fontSize: 12,
    fontWeight: "700",
  },
  langRow: {
    flexDirection: "row",
    gap: spacing.s,
  },
  langChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    backgroundColor: palette.layer,
  },
  langChipActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  langChipText: {
    color: palette.textPrimary,
    fontWeight: "600",
  },
  langChipTextActive: {
    color: palette.textOnColor,
  },
  pushRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.m,
  },
  pushText: {
    flex: 1,
  },
  error: {
    color: palette.danger,
    fontSize: 13,
    marginTop: spacing.s,
  },
  note: {
    color: palette.textDisabled,
    fontSize: 12,
    marginTop: spacing.s,
  },
  link: {
    paddingVertical: spacing.xs,
  },
  linkText: {
    color: palette.accent,
    fontWeight: "700",
  },
  inlineForm: {
    marginTop: spacing.m,
    gap: spacing.s,
  },
  input: {
    borderColor: palette.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.s,
    backgroundColor: palette.canvas,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    color: palette.textPrimary,
  },
  inlineButton: {
    backgroundColor: palette.accent,
    borderRadius: radius.s,
    alignItems: "center",
    paddingVertical: spacing.s,
  },
  inlineButtonText: {
    color: palette.textOnColor,
    fontWeight: "700",
  },
  success: {
    color: palette.success,
    fontWeight: "600",
    marginTop: spacing.s,
  },
  signOut: {
    alignItems: "center",
    paddingVertical: spacing.s,
  },
  signOutPressed: {
    opacity: 0.6,
  },
  signOutText: {
    color: palette.danger,
    fontWeight: "700",
  },
  version: {
    color: palette.textDisabled,
    fontSize: 12,
    textAlign: "center",
    padding: spacing.m,
  },
});
