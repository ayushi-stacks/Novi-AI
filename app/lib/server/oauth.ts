import { env } from "cloudflare:workers";
import type { Provider } from "./data";
import { createId, nowIso } from "./data";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const googleScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];

export const githubScopes = ["repo", "read:user", "user:email"];

export function originFromRequest(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function oauthState(userId: string, provider: Provider) {
  const state = btoa(JSON.stringify({ nonce: createId("state"), userId, provider, at: nowIso() }));
  return state.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function parseOauthState(state: string | null, expectedProvider: Provider, userId: string) {
  if (!state) return false;
  try {
    const padded = state.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(state.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(padded)) as { provider?: string; userId?: string; at?: string };
    return parsed.provider === expectedProvider && parsed.userId === userId && Boolean(parsed.at);
  } catch {
    return false;
  }
}

export function googleAuthorizeUrl(request: Request, userId: string) {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not configured.");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${originFromRequest(request)}/api/connect/google/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("scope", googleScopes.join(" "));
  url.searchParams.set("state", oauthState(userId, "google"));
  return url.toString();
}

export function githubAuthorizeUrl(request: Request, userId: string) {
  const clientId = env.GITHUB_CLIENT_ID;
  if (!clientId) throw new Error("GITHUB_CLIENT_ID is not configured.");
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${originFromRequest(request)}/api/connect/github/callback`);
  url.searchParams.set("scope", githubScopes.join(" "));
  url.searchParams.set("state", oauthState(userId, "github"));
  return url.toString();
}

export async function exchangeGoogleCode(request: Request, code: string) {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials are not configured.");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${originFromRequest(request)}/api/connect/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) throw new Error(`Google token exchange failed: ${response.status}`);
  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    id_token?: string;
  }>;
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials are not configured.");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token refresh failed (${response.status}): ${text.slice(0, 180)}`);
  }
  // Note: Google does not return a new refresh_token on this grant unless
  // the original was issued with special consent settings, so the stored
  // refresh token should be left untouched by callers.
  return response.json() as Promise<{ access_token: string; expires_in?: number; scope?: string }>;
}

export async function exchangeGithubCode(request: Request, code: string) {
  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("GitHub OAuth credentials are not configured.");

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${originFromRequest(request)}/api/connect/github/callback`,
    }),
  });
  if (!response.ok) throw new Error(`GitHub token exchange failed: ${response.status}`);
  return response.json() as Promise<{ access_token: string; scope?: string }>;
}

export async function encryptSecret(value: string) {
  const key = await encryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(value));
  return `${base64(iv)}.${base64(new Uint8Array(encrypted))}`;
}

export async function decryptSecret(value: string) {
  const [ivRaw, encryptedRaw] = value.split(".");
  if (!ivRaw || !encryptedRaw) throw new Error("Invalid encrypted secret.");
  const key = await encryptionKey();
  const iv = fromBase64(ivRaw);
  const encrypted = fromBase64(encryptedRaw);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
  return decoder.decode(decrypted);
}

async function encryptionKey() {
  const secret = env.CREDENTIAL_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY must be configured with at least 32 characters.");
  }
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function base64(value: Uint8Array) {
  let binary = "";
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
