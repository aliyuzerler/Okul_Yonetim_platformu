// SecureStore-backed session persistence. Keys are restricted to
// [A-Za-z0-9._-] by SecureStore, hence the dotted naming.
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { parseJwt, resolveRole, tokenExpiresAt, type JwtPayload, type Role } from "./jwt";

// expo-secure-store ships an empty stub on web; fall back to localStorage so
// the exported web bundle (Expo Web preview) can hold a session too.
const store = {
  async getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return window.localStorage.getItem(key);
    }
    return store.getItemAsync(key);
  },
  async setItemAsync(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      window.localStorage.setItem(key, value);
      return;
    }
    await store.setItemAsync(key, value);
  },
  async deleteItemAsync(key: string): Promise<void> {
    if (Platform.OS === "web") {
      window.localStorage.removeItem(key);
      return;
    }
    await store.deleteItemAsync(key);
  },
};

export const SessionKeys = {
  accessToken: "os.access.token",
  refreshToken: "os.refresh.token",
  pushEnabled: "os.push.enabled",
  pushToken: "os.push.token",
  language: "os.language",
} as const;

export interface StoredSession {
  accessToken: string;
  refreshToken: string | null;
  payload: JwtPayload;
  role: Role | null;
  expiresAt: number | null;
}

export async function loadSession(): Promise<StoredSession | null> {
  const accessToken = await store.getItemAsync(SessionKeys.accessToken);
  if (!accessToken) return null;
  const refreshToken = await store.getItemAsync(SessionKeys.refreshToken);
  const payload = parseJwt(accessToken);
  return {
    accessToken,
    refreshToken: refreshToken ?? null,
    payload: payload ?? { sub: "" },
    role: resolveRole(payload),
    expiresAt: tokenExpiresAt(payload),
  };
}

export async function saveSession(
  accessToken: string,
  refreshToken: string | null,
): Promise<StoredSession> {
  // ThunderID rotates refresh tokens; only overwrite when the server sent one.
  if (refreshToken) {
    await store.setItemAsync(SessionKeys.refreshToken, refreshToken);
  }
  await store.setItemAsync(SessionKeys.accessToken, accessToken);
  const payload = parseJwt(accessToken) ?? { sub: "" };
  return {
    accessToken,
    refreshToken: refreshToken ?? (await store.getItemAsync(SessionKeys.refreshToken)),
    payload,
    role: resolveRole(payload),
    expiresAt: tokenExpiresAt(payload),
  };
}

export async function clearSession(): Promise<void> {
  await store.deleteItemAsync(SessionKeys.accessToken);
  await store.deleteItemAsync(SessionKeys.refreshToken);
}

export async function getPushEnabled(): Promise<boolean> {
  return (await store.getItemAsync(SessionKeys.pushEnabled)) === "true";
}

export async function setPushEnabled(enabled: boolean): Promise<void> {
  await store.setItemAsync(SessionKeys.pushEnabled, enabled ? "true" : "false");
}

export async function getPushToken(): Promise<string | null> {
  return store.getItemAsync(SessionKeys.pushToken);
}

export async function setPushToken(token: string | null): Promise<void> {
  if (token) {
    await store.setItemAsync(SessionKeys.pushToken, token);
  } else {
    await store.deleteItemAsync(SessionKeys.pushToken);
  }
}

export async function getStoredLanguage(): Promise<string | null> {
  return store.getItemAsync(SessionKeys.language);
}

export async function setStoredLanguage(language: string): Promise<void> {
  await store.setItemAsync(SessionKeys.language, language);
}
