import { describe, expect, it, vi } from "vitest";
import { type MagicLinkAuth, confirmMagicLink, confirmParams, sendMagicLink } from "../lib/magiclink";
import { appOrigin, authMode, loginBlockedReason } from "../lib/session";

const SUPA = {
  SESSION_SECRET: "s",
  NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  APP_URL: "https://preview.example.com/",
};

describe("auth mode", () => {
  it("prefers magic link when Supabase, SESSION_SECRET and APP_URL are all set", () => {
    expect(authMode(SUPA)).toEqual({ mode: "magic-link" });
    expect(authMode({ ...SUPA, SKELETON_ACCESS_CODE: "c" })).toEqual({ mode: "magic-link" });
  });

  it("falls back to the access code when magic link is incomplete", () => {
    const code = { SESSION_SECRET: "s", SKELETON_ACCESS_CODE: "c" };
    expect(authMode(code)).toEqual({ mode: "access-code" });
    expect(authMode({ ...SUPA, APP_URL: undefined, SKELETON_ACCESS_CODE: "c" })).toEqual({ mode: "access-code" });
    expect(authMode({ ...SUPA, APP_URL: "not a url", SKELETON_ACCESS_CODE: "c" })).toEqual({ mode: "access-code" });
    expect(authMode({ ...SUPA, NEXT_PUBLIC_SUPABASE_ANON_KEY: "", SKELETON_ACCESS_CODE: "c" })).toEqual({
      mode: "access-code",
    });
  });

  it("is blocked in production, without SESSION_SECRET, or with nothing configured", () => {
    expect(authMode({ ...SUPA, VERCEL_ENV: "production" })).toMatchObject({ mode: "blocked" });
    expect(authMode({ ...SUPA, NODE_ENV: "production" })).toMatchObject({ mode: "blocked" });
    expect(authMode({ ...SUPA, SESSION_SECRET: undefined, SKELETON_ACCESS_CODE: "c" })).toMatchObject({
      mode: "blocked",
      reason: expect.stringMatching(/SESSION_SECRET/),
    });
    expect(authMode({ SESSION_SECRET: "s" })).toMatchObject({ mode: "blocked" });
    expect(loginBlockedReason(SUPA)).toBeNull();
    expect(loginBlockedReason({ ...SUPA, VERCEL_ENV: "production" })).toMatch(/not available/);
  });

  it("takes only the origin of an http(s) APP_URL", () => {
    expect(appOrigin({ APP_URL: "https://preview.example.com/some/path?q=1" })).toBe("https://preview.example.com");
    expect(appOrigin({ APP_URL: "http://localhost:3000" })).toBe("http://localhost:3000");
    expect(appOrigin({ APP_URL: "javascript:alert(1)" })).toBeNull();
    expect(appOrigin({ APP_URL: "" })).toBeNull();
    expect(appOrigin({})).toBeNull();
  });
});

function fakeAuth(over: Partial<MagicLinkAuth> = {}): MagicLinkAuth {
  return {
    sendLink: vi.fn(async () => ({ error: null })),
    verify: vi.fn(async () => ({
      error: null,
      user: { email: " Client@Example.com ", emailConfirmedAt: "2026-09-25T10:00:00Z" },
    })),
    ...over,
  };
}

const ORIGIN = "https://preview.example.com";

describe("sending the link", () => {
  it("asks Supabase to redirect to APP_URL/auth/confirm", async () => {
    const auth = fakeAuth();
    expect(await sendMagicLink(auth, "a@b.co", ORIGIN)).toBe("/login?sent=1");
    expect(auth.sendLink).toHaveBeenCalledWith("a@b.co", "https://preview.example.com/auth/confirm");
  });

  it("says 'sent' for user-dependent errors, so it never reveals whether an account exists", async () => {
    for (const error of [
      { code: "user_not_found", status: 400 },
      { code: "otp_disabled", status: 422 },
      { code: "signup_disabled", status: 422 },
      { code: "user_banned", status: 400 },
      { code: "email_address_invalid", status: 400 },
      { status: 400 },
    ]) {
      expect(await sendMagicLink(fakeAuth({ sendLink: async () => ({ error }) }), "a@b.co", ORIGIN)).toBe(
        "/login?sent=1"
      );
    }
  });

  it("shows a generic error for rate limits, config and outages", async () => {
    for (const error of [
      { code: "over_email_send_rate_limit", status: 429 },
      { code: "over_request_rate_limit", status: 429 },
      { status: 429 },
      { code: "email_provider_disabled", status: 422 },
      { code: "email_address_not_authorized", status: 400 },
      { status: 401 },
      { status: 500 },
      { status: 0 },
      {},
    ]) {
      expect(await sendMagicLink(fakeAuth({ sendLink: async () => ({ error }) }), "a@b.co", ORIGIN)).toBe(
        "/login?e=send"
      );
    }
    const throws = fakeAuth({ sendLink: async () => { throw new Error("network"); } });
    expect(await sendMagicLink(throws, "a@b.co", ORIGIN)).toBe("/login?e=send");
  });
});

// [token_hash, type] pairs the confirm page must refuse (it redirects to /login?e=link).
const BAD_PARAMS: [unknown, unknown][] = [
  ["abc", "recovery"],
  ["abc", "signup"],
  ["abc", "invite"],
  ["abc", "email_change"],
  ["abc", undefined],
  [undefined, "email"],
  ["", "email"],
  [["abc", "def"], "email"], // repeated query param
  ["abc", ["email", "email"]],
  ["x".repeat(513), "email"],
  [undefined, undefined], // e.g. ?code= only: the PKCE flow is not supported
];

describe("confirm page params", () => {
  it("accepts token_hash with type email or magiclink", () => {
    expect(confirmParams("abc", "email")).toEqual({ tokenHash: "abc", type: "email" });
    expect(confirmParams("abc", "magiclink")).toEqual({ tokenHash: "abc", type: "magiclink" });
  });

  it("refuses other types and missing, repeated or oversized params", () => {
    for (const [h, t] of BAD_PARAMS) expect(confirmParams(h, t)).toBeNull();
  });
});

describe("confirming the link (the POST)", () => {
  it("returns the verified, normalised email for token_hash + email/magiclink", async () => {
    for (const type of ["email", "magiclink"]) {
      const auth = fakeAuth();
      expect(await confirmMagicLink(auth, "abc", type)).toBe("client@example.com");
      expect(auth.verify).toHaveBeenCalledWith("abc", type);
    }
  });

  it("refuses bad params without calling Supabase", async () => {
    for (const [h, t] of BAD_PARAMS) {
      const auth = fakeAuth();
      expect(await confirmMagicLink(auth, h, t)).toBeNull();
      expect(auth.verify).not.toHaveBeenCalled();
    }
  });

  it("fails on errors, missing or unverified email", async () => {
    const cases: MagicLinkAuth["verify"][] = [
      async () => ({ error: { code: "otp_expired", status: 403 }, user: null }),
      async () => ({ error: { code: "otp_expired", status: 403 }, user: { email: "a@b.co", emailConfirmedAt: "2026-01-01" } }),
      async () => ({ error: null, user: null }),
      async () => ({ error: null, user: { email: undefined, emailConfirmedAt: "2026-01-01" } }),
      async () => ({ error: null, user: { email: "", emailConfirmedAt: "2026-01-01" } }),
      async () => ({ error: null, user: { email: "not-an-email", emailConfirmedAt: "2026-01-01" } }),
      async () => ({ error: null, user: { email: "a@b.co", emailConfirmedAt: undefined } }),
      async () => ({ error: null, user: { email: "a@b.co", emailConfirmedAt: null } }),
      async () => ({ error: null, user: { email: "a@b.co", emailConfirmedAt: "" } }),
      async () => { throw new Error("network"); },
    ];
    for (const verify of cases) expect(await confirmMagicLink(fakeAuth({ verify }), "abc", "email")).toBeNull();
  });
});
