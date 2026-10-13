import { describe, expect, it } from "vitest";
import { ShipmentStatus } from "@/generated/prisma/enums";
import { buildPerformanceReview, verdictFor, type ReviewShipment } from "@/lib/performance/review";

const now = new Date("2026-10-13T10:00:00Z");
const hourMs = 3_600_000;
const hoursFromNow = (hours: number) => new Date(now.getTime() + hours * hourMs);

const anna = { id: "anna" };
const bence = { id: "bence" };

let sequence = 0;
function shipment(overrides: Partial<ReviewShipment>): ReviewShipment {
  sequence += 1;
  return {
    id: `s${sequence}`,
    dispatcherId: anna.id,
    status: ShipmentStatus.ORGANIZING,
    requestedAt: hoursFromNow(-48),
    pickupAt: hoursFromNow(48),
    deliveryAt: hoursFromNow(72),
    tportTripId: null,
    vehicleId: null,
    firstResponseAt: null,
    tripLinkedAt: null,
    changeCount: 0,
    ...overrides,
  };
}

/** A request answered after `hours`. */
function answered(dispatcherId: string, hours: number) {
  return shipment({ dispatcherId, firstResponseAt: hoursFromNow(-48 + hours) });
}

describe("verdictFor", () => {
  it("treats lower as better, with 15% either side counting as on par", () => {
    expect(verdictFor(85, 100)).toBe("strength");
    expect(verdictFor(90, 100)).toBe("on_par");
    expect(verdictFor(114, 100)).toBe("on_par");
    expect(verdictFor(115, 100)).toBe("needs_work");
  });

  it("only flags a value above a team value of zero", () => {
    expect(verdictFor(0, 0)).toBe("on_par");
    expect(verdictFor(1, 0)).toBe("needs_work");
  });
});

describe("buildPerformanceReview", () => {
  it("compares each median with the pooled team median", () => {
    const review = buildPerformanceReview(
      [anna, bence],
      [1, 1, 1]
        .map((hours) => answered(anna.id, hours))
        .concat([3, 3, 3].map((hours) => answered(bence.id, hours))),
      now,
    );

    expect(review.team.firstResponse).toEqual({
      kind: "measured",
      value: 2 * hourMs,
      sampleSize: 6,
    });
    expect(review.dispatchers.map((row) => row.metrics.firstResponse)).toEqual([
      { kind: "measured", value: hourMs, sampleSize: 3, verdict: "strength" },
      { kind: "measured", value: 3 * hourMs, sampleSize: 3, verdict: "needs_work" },
    ]);
  });

  it("says there is too little data instead of a median of two", () => {
    const review = buildPerformanceReview(
      [anna, bence],
      [answered(anna.id, 1), answered(anna.id, 2), ...[1, 2, 3].map((h) => answered(bence.id, h))],
      now,
    );

    expect(review.dispatchers[0].metrics.firstResponse).toEqual({
      kind: "insufficient_data",
      sampleSize: 2,
    });
  });

  it("leaves requests from before the window out", () => {
    const old = shipment({
      requestedAt: hoursFromNow(-31 * 24),
      firstResponseAt: hoursFromNow(-31 * 24 + 9),
    });
    const review = buildPerformanceReview([anna], [old], now);

    expect(review.team.firstResponse).toEqual({ kind: "insufficient_data", sampleSize: 0 });
  });

  it("measures an unload to the same vehicle's next pickup, crediting the unloading dispatcher", () => {
    const unload = (vehicleId: string, at: number) =>
      shipment({
        status: ShipmentStatus.COMPLETED,
        vehicleId,
        pickupAt: hoursFromNow(at - 30),
        deliveryAt: hoursFromNow(at),
      });
    const review = buildPerformanceReview(
      [anna, bence],
      [
        unload("t1", -100),
        unload("t2", -100),
        unload("t3", -100),
        // Next pickups, organised by someone else: the gap still counts for anna.
        shipment({ dispatcherId: bence.id, vehicleId: "t1", pickupAt: hoursFromNow(-96) }),
        shipment({ dispatcherId: bence.id, vehicleId: "t2", pickupAt: hoursFromNow(-90) }),
        shipment({ dispatcherId: bence.id, vehicleId: "t2", pickupAt: hoursFromNow(-80) }),
        shipment({ dispatcherId: bence.id, vehicleId: "t3", pickupAt: hoursFromNow(-98) }),
        // A cancelled shipment never loaded the truck.
        shipment({
          status: ShipmentStatus.CANCELLED,
          vehicleId: "t3",
          pickupAt: hoursFromNow(-99),
        }),
      ],
      now,
    );

    expect(review.dispatchers[0].metrics.idleAfterUnload).toMatchObject({
      kind: "measured",
      value: 4 * hourMs,
      sampleSize: 3,
    });
  });

  it("skips an unload whose truck has no next pickup yet", () => {
    const review = buildPerformanceReview(
      [anna],
      [
        shipment({
          status: ShipmentStatus.COMPLETED,
          vehicleId: "t1",
          pickupAt: hoursFromNow(-40),
          deliveryAt: hoursFromNow(-10),
        }),
      ],
      now,
    );

    expect(review.team.idleAfterUnload).toEqual({ kind: "insufficient_data", sampleSize: 0 });
  });

  it("counts unanswered requests with the alert's rule, and the team value per dispatcher", () => {
    const review = buildPerformanceReview(
      [anna, bence],
      [
        shipment({ status: ShipmentStatus.UNHANDLED, requestedAt: hoursFromNow(-3) }),
        shipment({ status: ShipmentStatus.UNHANDLED, requestedAt: hoursFromNow(-1) }),
      ],
      now,
    );

    expect(review.team.unanswered).toEqual({ kind: "measured", value: 0.5, sampleSize: 1 });
    expect(review.dispatchers.map((row) => row.metrics.unanswered)).toEqual([
      { kind: "measured", value: 1, sampleSize: 1, verdict: "needs_work" },
      { kind: "measured", value: 0, sampleSize: 0, verdict: "strength" },
    ]);
  });

  it("shares repeatedly changed shipments among the requests, without cancelled ones", () => {
    const review = buildPerformanceReview(
      [anna],
      [
        shipment({ changeCount: 2 }),
        shipment({ changeCount: 1 }),
        shipment({ changeCount: 0 }),
        shipment({ changeCount: 3 }),
        shipment({ changeCount: 0 }),
        shipment({ status: ShipmentStatus.CANCELLED, changeCount: 5 }),
      ],
      now,
    );

    expect(review.team.repeatedChanges).toEqual({ kind: "measured", value: 0.4, sampleSize: 5 });
  });

  it("counts open shipments per dispatcher", () => {
    const review = buildPerformanceReview(
      [anna],
      [
        shipment({}),
        shipment({ status: ShipmentStatus.IN_TRANSIT }),
        shipment({ status: ShipmentStatus.COMPLETED }),
        shipment({ status: ShipmentStatus.CANCELLED }),
      ],
      now,
    );

    expect(review.dispatchers[0].openShipmentCount).toBe(2);
  });
});
