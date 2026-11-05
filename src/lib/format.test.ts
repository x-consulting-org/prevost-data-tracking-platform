import { describe, expect, it } from "vitest";
import {
  formatDateTime,
  formatDecimal,
  formatDuration,
  formatRelative,
  formatShare,
  formatTime,
} from "@/lib/format";

describe("formatDateTime", () => {
  it("shows Budapest time in both summer and winter", () => {
    expect(formatDateTime(new Date("2026-07-01T06:00:00Z"))).toBe("júl. 1. 08:00");
    expect(formatDateTime(new Date("2026-01-15T07:00:00Z"))).toBe("jan. 15. 08:00");
  });
});

describe("formatTime", () => {
  it("shows the Budapest wall-clock time", () => {
    expect(formatTime(new Date("2026-07-01T06:05:00Z"))).toBe("08:05");
    expect(formatTime(new Date("2026-01-15T16:30:00Z"))).toBe("17:30");
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

  it("counts Budapest calendar days from a day away", () => {
    // Monday 22:00 to Wednesday 06:00 in Budapest is 32 hours, but two days.
    const mondayEvening = new Date("2026-10-12T20:00:00Z");
    expect(formatRelative(new Date("2026-10-14T04:00:00Z"), mondayEvening)).toBe("holnapután");
    expect(formatRelative(new Date("2026-10-10T20:00:00Z"), mondayEvening)).toBe("tegnapelőtt");
  });

  it("switches to hours instead of showing 60 minutes", () => {
    expect(formatRelative(hoursFromNow(59.6 / 60), now)).toBe("1 óra múlva");
  });
});

describe("formatDuration", () => {
  it("picks minutes, hours or days so the number stays readable", () => {
    expect(formatDuration(42 * 60_000)).toBe("42 perc");
    expect(formatDuration(5.25 * 3_600_000)).toBe("5,3 óra");
    expect(formatDuration(47 * 3_600_000)).toBe("47 óra");
    expect(formatDuration(58 * 3_600_000)).toBe("2,4 nap");
  });
});

describe("formatShare and formatDecimal", () => {
  it("write numbers the Hungarian way", () => {
    expect(formatShare(0.184)).toBe("18%");
    expect(formatDecimal(1.44)).toBe("1,4");
  });
});
