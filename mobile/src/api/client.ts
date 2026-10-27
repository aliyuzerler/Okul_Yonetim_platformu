// Single axios instance + the one-flight refresh / retry / dead-session logic.
//
// AuthContext installs the token provider and the refresh executor with
// `configureClient`. When a request dies with 401 the client:
//   1. triggers a single refresh (concurrent 401s share one flight),
//   2. replays the original request exactly once,
//   3. clears the session ("dead session") when the refresh itself fails.
import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

import { env } from "../config/env";
import { clearSession } from "../auth/session";
import type { TokenResponse } from "./types";

interface ClientBridge {
  getAccessToken: () => Promise<string | null>;
  refresh: () => Promise<TokenResponse | null>;
}

let bridge: ClientBridge | null = null;
let onDeadSession: (() => void) | null = null;

export function configureClient(next: ClientBridge) {
  bridge = next;
}

export function setDeadSessionHandler(handler: (() => void) | null) {
  onDeadSession = handler;
}

export const api = axios.create({
  baseURL: env.apiUrl,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await bridge?.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const RETRY_FLAG = "__osRetried";

// Single-flight refresh: every 401 while a refresh is running awaits the same promise.
let refreshFlight: Promise<TokenResponse | null> | null = null;

async function refreshOnce(): Promise<TokenResponse | null> {
  if (!refreshFlight) {
    refreshFlight = (async () => {
      try {
        return (await bridge?.refresh()) ?? null;
      } finally {
        // Release the flight on the next tick so late 401s still get a retry.
        setTimeout(() => {
          refreshFlight = null;
        }, 0);
      }
    })();
  }
  return refreshFlight;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (AxiosRequestConfig & { [RETRY_FLAG]?: boolean }) | undefined;
    const status = error.response?.status;
    const url = config?.url ?? "";

    // Auth endpoints are allowed to answer 401 with a live session (wrong
    // password etc.) — never retry-loop those.
    const isAuthPath = url.startsWith("/auth/");

    if (status === 401 && config && !config[RETRY_FLAG] && !isAuthPath) {
      config[RETRY_FLAG] = true;
      const tokens = await refreshOnce();
      if (tokens?.access_token) {
        return api.request(config);
      }
      // Dead session: refresh failed — drop stored credentials and surface it.
      await clearSession().catch(() => {});
      onDeadSession?.();
    }

    return Promise.reject(error);
  },
);

export function axiosErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; message?: string } | undefined;
    return data?.error ?? data?.message ?? fallback;
  }
  return fallback;
}

export default api;
