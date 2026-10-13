import { describe, expect, it } from "vitest";
import { ShipmentEventType } from "@/generated/prisma/enums";
import {
  isLate,
  milestonesOf,
  pickupsByVehicle,
  stopTiming,
  truckTurnaround,
} from "@/lib/shipments/milestones";

const now = new Date("2026-10-13T10:00:00Z");
const hourMs = 3_600_000;
const hoursFromNow = (hours: number) => new Date(now.getTime() + hours * hourMs);

describe("milestonesOf", () => {
  it("takes the first event of each kind and leaves missing ones null", () => {
    expect(
      milestonesOf([
        { type: ShipmentEventType.RESPONSE_SENT, occurredAt: hoursFromNow(-5) },
        { type: ShipmentEventType.RESPONSE_SENT, occurredAt: hoursFromNow(-4) },
        { type: ShipmentEventType.PICKED_UP, occurredAt: hoursFromNow(-1) },
      ]),
    ).toEqual({
      firstResponseAt: hoursFromNow(-5),
      tripLinkedAt: null,
      pickedUpAt: hoursFromNow(-1),
      deliveredAt: null,
    });
  });
});

describe("stopTiming", () => {
  it("compares what T-Port reported with the plan", () => {
    expect(stopTiming(hoursFromNow(-3), hoursFromNow(-2), now)).toEqual({
      kind: "done",
      actualAt: hoursFromNow(-2),
      plannedAt: hoursFromNow(-3),
      delayMs: hourMs,
    });
    expect(stopTiming(null, hoursFromNow(-2), now)).toMatchObject({ kind: "done", delayMs: null });
  });

  it("calls a passed plan overdue only beyond the tolerance", () => {
    expect(stopTiming(hoursFromNow(-0.5), null, now)).toEqual({
      kind: "upcoming",
      plannedAt: hoursFromNow(-0.5),
    });
    expect(stopTiming(hoursFromNow(-2), null, now)).toEqual({
      kind: "overdue",
      plannedAt: hoursFromNow(-2),
      overdueMs: 2 * hourMs,
    });
    expect(stopTiming(null, null, now)).toEqual({ kind: "unplanned" });
  });

  it("is late from 30 minutes after plan", () => {
    expect(isLate(30 * 60_000)).toBe(false);
    expect(isLate(31 * 60_000)).toBe(true);
    expect(isLate(null)).toBe(false);
  });
});

describe("truckTurnaround", () => {
  const pickups = pickupsByVehicle([
    { vehicleId: "t1", pickedUpAt: hoursFromNow(-20) },
    { vehicleId: "t1", pickedUpAt: hoursFromNow(-6) },
    { vehicleId: "t1", pickedUpAt: hoursFromNow(-2) },
    { vehicleId: null, pickedUpAt: hoursFromNow(-1) },
  ]);

  it("finds the vehicle's first pickup after the unload", () => {
    expect(truckTurnaround(hoursFromNow(-10), "t1", pickups)).toEqual({
      kind: "reloaded",
      unloadedAt: hoursFromNow(-10),
      nextPickupAt: hoursFromNow(-6),
    });
  });

  it("says the truck waits when nothing was loaded since", () => {
    expect(truckTurnaround(hoursFromNow(-1), "t1", pickups)).toEqual({
      kind: "waiting",
      unloadedAt: hoursFromNow(-1),
    });
    expect(truckTurnaround(null, "t1", pickups)).toEqual({ kind: "not_unloaded" });
    expect(truckTurnaround(hoursFromNow(-1), null, pickups)).toEqual({
      kind: "no_vehicle",
      unloadedAt: hoursFromNow(-1),
    });
  });
});
