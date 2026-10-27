// SecureStore-backed session persistence. Keys are restricted to
// [A-Za-z0-9._-] by SecureStore, hence the dotted naming.
import * as SecureStore from "expo-secure-store";

import { parseJwt, resolveRole, tokenExpiresAt, type JwtPayload, type Role } from "./jwt";

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
  const accessToken = await SecureStore.getItemAsync(SessionKeys.accessToken);
  if (!accessToken) return null;
  const refreshToken = await SecureStore.getItemAsync(SessionKeys.refreshToken);
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
    await SecureStore.setItemAsync(SessionKeys.refreshToken, refreshToken);
  }
  await SecureStore.setItemAsync(SessionKeys.accessToken, accessToken);
  const payload = parseJwt(accessToken) ?? { sub: "" };
  return {
    accessToken,
    refreshToken: refreshToken ?? (await SecureStore.getItemAsync(SessionKeys.refreshToken)),
    payload,
    role: resolveRole(payload),
    expiresAt: tokenExpiresAt(payload),
  };
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SessionKeys.accessToken);
  await SecureStore.deleteItemAsync(SessionKeys.refreshToken);
}

export async function getPushEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(SessionKeys.pushEnabled)) === "true";
}

export async function setPushEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(SessionKeys.pushEnabled, enabled ? "true" : "false");
}

export async function getPushToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SessionKeys.pushToken);
}

export async function setPushToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(SessionKeys.pushToken, token);
  } else {
    await SecureStore.deleteItemAsync(SessionKeys.pushToken);
  }
}

export async function getStoredLanguage(): Promise<string | null> {
  return SecureStore.getItemAsync(SessionKeys.language);
}

export async function setStoredLanguage(language: string): Promise<void> {
  await SecureStore.setItemAsync(SessionKeys.language, language);
}
