// ThunderID OAuth2 token endpoint calls (authorization code + PKCE exchange,
// refresh grant). Public client — no client secret is ever embedded.
import axios from "axios";

import { env } from "../config/env";
import type { TokenResponse } from "../api/types";

const tokenClient = axios.create({
  baseURL: env.thunderId.tokenEndpoint,
  timeout: 20000,
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
});

function form(body: Record<string, string>): string {
  const params = new URLSearchParams();
  Object.entries(body).forEach(([key, value]) => params.append(key, value));
  return params.toString();
}

export async function exchangeCodeForTokens(args: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const { data } = await tokenClient.post<TokenResponse>(
    "",
    form({
      grant_type: "authorization_code",
      code: args.code,
      redirect_uri: args.redirectUri,
      client_id: env.thunderId.clientId,
      code_verifier: args.codeVerifier,
    }),
  );
  return data;
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const { data } = await tokenClient.post<TokenResponse>(
    "",
    form({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.thunderId.clientId,
    }),
  );
  return data;
}
