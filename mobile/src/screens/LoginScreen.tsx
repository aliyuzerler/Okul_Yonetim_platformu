// LoginScreen — ThunderID OIDC (authorization code + PKCE, public client).
// In __DEV__ the effective redirect URI is printed so it can be registered in
// ThunderID (thunderid/config.yml redirectUris).
import Constants from "expo-constants";
import * as AuthSession from "expo-auth-session";
import { makeRedirectUri } from "expo-auth-session";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../auth/AuthContext";
import { env } from "../config/env";
import { Screen } from "../components/Screen";
import { useI18n } from "../i18n/I18nContext";
import { palette, radius, spacing } from "../theme/tokens";

export default function LoginScreen() {
  const { t } = useI18n();
  const { signInWithCode, busy } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Standalone builds: openschool://oauth2redirect — Expo Go: exp://<host>.
  const redirectUri = makeRedirectUri({
    scheme: env.oauth.redirectScheme,
    path: env.oauth.redirectPath,
  });

  const discovery: AuthSession.DiscoveryDocument = {
    authorizationEndpoint: env.thunderId.authorizationEndpoint,
    tokenEndpoint: env.thunderId.tokenEndpoint,
    userInfoEndpoint: env.thunderId.userInfoEndpoint,
  };

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: env.thunderId.clientId,
      scopes: env.thunderId.scopes as unknown as string[],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery,
  );

  const onSignIn = async () => {
    setError(null);
    try {
      const response = await promptAsync();
      if (response.type === "success" && response.params.code && request) {
        // PKCE exchange: the verifier lives on the loaded request.
        await signInWithCode(response.params.code, request.codeVerifier ?? "", redirectUri);
      } else if (response.type === "error") {
        setError(response.error?.message ?? t("auth.error"));
      } else if (response.type === "success") {
        setError(t("auth.error"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.error"));
    }
  };

  const signInDisabled = !env.thunderId.clientId || !request || busy;

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <View style={styles.logoRow}>
          <Ionicons name="school" size={44} color={palette.textOnColor} />
        </View>
        <Text style={styles.brand}>{t("app.name")}</Text>
        <Text style={styles.title}>{t("auth.welcome")}</Text>
        <Text style={styles.subtitle}>{t("auth.subtitle")}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          onPress={onSignIn}
          disabled={signInDisabled}
          style={({ pressed }) => [
            styles.button,
            (pressed || busy) && styles.buttonPressed,
            signInDisabled && styles.buttonDisabled,
          ]}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator color={palette.textOnColor} />
          ) : (
            <Text style={styles.buttonText}>{t("auth.signIn")}</Text>
          )}
        </Pressable>

        {!env.thunderId.clientId ? (
          <Text style={styles.hint}>
            EXPO_PUBLIC_THUNDERID_CLIENT_ID is not set — copy .env.example to .env.
          </Text>
        ) : null}

        {__DEV__ ? (
          <View style={styles.devBox}>
            <Text style={styles.devHint}>{t("auth.redirectUriHint")}</Text>
            <Text style={styles.devUri} selectable>
              {redirectUri}
            </Text>
            <Text style={styles.devHint}>
              app.json name: {Constants.expoConfig?.name} · slug: {Constants.expoConfig?.slug}
            </Text>
          </View>
        ) : null}
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
    backgroundColor: palette.canvas,
  },
  logoRow: {
    width: 88,
    height: 88,
    borderRadius: radius.l,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.m,
  },
  brand: {
    fontSize: 22,
    fontWeight: "800",
    color: palette.accent,
    marginBottom: spacing.s,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: palette.textTertiary,
    textAlign: "center",
    marginTop: spacing.s,
    marginBottom: spacing.l,
  },
  button: {
    backgroundColor: palette.accent,
    borderRadius: radius.m,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.xl,
    minWidth: 220,
    alignItems: "center",
  },
  buttonPressed: {
    backgroundColor: palette.accentDark,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: palette.textOnColor,
    fontSize: 16,
    fontWeight: "700",
  },
  errorText: {
    color: palette.danger,
    marginBottom: spacing.m,
    textAlign: "center",
  },
  hint: {
    color: palette.textTertiary,
    fontSize: 12,
    marginTop: spacing.m,
    textAlign: "center",
  },
  devBox: {
    marginTop: spacing.xl,
    backgroundColor: palette.layer,
    borderColor: palette.borderSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.m,
    padding: spacing.m,
    maxWidth: 480,
  },
  devHint: {
    color: palette.textTertiary,
    fontSize: 12,
  },
  devUri: {
    color: palette.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    marginVertical: spacing.xs,
  },
});
