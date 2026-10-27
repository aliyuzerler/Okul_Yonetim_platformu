// JWT payload decoding without `atob` — Hermes (React Native) ships neither
// `atob` nor `Buffer` on every runtime, so base64url is decoded manually.
// Mirrors the claim set backend/internal/middleware/auth.go reads.

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function percentEncodedBytes(latin1: string): string {
  let out = "";
  for (let i = 0; i < latin1.length; i += 1) {
    out += `%${latin1.charCodeAt(i).toString(16).padStart(2, "0")}`;
  }
  return out;
}

// base64url -> UTF-8 string, safe on Hermes (no atob/Buffer).
export function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  let acc = 0;
  let bits = 0;
  let latin1 = "";
  for (let i = 0; i < base64.length; i += 1) {
    const idx = B64.indexOf(base64.charAt(i));
    if (idx < 0) continue;
    acc = (acc << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      latin1 += String.fromCharCode((acc >> bits) & 0xff);
    }
  }
  try {
    // Latin-1 bytes -> UTF-8 via the percent-encoding trick.
    return decodeURIComponent(percentEncodedBytes(latin1));
  } catch {
    return latin1;
  }
}

export type JwtPayload = {
  sub: string;
  email?: string;
  username?: string;
  given_name?: string;
  family_name?: string;
  phone_number?: string;
  roles?: string | string[];
  exp?: number;
  iss?: string;
};

export function parseJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(base64UrlDecode(payload)) as JwtPayload;
  } catch {
    return null;
  }
}

export type Role = "admin" | "teacher" | "student" | "parent";

const ROLE_PRIORITY: Role[] = ["admin", "teacher", "student", "parent"];

// Picks the highest-privilege role from the token's `roles` claim (string or array).
export function resolveRole(payload: JwtPayload | null): Role | null {
  const raw = payload?.roles;
  const roles = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? [raw]
      : [];
  return ROLE_PRIORITY.find((r) => roles.includes(r)) ?? null;
}

export function tokenExpiresAt(payload: JwtPayload | null): number | null {
  return typeof payload?.exp === "number" ? payload.exp * 1000 : null;
}
