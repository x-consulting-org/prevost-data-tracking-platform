import { describe, expect, it } from "vitest";
import { scheduleProgress } from "@/lib/shipments/progress";

describe("scheduleProgress", () => {
  const pickupAt = new Date("2026-10-12T08:00:00Z");
  const deliveryAt = new Date("2026-10-12T18:00:00Z");

  it("is the share of the planned drive time that has passed", () => {
    expect(scheduleProgress(pickupAt, deliveryAt, new Date("2026-10-12T13:00:00Z"))).toEqual({
      kind: "planned",
      elapsedShare: 0.5,
    });
  });

  it("stays between 0 and 1 before pickup and after the planned delivery", () => {
    expect(scheduleProgress(pickupAt, deliveryAt, new Date("2026-10-12T06:00:00Z"))).toEqual({
      kind: "planned",
      elapsedShare: 0,
    });
    expect(scheduleProgress(pickupAt, deliveryAt, new Date("2026-10-13T06:00:00Z"))).toEqual({
      kind: "planned",
      elapsedShare: 1,
    });
  });

  it("is unplanned without both times or when delivery is not after pickup", () => {
    expect(scheduleProgress(null, deliveryAt, pickupAt)).toEqual({ kind: "unplanned" });
    expect(scheduleProgress(pickupAt, null, pickupAt)).toEqual({ kind: "unplanned" });
    expect(scheduleProgress(deliveryAt, pickupAt, pickupAt)).toEqual({ kind: "unplanned" });
  });
});
