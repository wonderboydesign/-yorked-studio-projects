const COOKIE_NAME = "brada_auth";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días

function getSecret() {
  return process.env.APP_SECRET || "dev-secret";
}

// Uses atob/btoa (not Buffer) so this stays compatible with the Edge runtime middleware.
function base64urlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
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

export async function createSessionToken(userId: string): Promise<string> {
  const payload = base64urlEncode(JSON.stringify({ uid: userId, ts: Date.now() }));
  const signature = await hmac(payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<{ userId: string } | null> {
  if (!token) return null;
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const payload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  const expected = await hmac(payload);
  if (!constantTimeEqual(signature, expected)) return null;
  try {
    const { uid } = JSON.parse(base64urlDecode(payload));
    if (typeof uid !== "string" || !uid) return null;
    return { userId: uid };
  } catch {
    return null;
  }
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
export const AUTH_MAX_AGE = MAX_AGE_SECONDS;
