// PasswordInterstitialScreen — first-login / expired default password flow.
// Two choices mirror the web frontend's interstitial: change the password now
// (POST /auth/change-password) or keep it (POST /auth/keep-default-password).
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../auth/AuthContext";
import { Screen } from "../components/Screen";
import { useI18n } from "../i18n/I18nContext";
import { palette, radius, spacing } from "../theme/tokens";

export default function PasswordInterstitialScreen() {
  const { t } = useI18n();
  const { completePasswordChange, keepDefaultPassword } = useAuth();

  const [mode, setMode] = useState<"choice" | "change">("choice");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submitChange = async () => {
    setError(null);
    if (password.length < 10) return setError(t("password.tooShort"));
    if (password !== confirm) return setError(t("password.mismatch"));
    setBusy(true);
    try {
      await completePasswordChange(password);
      setDone(t("password.changed"));
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  const submitKeep = async () => {
    setBusy(true);
    try {
      await keepDefaultPassword();
      setDone(t("password.kept"));
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>{t("password.interstitial.title")}</Text>
        <Text style={styles.body}>{t("password.interstitial.body")}</Text>

        {done ? <Text style={styles.done}>{done}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {mode === "choice" ? (
          <>
            <Pressable
              style={[styles.button, styles.primary]}
              disabled={busy}
              onPress={() => setMode("change")}
            >
              <Text style={styles.primaryText}>{t("password.change")}</Text>
            </Pressable>
            <Pressable style={styles.button} disabled={busy} onPress={submitKeep}>
              {busy ? (
                <ActivityIndicator color={palette.textSecondary} />
              ) : (
                <Text style={styles.secondaryText}>{t("password.keep")}</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.label}>{t("password.new")}</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoComplete="new-password"
            />
            <Text style={styles.label}>{t("password.confirm")}</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
              autoCapitalize="none"
              autoComplete="new-password"
            />
            <Pressable
              style={[styles.button, styles.primary]}
              disabled={busy}
              onPress={submitChange}
            >
              {busy ? (
                <ActivityIndicator color={palette.textOnColor} />
              ) : (
                <Text style={styles.primaryText}>{t("password.change")}</Text>
              )}
            </Pressable>
            <Pressable style={styles.button} disabled={busy} onPress={() => setMode("choice")}>
              <Text style={styles.secondaryText}>{t("common.cancel")}</Text>
            </Pressable>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.m,
    padding: spacing.l,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: palette.textPrimary,
    textAlign: "center",
  },
  body: {
    color: palette.textTertiary,
    textAlign: "center",
    maxWidth: 420,
  },
  done: {
    color: palette.success,
    fontWeight: "600",
  },
  error: {
    color: palette.danger,
  },
  label: {
    alignSelf: "flex-start",
    color: palette.textSecondary,
    fontSize: 13,
  },
  input: {
    width: "100%",
    maxWidth: 420,
    borderColor: palette.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.s,
    backgroundColor: palette.layer,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    color: palette.textPrimary,
  },
  button: {
    width: "100%",
    maxWidth: 420,
    borderRadius: radius.m,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    backgroundColor: palette.layer,
    paddingVertical: spacing.m,
    alignItems: "center",
  },
  primary: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  primaryText: {
    color: palette.textOnColor,
    fontWeight: "700",
  },
  secondaryText: {
    color: palette.textSecondary,
    fontWeight: "600",
  },
});
