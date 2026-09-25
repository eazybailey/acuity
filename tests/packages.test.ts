import { describe, expect, it } from "vitest";
import type { AppointmentType, Certificate } from "../lib/acuity";
import { bookableTypes, checkoutUrl, covers, pickCertificate, totalMinutes } from "../lib/packages";
import { matchClient } from "../lib/data";

const TODAY = "2026-09-25";
const cert = (o: Partial<Certificate>): Certificate => ({ id: 1, certificate: "C", ...o });
const type = (id: number, duration = 30, o: Partial<AppointmentType> = {}): AppointmentType => ({ id, name: `T${id}`, duration, ...o });

describe("minutes maths", () => {
  it("sums remaining minutes, ignoring expired, empty and session-count certificates", () => {
    const certs = [
      cert({ remainingMinutes: 150 }),
      cert({ remainingMinutes: 60, expiration: "2027-01-01" }),
      cert({ remainingMinutes: 90, expiration: "2026-09-24" }), // expired yesterday
      cert({ remainingMinutes: 30, expiration: TODAY }), // still valid today
      cert({ remainingMinutes: 0 }),
      cert({ remainingMinutes: null, remainingCounts: { "5": 3 } }),
    ];
    expect(totalMinutes(certs, TODAY)).toBe(240);
    expect(totalMinutes([], TODAY)).toBe(0);
  });

  it("a certificate without appointmentTypeIDs covers every type", () => {
    expect(covers(cert({}), 5)).toBe(true);
    expect(covers(cert({ appointmentTypeIDs: [] }), 5)).toBe(true);
    expect(covers(cert({ appointmentTypeIDs: [1, 2] }), 5)).toBe(false);
    expect(covers(cert({ appointmentTypeIDs: [1, 5] }), 5)).toBe(true);
  });

  it("filters appointment types to those covered with enough minutes", () => {
    const types = [type(1, 30), type(2, 60), type(3, 30, { active: false }), type(4, 30)];
    const certs = [cert({ remainingMinutes: 45, appointmentTypeIDs: [1, 2, 3] })];
    expect(bookableTypes(types, certs, TODAY).map((t) => t.id)).toEqual([1]);
    expect(bookableTypes(types, [], TODAY)).toEqual([]);
    expect(bookableTypes(types, [cert({ remainingMinutes: 60 })], TODAY).map((t) => t.id)).toEqual([1, 2, 4]);
  });

  it("picks the soonest-expiring certificate that covers the type", () => {
    const certs = [
      cert({ id: 1, certificate: "NOEXP", remainingMinutes: 300 }),
      cert({ id: 2, certificate: "LATER", remainingMinutes: 60, expiration: "2027-06-01" }),
      cert({ id: 3, certificate: "SOON", remainingMinutes: 60, expiration: "2026-10-01" }),
      cert({ id: 4, certificate: "WRONGTYPE", remainingMinutes: 60, expiration: "2026-09-30", appointmentTypeIDs: [9] }),
      cert({ id: 5, certificate: "TOOSMALL", remainingMinutes: 15, expiration: "2026-09-26" }),
    ];
    expect(pickCertificate(certs, type(1, 30), TODAY)?.certificate).toBe("SOON");
    expect(pickCertificate(certs, type(1, 120), TODAY)?.certificate).toBe("NOEXP");
    expect(pickCertificate([], type(1), TODAY)).toBeNull();
  });
});

describe("client lookup", () => {
  it("matches the email exactly, case-insensitively", () => {
    const list = [{ email: "jo.smith@example.com" }, { email: "Jo@Example.com", firstName: "Jo" }];
    expect(matchClient(list, "jo@example.com")?.firstName).toBe("Jo");
    expect(matchClient(list, "jo@example.co")).toBeNull();
    expect(matchClient([], "jo@example.com")).toBeNull();
  });
});

describe("checkout URL", () => {
  it("links to the studio's hosted Acuity catalogue for one product", () => {
    expect(checkoutUrl("12345", 678)).toBe(
      "https://app.acuityscheduling.com/catalog.php?owner=12345&action=addCart&clear=1&id=678"
    );
  });
});
