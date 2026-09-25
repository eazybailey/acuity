// PREVIEW-ONLY STAND-IN FOR REAL LOGIN.
//
// Acuity has no client authentication, and how clients will prove who they are (probably an
// email magic link via Supabase Auth) is an open decision for Eazy. Until that is built, this
// file provides:
//   - an HMAC-signed, expiring session token holding only the client's email;
//   - a shared access code (SKELETON_ACCESS_CODE) so only testers can get in.
// Anyone with the access code can sign in as ANY email, so this must never run in production:
// loginBlockedReason() refuses logins when VERCEL_ENV === "production". Replace this whole
// file when real auth lands. Pure functions only (no Next imports) so it can be unit-tested.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "sess";
export const STUDIO_COOKIE = "studio";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  email: string;
  exp: number; // unix seconds
}

type Env = Record<string, string | undefined>;

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

function hmac(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  // Hash first so lengths always match and timingSafeEqual never throws.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function signSession(email: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const payload: SessionPayload = { email: normaliseEmail(email), exp: nowSeconds + SESSION_TTL_SECONDS };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${hmac(body, secret)}`;
}

export function verifySession(
  token: string | undefined,
  secret: string | undefined,
  nowSeconds = Math.floor(Date.now() / 1000)
): SessionPayload | null {
  if (!token || !secret) return null;
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  if (!safeEqual(sig, hmac(body, secret))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof p.email !== "string" || typeof p.exp !== "number") return null;
    if (p.exp <= nowSeconds) return null;
    return p;
  } catch {
    return null;
  }
}

// Studio choice cookie, bound to the signed-in email so it cannot be replayed across users.
export function signStudio(code: string, email: string, secret: string): string {
  return `${code}.${hmac(`studio|${normaliseEmail(email)}|${code}`, secret)}`;
}

export function verifyStudio(token: string | undefined, email: string, secret: string | undefined): string | null {
  if (!token || !secret) return null;
  const [code, sig] = token.split(".");
  if (!code || !sig) return null;
  return safeEqual(sig, hmac(`studio|${normaliseEmail(email)}|${code}`, secret)) ? code : null;
}

export function checkAccessCode(input: string, expected: string | undefined): boolean {
  if (!expected) return false;
  return safeEqual(input, expected);
}

// Why login is refused right now, or null when it is allowed.
// Fail closed: anything that looks like a production runtime is refused, not only Vercel's.
export function isProductionRuntime(env: Env = process.env): boolean {
  if (env.VERCEL_ENV) return env.VERCEL_ENV === "production";
  return env.NODE_ENV === "production";
}

export function loginBlockedReason(env: Env = process.env): string | null {
  if (isProductionRuntime(env)) {
    return "Sign-in is not available: real authentication has not been built yet. This skeleton runs on preview deployments only.";
  }
  if (!env.SESSION_SECRET) return "Sign-in is not configured (SESSION_SECRET is not set).";
  if (!env.SKELETON_ACCESS_CODE) return "Sign-in is not configured (SKELETON_ACCESS_CODE is not set).";
  return null;
}
