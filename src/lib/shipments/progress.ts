/**
 * How much of the planned drive time has passed: from the planned pickup to the planned
 * delivery, measured at `now`. It is the schedule, not a position; the app has no GPS data.
 */
export type ScheduleProgress =
  /** Pickup or delivery is missing, or delivery is not after pickup. */
  | { kind: "unplanned" }
  /** `elapsedShare` is 0 before pickup and 1 from the planned delivery on. */
  | { kind: "planned"; elapsedShare: number };

export function scheduleProgress(
  pickupAt: Date | null,
  deliveryAt: Date | null,
  now: Date,
): ScheduleProgress {
  if (pickupAt === null || deliveryAt === null) return { kind: "unplanned" };

  const plannedMs = deliveryAt.getTime() - pickupAt.getTime();
  if (plannedMs <= 0) return { kind: "unplanned" };

  const elapsedMs = now.getTime() - pickupAt.getTime();
  return { kind: "planned", elapsedShare: Math.min(Math.max(elapsedMs / plannedMs, 0), 1) };
}
