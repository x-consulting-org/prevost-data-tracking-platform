import { describe, expect, it } from "vitest";
import { ShipmentStatus } from "@/generated/prisma/enums";
import { getShipmentAlerts, type AlertInput } from "@/lib/shipments/alerts";

const now = new Date("2026-10-12T10:00:00Z");
const settings = { unansweredAfterMinutes: 120, onTimeToleranceMinutes: 30 };
const hoursFromNow = (hours: number) => new Date(now.getTime() + hours * 3_600_000);

function shipment(overrides: Partial<AlertInput>): AlertInput {
  return {
    status: ShipmentStatus.ORGANIZING,
    requestedAt: hoursFromNow(-48),
    pickupAt: hoursFromNow(72),
    deliveryAt: hoursFromNow(96),
    tportTripId: null,
    ...overrides,
  };
}

describe("getShipmentAlerts", () => {
  it("flags an unhandled request once it is two hours old", () => {
    const fresh = shipment({ status: ShipmentStatus.UNHANDLED, requestedAt: hoursFromNow(-1.9) });
    const old = shipment({ status: ShipmentStatus.UNHANDLED, requestedAt: hoursFromNow(-2) });

    expect(getShipmentAlerts(fresh, now, settings)).toEqual([]);
    expect(getShipmentAlerts(old, now, settings)).toEqual([
      { kind: "unanswered_request", since: old.requestedAt },
    ]);
  });

  it("flags a pickup within 24 hours only while no T-Port trip is linked", () => {
    const pickupAt = hoursFromNow(24);

    expect(getShipmentAlerts(shipment({ pickupAt }), now, settings)).toEqual([
      { kind: "pickup_soon_unplanned", pickupAt },
    ]);
    expect(getShipmentAlerts(shipment({ pickupAt, tportTripId: "TP-1" }), now, settings)).toEqual(
      [],
    );
    expect(getShipmentAlerts(shipment({ pickupAt: hoursFromNow(25) }), now, settings)).toEqual([]);
  });

  it("keeps flagging an unplanned pickup that is already late", () => {
    const pickupAt = hoursFromNow(-3);

    expect(getShipmentAlerts(shipment({ pickupAt }), now, settings)).toEqual([
      { kind: "pickup_soon_unplanned", pickupAt },
    ]);
  });

  it("flags a missing pickup time instead of guessing one", () => {
    expect(getShipmentAlerts(shipment({ pickupAt: null }), now, settings)).toEqual([
      { kind: "missing_schedule" },
    ]);
  });

  it("flags an overdue delivery in transit", () => {
    const deliveryAt = hoursFromNow(-1);
    const inTransit = shipment({
      status: ShipmentStatus.IN_TRANSIT,
      deliveryAt,
      tportTripId: "TP-1",
    });

    expect(getShipmentAlerts(inTransit, now, settings)).toEqual([
      { kind: "delivery_overdue", deliveryAt },
    ]);
  });

  it("never flags completed or cancelled shipments", () => {
    for (const status of [ShipmentStatus.COMPLETED, ShipmentStatus.CANCELLED]) {
      const closed = shipment({ status, pickupAt: null, deliveryAt: hoursFromNow(-100) });
      expect(getShipmentAlerts(closed, now, settings)).toEqual([]);
    }
  });
});
