const COOKIE_NAME = "brada_auth";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días

function getSecret() {
  return process.env.APP_SECRET || process.env.APP_PASSWORD || "dev-secret";
}

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function createSessionToken(): Promise<string> {
  const payload = `ok.${Date.now()}`;
  const signature = await hmac(payload);
  return `${payload}.${signature}`;
}

export async function isValidSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [marker, ts, signature] = parts;
  const payload = `${marker}.${ts}`;
  const expected = await hmac(payload);
  return marker === "ok" && constantTimeEqual(signature, expected);
}

export function checkPassword(candidate: string): boolean {
  const real = process.env.APP_PASSWORD || "";
  if (!real) return false;
  return constantTimeEqual(candidate, real);
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
export const AUTH_MAX_AGE = MAX_AGE_SECONDS;
