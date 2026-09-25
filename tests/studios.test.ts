import { afterEach, describe, expect, it, vi } from "vitest";
import {
  STUDIO_CODES, allStudios, assertWriteAllowed, getStudio, studioClient, StudioWriteBlocked,
} from "../lib/studios";

// Every studio has credentials, so "not connected" can never be what stops a write.
const ALL_KEYS: Record<string, string> = Object.fromEntries(
  STUDIO_CODES.flatMap((c) => [[`ACUITY_USER_ID_${c}`, `uid-${c}`], [`ACUITY_API_KEY_${c}`, `key-${c}`]])
);

function stubFetch() {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("studio registry", () => {
  it("has the 9 codes and names MH", () => {
    expect(STUDIO_CODES).toEqual(["AP", "CH", "HB", "HGS", "LL", "MH", "PR", "SG", "WMH"]);
    expect(getStudio("MH", {}).name).toBe("Muswell Hill Road");
    expect(getStudio("CH", {}).name).toBe("CH");
  });

  it("only MH is writable, regardless of env", () => {
    const writable = allStudios(ALL_KEYS).filter((s) => s.writable).map((s) => s.code);
    expect(writable).toEqual(["MH"]);
    expect(allStudios({}).filter((s) => s.writable).map((s) => s.code)).toEqual(["MH"]);
  });

  it("notify defaults to false everywhere", () => {
    expect(allStudios(ALL_KEYS).every((s) => s.notify === false)).toBe(true);
  });

  it("reads per-studio credentials; missing keys mean not connected", () => {
    const env = { ACUITY_USER_ID_CH: "u", ACUITY_API_KEY_CH: "k", ACUITY_USER_ID_HB: "only-user" };
    expect(getStudio("CH", env)).toMatchObject({ connected: true, credentials: { userId: "u", apiKey: "k" } });
    expect(getStudio("HB", env).connected).toBe(false);
    expect(getStudio("AP", env).connected).toBe(false);
  });

  it("MH falls back to the unsuffixed Gate 0 vars; other studios do not", () => {
    const env = { ACUITY_USER_ID: "gu", ACUITY_API_KEY: "gk" };
    expect(getStudio("MH", env).credentials).toEqual({ userId: "gu", apiKey: "gk" });
    expect(getStudio("CH", env).connected).toBe(false);
    const both = { ...env, ACUITY_USER_ID_MH: "mu", ACUITY_API_KEY_MH: "mk" };
    expect(getStudio("MH", both).credentials).toEqual({ userId: "mu", apiKey: "mk" });
  });

  it("studioClient refuses a studio that is not connected", () => {
    expect(() => studioClient("CH", {})).toThrow(/not connected/);
  });
});

describe("write guard", () => {
  it.each(STUDIO_CODES.filter((c) => c !== "MH"))(
    "a write to %s throws before any fetch happens",
    async (code) => {
      const fetchMock = stubFetch();
      const client = studioClient(code, ALL_KEYS);
      for (const method of ["POST", "PUT", "DELETE"] as const) {
        await expect(client.write(method, "/appointments", { body: {} })).rejects.toBeInstanceOf(StudioWriteBlocked);
      }
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it("a forged writable flag on a non-MH studio is still blocked", () => {
    const forged = { ...getStudio("CH", ALL_KEYS), writable: true };
    expect(() => assertWriteAllowed(forged, "POST", "/appointments")).toThrow(StudioWriteBlocked);
  });

  it("reads on non-MH studios go through with that studio's own keys", async () => {
    const fetchMock = stubFetch();
    await studioClient("CH", ALL_KEYS).get("/appointment-types");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://acuityscheduling.com/api/v1/appointment-types");
    expect(init.method).toBe("GET");
    const auth = (init.headers as Record<string, string>).Authorization;
    expect(Buffer.from(auth.replace("Basic ", ""), "base64").toString()).toBe("uid-CH:key-CH");
  });

  it("MH may create appointments", async () => {
    const fetchMock = stubFetch();
    await studioClient("MH", ALL_KEYS).write("POST", "/appointments", { query: { noEmail: true }, body: { a: 1 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://acuityscheduling.com/api/v1/appointments?noEmail=true");
    expect(init.method).toBe("POST");
  });

  it("even on MH, certificates and subscriptions can never be changed or deleted", async () => {
    const fetchMock = stubFetch();
    const mh = studioClient("MH", ALL_KEYS);
    const blocked: Array<["POST" | "PUT" | "DELETE", string]> = [
      ["POST", "/certificates"],
      ["PUT", "/certificates/1"],
      ["DELETE", "/certificates/1"],
      ["PUT", "/appointments/1/cancel"],
      ["PUT", "/appointments/1"],
      ["DELETE", "/subscriptions/1"],
    ];
    for (const [m, p] of blocked) {
      await expect(mh.write(m, p)).rejects.toBeInstanceOf(StudioWriteBlocked);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
