// Build-time configuration surfaced from EXPO_PUBLIC_* variables.
// Everything falls back to the local development defaults so `expo start`
// works with a plain `cp .env.example .env`.

const trimSlash = (value: string) => value.replace(/\/+$/, "");

const api = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const issuer =
  process.env.EXPO_PUBLIC_THUNDERID_ISSUER ?? "https://localhost:8090";

const scopes =
  process.env.EXPO_PUBLIC_THUNDERID_SCOPES ?? "openid profile email roles phone";

export const env = {
  apiUrl: trimSlash(api),
  thunderId: {
    issuer: trimSlash(issuer),
    clientId: process.env.EXPO_PUBLIC_THUNDERID_CLIENT_ID ?? "",
    scopes: scopes.split(/\s+/).filter(Boolean),
    // ThunderID (WSO2-based) standard OAuth2 endpoints, relative to the issuer.
    authorizationEndpoint: `${trimSlash(issuer)}/oauth2/authorize`,
    tokenEndpoint: `${trimSlash(issuer)}/oauth2/token`,
    userInfoEndpoint: `${trimSlash(issuer)}/oauth2/userinfo`,
  },
  oauth: {
    redirectScheme:
      process.env.EXPO_PUBLIC_OAUTH_REDIRECT_SCHEME ?? "openschool",
    redirectPath:
      process.env.EXPO_PUBLIC_OAUTH_REDIRECT_PATH ?? "oauth2redirect",
  },
} as const;
