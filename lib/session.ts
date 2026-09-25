// Session cookie and sign-in mode. Pure functions only (no Next imports) so it can be unit-tested.
//
// Acuity has no client authentication, so we keep our own session: an HMAC-signed, expiring
// token holding only the client's email (`sess` cookie). Two ways to earn one, see authMode():
//   - "magic-link" (real login): Supabase Auth emails a link; app/auth/confirm verifies it and
//     mints the session with the verified email (lib/magiclink.ts). No Supabase session is kept.
//   - "access-code" (preview-only stand-in): email + shared SKELETON_ACCESS_CODE. Anyone with the
//     code can sign in as ANY email, so it is for testers only.
// Both are refused on a production runtime (fail closed) until Eazy decides to lift that.

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

// Fail closed: anything that looks like a production runtime is refused, not only Vercel's.
export function isProductionRuntime(env: Env = process.env): boolean {
  if (env.VERCEL_ENV) return env.VERCEL_ENV === "production";
  return env.NODE_ENV === "production";
}

// Absolute origin for links we email (never taken from the Host header), or null if unusable.
export function appOrigin(env: Env = process.env): string | null {
  try {
    const u = new URL(env.APP_URL ?? "");
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : null;
  } catch {
    return null;
  }
}

export type AuthMode = { mode: "magic-link" } | { mode: "access-code" } | { mode: "blocked"; reason: string };

// Magic link wins when fully configured; the access code is the fallback.
export function authMode(env: Env = process.env): AuthMode {
  if (isProductionRuntime(env)) {
    return {
      mode: "blocked",
      reason: "Sign-in is not available: it has not been built or approved for production yet. This app runs on preview deployments only.",
    };
  }
  if (!env.SESSION_SECRET) return { mode: "blocked", reason: "Sign-in is not configured (SESSION_SECRET is not set)." };
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY && appOrigin(env)) return { mode: "magic-link" };
  if (env.SKELETON_ACCESS_CODE) return { mode: "access-code" };
  return {
    mode: "blocked",
    reason: "Sign-in is not configured (set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and APP_URL, or SKELETON_ACCESS_CODE).",
  };
}

// Why login is refused right now, or null when it is allowed.
export function loginBlockedReason(env: Env = process.env): string | null {
  const m = authMode(env);
  return m.mode === "blocked" ? m.reason : null;
}
