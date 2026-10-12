import { describe, expect, it } from "vitest";
import { formatDateTime, formatRelative } from "@/lib/format";

describe("formatDateTime", () => {
  it("shows Budapest time in both summer and winter", () => {
    expect(formatDateTime(new Date("2026-07-01T06:00:00Z"))).toBe("júl. 1. 08:00");
    expect(formatDateTime(new Date("2026-01-15T07:00:00Z"))).toBe("jan. 15. 08:00");
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-10-12T10:00:00Z");
  const hoursFromNow = (hours: number) => new Date(now.getTime() + hours * 3_600_000);

  it("picks minutes, hours or days by distance", () => {
    expect(formatRelative(hoursFromNow(0.5), now)).toBe("30 perc múlva");
    expect(formatRelative(hoursFromNow(6), now)).toBe("6 óra múlva");
    expect(formatRelative(hoursFromNow(-3), now)).toBe("3 órával ezelőtt");
    expect(formatRelative(hoursFromNow(24), now)).toBe("holnap");
  });
});
