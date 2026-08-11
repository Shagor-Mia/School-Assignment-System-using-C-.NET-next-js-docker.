// Shared JWT-decode helper used by both `middleware.ts` (Edge runtime) and the
// `/api/auth/me` route. This is a best-effort, dependency-free decode of the
// JWT *payload* only — there is NO signature verification here. That is fine
// because this decoded data is only ever used for UI/UX routing decisions
// (which nav to show, which route group to redirect to). The backend's
// `[Authorize(Roles=...)]` attributes are the actual security boundary; the
// real token is verified there on every API call proxied through
// `/api/backend/*`.
//
// Kept dependency-free (no `jsonwebtoken`) because the Edge runtime used by
// `middleware.ts` does not have access to Node's `Buffer`/crypto APIs the way
// that package expects.

import type { AuthUser, Role } from "./types";

/** Decode a base64url string (as used in JWT segments) to a UTF-8 string. */
function base64UrlDecode(input: string): string {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad === 2) base64 += "==";
  else if (pad === 3) base64 += "=";
  else if (pad !== 0) throw new Error("Invalid base64url string");

  // atob is available in both the Edge runtime and Node's Web-standard globals.
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

/** Raw decoded JWT payload — keys vary by IdP/claims mapping, hence `unknown`. */
type JwtPayload = Record<string, unknown>;

/** Decode a JWT's payload segment without verifying its signature. */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = base64UrlDecode(parts[1]);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

// ASP.NET Core's default JwtBearer handler maps short claim names (`sub`,
// `email`, `role`, `name`) to long legacy XML-SOAP/WS claim URIs unless
// `MapInboundClaims = false` is set on the token handler. We defensively
// check both forms (plus a couple of common variants) so this isn't brittle
// to whichever way the backend ends up configured.
const ID_KEYS = [
  "sub",
  "nameid",
  "id",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
];
const EMAIL_KEYS = [
  "email",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
];
const ROLE_KEYS = [
  "role",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
];
const NAME_KEYS = [
  "name",
  "fullName",
  "unique_name",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
];

function firstString(payload: JwtPayload, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return null;
}

function isRole(value: string | null): value is Role {
  return value === "Admin" || value === "Teacher" || value === "Student";
}

/** Decode a raw JWT string into an `AuthUser`, or `null` if it's unusable. */
export function getUserFromToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const id = firstString(payload, ID_KEYS);
  const email = firstString(payload, EMAIL_KEYS);
  const role = firstString(payload, ROLE_KEYS);
  const fullName = firstString(payload, NAME_KEYS);

  if (!id || !email || !isRole(role)) return null;

  return {
    id,
    email,
    fullName: fullName ?? email,
    role,
  };
}

/** Best-effort role extraction only — used by middleware for fast routing checks. */
export function getRoleFromToken(token: string): Role | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const role = firstString(payload, ROLE_KEYS);
  return isRole(role) ? role : null;
}

export const AUTH_COOKIE_NAME = "auth_token";

export function roleHomePath(role: Role): string {
  switch (role) {
    case "Admin":
      return "/admin";
    case "Teacher":
      return "/teacher";
    case "Student":
      return "/student";
  }
}
