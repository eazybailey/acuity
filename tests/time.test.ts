import { describe, expect, it } from "vitest";
import { formatTime, londonDate, londonMonth, londonOffsetMinutes, nextMonth } from "../lib/time";
import { acuityDatetime } from "../lib/acuity";

describe("London time", () => {
  it("knows BST from GMT", () => {
    expect(londonOffsetMinutes(new Date("2026-07-01T12:00:00Z"))).toBe(60);
    expect(londonOffsetMinutes(new Date("2026-12-01T12:00:00Z"))).toBe(0);
  });

  it("uses the London calendar date, not UTC", () => {
    // 23:30 UTC on 30 Sept is 00:30 BST on 1 Oct.
    expect(londonDate(new Date("2026-09-30T23:30:00Z"))).toBe("2026-10-01");
    expect(londonMonth(new Date("2026-09-30T23:30:00Z"))).toBe("2026-10");
    expect(londonDate(new Date("2026-12-31T23:30:00Z"))).toBe("2026-12-31");
  });

  it("rolls months over", () => {
    expect(nextMonth("2026-09")).toBe("2026-10");
    expect(nextMonth("2026-12")).toBe("2027-01");
  });

  it("formats Acuity offsets in London", () => {
    expect(formatTime("2026-09-26T09:00:00+0100")).toBe("09:00");
    expect(formatTime("2026-12-01T09:00:00+0000")).toBe("09:00");
    expect(acuityDatetime(new Date("2026-09-26T08:00:00Z"), 60)).toBe("2026-09-26T09:00:00+0100");
  });
});
