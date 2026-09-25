// Real login: Supabase Auth email magic link. Server-only. Supabase only proves the person owns
// the email; we then mint our own `sess` cookie (lib/session.ts). We keep no Supabase session
// and use the anon key only (never a service-role key).
// Scanner-safe: GET /auth/confirm only renders a "Sign in" button; the token is spent by the
// POST (server action confirmLogin), so mail scanners that prefetch links cannot burn it.
// Supabase sits behind MagicLinkAuth so the branching below is unit-tested with a fake.
//
// Only the token_hash flow is supported (works across devices). The `?code=` PKCE flow needs the
// code verifier stored at send time (cookie storage via @supabase/ssr), so it is not accepted.

import { createClient } from "@supabase/supabase-js";
import { looksLikeEmail, normaliseEmail } from "./session";

type Env = Record<string, string | undefined>;

export interface AuthFailure {
  code?: string;
  status?: number;
}

export interface MagicLinkAuth {
  sendLink(email: string, redirectTo: string): Promise<{ error: AuthFailure | null }>;
  verify(
    tokenHash: string,
    type: VerifyType
  ): Promise<{ error: AuthFailure | null; user: { email?: string; emailConfirmedAt?: string | null } | null }>;
}

const VERIFY_TYPES = ["email", "magiclink"] as const;
type VerifyType = (typeof VERIFY_TYPES)[number];

// Failures that say nothing about whether the account exists; everything else reads as "sent".
const SEND_FAILURES = new Set([
  "over_email_send_rate_limit",
  "over_request_rate_limit",
  "email_provider_disabled",
  "email_address_not_authorized", // built-in SMTP only mails the project's team
]);

function sendFailed(e: AuthFailure): boolean {
  if (e.code && SEND_FAILURES.has(e.code)) return true;
  const s = e.status ?? 0;
  return s === 0 || s === 401 || s === 403 || s === 429 || s >= 500;
}

// Returns where the login form should land. Never reveals whether the account exists.
export async function sendMagicLink(auth: MagicLinkAuth, email: string, origin: string): Promise<string> {
  try {
    const { error } = await auth.sendLink(email, `${origin}/auth/confirm`);
    return error && sendFailed(error) ? "/login?e=send" : "/login?sent=1";
  } catch {
    return "/login?e=send";
  }
}

// Confirm-link params, checked before we render the page or call Supabase; null if unusable.
export function confirmParams(tokenHash: unknown, type: unknown): { tokenHash: string; type: VerifyType } | null {
  if (typeof tokenHash !== "string" || !tokenHash || tokenHash.length > 512) return null;
  if (typeof type !== "string" || !VERIFY_TYPES.includes(type as VerifyType)) return null;
  return { tokenHash, type: type as VerifyType };
}

// The verified, normalised email for a submitted confirm form, or null.
export async function confirmMagicLink(auth: MagicLinkAuth, tokenHash: unknown, type: unknown): Promise<string | null> {
  const p = confirmParams(tokenHash, type);
  if (!p) return null;
  try {
    const { error, user } = await auth.verify(p.tokenHash, p.type);
    if (error || !user?.email || !user.emailConfirmedAt) return null;
    const email = normaliseEmail(user.email);
    return looksLikeEmail(email) ? email : null;
  } catch {
    return null;
  }
}

// A fresh client per request; no session storage, refresh or URL detection.
export function supabaseMagicLink(env: Env = process.env): MagicLinkAuth {
  const { auth } = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return {
    async sendLink(email, redirectTo) {
      const { error } = await auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: true } });
      return { error };
    },
    async verify(tokenHash, type) {
      const { data, error } = await auth.verifyOtp({ token_hash: tokenHash, type });
      const u = data.user;
      return { error, user: u ? { email: u.email, emailConfirmedAt: u.email_confirmed_at } : null };
    },
  };
}
