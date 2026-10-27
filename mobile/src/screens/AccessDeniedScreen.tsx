// AccessDenied — shown for roles outside the approved mobile scope
// (admin/teacher; scope decision recorded in the recovery worklog).
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { Screen } from "../components/Screen";
import { useI18n } from "../i18n/I18nContext";
import { palette, radius, spacing } from "../theme/tokens";

export default function AccessDeniedScreen() {
  const { t } = useI18n();
  const { signOut } = useAuth();

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed" size={36} color={palette.textOnColor} />
        </View>
        <Text style={styles.title}>{t("error.accessDenied")}</Text>
        <Text style={styles.body}>{t("error.accessDeniedBody")}</Text>
        <Text onPress={() => void signOut()} style={styles.signOut}>
          {t("auth.signOut")}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.l,
    gap: spacing.m,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.l,
    backgroundColor: palette.danger,
    alignItems: "center",
    justifyContent: "center",
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
  signOut: {
    color: palette.accent,
    fontWeight: "700",
    padding: spacing.s,
  },
});
