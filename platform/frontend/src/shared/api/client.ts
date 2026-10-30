import axios from "axios";

// Token lives in localStorage: the platform panel is a single-purpose
// back-office app; XSS discipline (no dangerouslySetInnerHTML) keeps this
// acceptable, and session TTL is 12 hours.
const TOKEN_KEY = "platform.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export const api = axios.create({
  baseURL: "/platform/v1",
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalizes axios/backend errors into the Turkish message the UI shows.
export function getErrorMessage(err: unknown, fallback = "Bir sorun oluştu. Lütfen yeniden deneyin."): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (err.code === "ECONNABORTED") return "Sunucu zaman aşımına uğradı.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
