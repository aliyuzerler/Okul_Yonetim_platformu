// AuthContext: the single source of truth for identity, language and push
// opt-in. Owns the PKCE sign-in, silent refresh, the must_change_password
// interstitial and role resolution (isStudent / isParent).
import Constants from "expo-constants";
import { AppState } from "react-native";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  configureClient,
  setDeadSessionHandler,
} from "../api/client";
import {
  commonApi,
  pushApi,
} from "../api/index";
import type { MeResponse, PushTokenInfo, TokenResponse } from "../api/types";
import {
  DEFAULT_LANGUAGE,
  I18nProvider,
  normalizeLanguage,
  type Language,
} from "../i18n/I18nContext";
import type { MessageKey } from "../i18n/messages";
import { env } from "../config/env";
import { autoRegisterPush, unregisterPushToken } from "../push/notifications";
import {
  clearSession,
  getPushEnabled,
  getPushToken,
  getStoredLanguage,
  loadSession,
  saveSession,
  setPushEnabled,
  setStoredLanguage,
  type StoredSession,
} from "./session";
import { exchangeCodeForTokens, refreshTokens } from "./thunderid";
import { resolveRole, type Role } from "./jwt";

export type AuthStatus = "loading" | "anonymous" | "interstitial" | "authenticated";

export interface AuthState {
  status: AuthStatus;
  session: StoredSession | null;
  role: Role | null;
  isStudent: boolean;
  isParent: boolean;
  me: MeResponse | null;
  pushEnabled: boolean;
  language: Language;
  busy: boolean;
  signInWithCode: (code: string, codeVerifier: string, redirectUri: string) => Promise<void>;
  signOut: () => Promise<void>;
  silentRefresh: () => Promise<boolean>;
  completePasswordChange: (newPassword: string) => Promise<void>;
  keepDefaultPassword: () => Promise<void>;
  requestPush: (enabled: boolean) => Promise<void>;
  changeLanguage: (next: Language) => Promise<void>;
  refreshMe: () => Promise<MeResponse | null>;
}

const AuthContext = createContext<AuthState | null>(null);

function toPushPlatform(): PushTokenInfo["platform"] {
  const os = Constants.platform?.ios ? "ios" : Constants.platform?.android ? "android" : "web";
  return os as PushTokenInfo["platform"];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<StoredSession | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [pushEnabled, setPushEnabledState] = useState(false);
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [busy, setBusy] = useState(false);
  const pushRegisterLock = useRef(false);

  // ---- helpers ------------------------------------------------------------

  const applyLanguage = useCallback((next: Language) => {
    setLanguageState(next);
  }, []);

  const syncLanguageToServer = useCallback(async (next: Language) => {
    try {
      await commonApi.setLanguage(next);
    } catch {
      // Best effort — the local preference is already applied.
    }
  }, []);

  const fetchMe = useCallback(async (): Promise<MeResponse | null> => {
    try {
      const profile = await commonApi.me();
      setMe(profile);
      if (profile.preferred_language) {
        applyLanguage(normalizeLanguage(profile.preferred_language));
      }
      return profile;
    } catch {
      return null;
    }
  }, [applyLanguage]);

  const doAutoRegisterPush = useCallback(async () => {
    if (pushRegisterLock.current) return;
    pushRegisterLock.current = true;
    try {
      if (!(await getPushEnabled())) return;
      await autoRegisterPush(async (token) => {
        const info = await pushApi.register(token, toPushPlatform(), Constants.deviceName);
        return info;
      });
    } catch {
      // Push is best-effort; in-app notifications remain the source of truth.
    } finally {
      pushRegisterLock.current = false;
    }
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const [stored, storedLanguage, storedPushEnabled] = await Promise.all([
        loadSession(),
        getStoredLanguage(),
        getPushEnabled(),
      ]);
      setPushEnabledState(storedPushEnabled);
      applyLanguage(normalizeLanguage(storedLanguage));
      if (!stored) {
        setStatus("anonymous");
        return;
      }
      setSession(stored);
      const profile = await fetchMe();
      setStatus(profile?.must_change_password ? "interstitial" : "authenticated");
      // Restore → keep the device's push registration warm.
      void doAutoRegisterPush();
    } catch {
      setStatus("anonymous");
    }
  }, [applyLanguage, doAutoRegisterPush, fetchMe]);

  // ---- lifecycle ----------------------------------------------------------

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Install the axios bridge + dead-session handler once.
  useEffect(() => {
    configureClient({
      getAccessToken: async () => (await loadSession())?.accessToken ?? null,
      refresh: async (): Promise<TokenResponse | null> => {
        const stored = await loadSession();
        if (!stored?.refreshToken) return null;
        try {
          const tokens = await refreshTokens(stored.refreshToken);
          const next = await saveSession(tokens.access_token, tokens.refresh_token ?? null);
          setSession(next);
          return tokens;
        } catch {
          return null;
        }
      },
    });
    setDeadSessionHandler(() => {
      setSession(null);
      setMe(null);
      setStatus("anonymous");
    });
  }, []);

  // Silent refresh: on start and whenever the app returns to the foreground,
  // renew the access token if it is within 5 minutes of expiry.
  const silentRefresh = useCallback(async (): Promise<boolean> => {
    const stored = await loadSession();
    if (!stored?.refreshToken) return false;
    const expiresIn = stored.expiresAt ? stored.expiresAt - Date.now() : 0;
    if (expiresIn > 5 * 60 * 1000) return true;
    try {
      const tokens = await refreshTokens(stored.refreshToken);
      const next = await saveSession(tokens.access_token, tokens.refresh_token ?? null);
      setSession(next);
      return true;
    } catch {
      await clearSession().catch(() => {});
      setSession(null);
      setMe(null);
      setStatus("anonymous");
      return false;
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated" && status !== "interstitial") return;
    void silentRefresh();
    // Renew whenever the app comes back to the foreground (silent refresh).
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void silentRefresh();
    });
    // Cheap timer as a belt-and-braces for long background sessions.
    const timer = setInterval(() => {
      void silentRefresh();
    }, 10 * 60 * 1000);
    return () => {
      appState.remove();
      clearInterval(timer);
    };
  }, [status, silentRefresh]);

  // ---- actions ------------------------------------------------------------

  const signInWithCode = useCallback(
    async (code: string, codeVerifier: string, redirectUri: string) => {
      setBusy(true);
      try {
        const tokens = await exchangeCodeForTokens({ code, codeVerifier, redirectUri });
        const stored = await saveSession(tokens.access_token, tokens.refresh_token ?? null);
        setSession(stored);
        const profile = await fetchMe();

        // Local language wins when the server has no preference yet; once the
        // server answers, both sides converge on the same value.
        const localLanguage = await getStoredLanguage();
        if (profile?.preferred_language) {
          applyLanguage(normalizeLanguage(profile.preferred_language));
          if (!localLanguage) await setStoredLanguage(normalizeLanguage(profile.preferred_language));
        } else if (localLanguage) {
          void syncLanguageToServer(normalizeLanguage(localLanguage));
        }

        setStatus(profile?.must_change_password ? "interstitial" : "authenticated");
        void doAutoRegisterPush();
      } finally {
        setBusy(false);
      }
    },
    [applyLanguage, doAutoRegisterPush, fetchMe, syncLanguageToServer],
  );

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      // Best-effort server-side token removal before dropping the session.
      try {
        const token = await getPushToken();
        if (token) await pushApi.unregister(token);
        await unregisterPushToken();
      } catch {
        // Session may already be dead; sign-out must still succeed.
      }
      await clearSession().catch(() => {});
      setSession(null);
      setMe(null);
      setStatus("anonymous");
    } finally {
      setBusy(false);
    }
  }, []);

  const completePasswordChange = useCallback(async (newPassword: string) => {
    await commonApi.changePassword(newPassword);
    const profile = await fetchMe();
    setStatus(profile?.must_change_password ? "interstitial" : "authenticated");
  }, [fetchMe]);

  const keepDefaultPassword = useCallback(async () => {
    await commonApi.keepDefaultPassword();
    const profile = await fetchMe();
    setStatus(profile?.must_change_password ? "interstitial" : "authenticated");
  }, [fetchMe]);

  const requestPush = useCallback(
    async (enabled: boolean) => {
      await setPushEnabled(enabled);
      setPushEnabledState(enabled);
      if (enabled) {
        await doAutoRegisterPush();
      } else {
        await unregisterPushToken();
        try {
          const token = await getPushToken();
          if (token) await pushApi.unregister(token);
        } catch {
          // Ignore — push removal is best-effort.
        }
      }
    },
    [doAutoRegisterPush],
  );

  const changeLanguage = useCallback(
    async (next: Language) => {
      applyLanguage(next);
      await setStoredLanguage(next);
      void syncLanguageToServer(next);
    },
    [applyLanguage, syncLanguageToServer],
  );

  const role = session?.role ?? null;
  const value = useMemo<AuthState>(
    () => ({
      status,
      session,
      role,
      isStudent: role === "student",
      isParent: role === "parent",
      me,
      pushEnabled,
      language,
      busy,
      signInWithCode,
      signOut,
      silentRefresh,
      completePasswordChange,
      keepDefaultPassword,
      requestPush,
      changeLanguage,
      refreshMe: fetchMe,
    }),
    [
      status, session, role, me, pushEnabled, language, busy,
      signInWithCode, signOut, silentRefresh, completePasswordChange,
      keepDefaultPassword, requestPush, changeLanguage, fetchMe,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {/* I18nProvider hangs off AuthContext so language has one source of truth. */}
      <I18nProvider language={language} onLanguageChange={(next) => applyLanguage(next)}>
        {children}
      </I18nProvider>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// Re-exports keep screen imports shallow.
export type { MessageKey, PushTokenInfo };
export { env };
