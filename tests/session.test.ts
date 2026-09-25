import { describe, expect, it } from "vitest";
import {
  SESSION_TTL_SECONDS, checkAccessCode, loginBlockedReason, signSession, signStudio, verifySession, verifyStudio,
} from "../lib/session";

const SECRET = "test-secret";
const NOW = 1_800_000_000;

describe("session token", () => {
  it("round-trips and normalises the email", () => {
    const t = signSession("  Client@Example.COM ", SECRET, NOW);
    expect(verifySession(t, SECRET, NOW + 10)).toEqual({ email: "client@example.com", exp: NOW + SESSION_TTL_SECONDS });
  });

  it("rejects a wrong secret, tampering, missing secret, and expiry", () => {
    const t = signSession("a@b.co", SECRET, NOW);
    expect(verifySession(t, "other", NOW)).toBeNull();
    expect(verifySession(t, undefined, NOW)).toBeNull();
    expect(verifySession(t, SECRET, NOW + SESSION_TTL_SECONDS)).toBeNull();
    const [, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ email: "victim@b.co", exp: NOW + 999 })).toString("base64url");
    expect(verifySession(`${forged}.${sig}`, SECRET, NOW)).toBeNull();
    expect(verifySession(`${t}.x`, SECRET, NOW)).toBeNull();
    expect(verifySession("garbage", SECRET, NOW)).toBeNull();
  });

  it("refuses to issue a session without a secret", () => {
    expect(() => signSession("a@b.co", "", NOW)).toThrow(/SESSION_SECRET/);
  });
});

describe("studio cookie", () => {
  it("is bound to the email", () => {
    const t = signStudio("MH", "a@b.co", SECRET);
    expect(verifyStudio(t, "A@B.co", SECRET)).toBe("MH");
    expect(verifyStudio(t, "other@b.co", SECRET)).toBeNull();
    expect(verifyStudio(t.replace("MH", "CH"), "a@b.co", SECRET)).toBeNull();
  });
});

describe("access code and login gate", () => {
  it("compares access codes", () => {
    expect(checkAccessCode("open-sesame", "open-sesame")).toBe(true);
    expect(checkAccessCode("open-sesam", "open-sesame")).toBe(false);
    expect(checkAccessCode("", "open-sesame")).toBe(false);
    expect(checkAccessCode("anything", undefined)).toBe(false);
    expect(checkAccessCode("", "")).toBe(false);
  });

  it("refuses login in production and when unconfigured", () => {
    const ok = { SESSION_SECRET: "s", SKELETON_ACCESS_CODE: "c" };
    expect(loginBlockedReason(ok)).toBeNull();
    expect(loginBlockedReason({ ...ok, VERCEL_ENV: "preview" })).toBeNull();
    expect(loginBlockedReason({ ...ok, VERCEL_ENV: "production" })).toMatch(/not been built/);
    expect(loginBlockedReason({ SKELETON_ACCESS_CODE: "c" })).toMatch(/SESSION_SECRET/);
    expect(loginBlockedReason({ SESSION_SECRET: "s" })).toMatch(/SKELETON_ACCESS_CODE/);
  });
});
