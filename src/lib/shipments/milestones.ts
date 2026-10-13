import { ShipmentEventType } from "@/generated/prisma/enums";
import { minuteMs } from "@/lib/time";

/**
 * Events that mark a step of a shipment. The performance review measures the time between them,
 * and the cards show the same moments, so both read them through `milestonesOf`.
 */
export const milestoneEventTypes = [
  ShipmentEventType.RESPONSE_SENT,
  ShipmentEventType.TRIP_LINKED,
  ShipmentEventType.PICKED_UP,
  ShipmentEventType.DELIVERED,
] as const satisfies readonly ShipmentEventType[];

/** When each step first happened; null while it has not. */
export type ShipmentMilestones = {
  firstResponseAt: Date | null;
  tripLinkedAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
};

/** `events` oldest first, as the read models order them. */
export function milestonesOf(
  events: readonly { type: ShipmentEventType; occurredAt: Date }[],
): ShipmentMilestones {
  const first = (type: ShipmentEventType) =>
    events.find((event) => event.type === type)?.occurredAt ?? null;

  return {
    firstResponseAt: first(ShipmentEventType.RESPONSE_SENT),
    tripLinkedAt: first(ShipmentEventType.TRIP_LINKED),
    pickedUpAt: first(ShipmentEventType.PICKED_UP),
    deliveredAt: first(ShipmentEventType.DELIVERED),
  };
}

/** A pickup or delivery this much after plan still counts as on time. A workshop placeholder. */
export const onTimeToleranceMs = 30 * minuteMs;

/** A pickup or delivery: the plan next to what T-Port reported. */
export type StopTiming =
  | { kind: "unplanned" }
  | { kind: "upcoming"; plannedAt: Date }
  /** The planned time has passed by more than the tolerance and T-Port reported nothing. */
  | { kind: "overdue"; plannedAt: Date; overdueMs: number }
  /** Done. `delayMs` is null when there was no plan to compare with; negative means early. */
  | { kind: "done"; actualAt: Date; plannedAt: Date | null; delayMs: number | null };

export function stopTiming(plannedAt: Date | null, actualAt: Date | null, now: Date): StopTiming {
  if (actualAt !== null) {
    return {
      kind: "done",
      actualAt,
      plannedAt,
      delayMs: plannedAt === null ? null : actualAt.getTime() - plannedAt.getTime(),
    };
  }
  if (plannedAt === null) return { kind: "unplanned" };
  const overdueMs = now.getTime() - plannedAt.getTime();
  return overdueMs > onTimeToleranceMs
    ? { kind: "overdue", plannedAt, overdueMs }
    : { kind: "upcoming", plannedAt };
}

export function isLate(delayMs: number | null): boolean {
  return delayMs !== null && delayMs > onTimeToleranceMs;
}

/** The earliest pickup at or after `unloadedAt`, from the same vehicle's pickups. */
export function nextPickupAfter(unloadedAt: Date, pickups: readonly Date[]): Date | null {
  const later = pickups.filter((pickup) => pickup >= unloadedAt);
  return later.length === 0 ? null : new Date(Math.min(...later.map((p) => p.getTime())));
}

/** What became of the truck after this shipment unloaded it. */
export type TruckTurnaround =
  | { kind: "not_unloaded" }
  /** No vehicle is known for the trip, so there is nothing to follow. */
  | { kind: "no_vehicle"; unloadedAt: Date }
  | { kind: "waiting"; unloadedAt: Date }
  | { kind: "reloaded"; unloadedAt: Date; nextPickupAt: Date };

export function truckTurnaround(
  deliveredAt: Date | null,
  vehicleId: string | null,
  pickupsByVehicle: ReadonlyMap<string, readonly Date[]>,
): TruckTurnaround {
  if (deliveredAt === null) return { kind: "not_unloaded" };
  if (vehicleId === null) return { kind: "no_vehicle", unloadedAt: deliveredAt };
  const nextPickupAt = nextPickupAfter(deliveredAt, pickupsByVehicle.get(vehicleId) ?? []);
  return nextPickupAt === null
    ? { kind: "waiting", unloadedAt: deliveredAt }
    : { kind: "reloaded", unloadedAt: deliveredAt, nextPickupAt };
}

/** Actual pickups per vehicle, the input of `truckTurnaround`. */
export function pickupsByVehicle(
  shipments: readonly { vehicleId: string | null; pickedUpAt: Date | null }[],
): Map<string, Date[]> {
  const byVehicle = new Map<string, Date[]>();
  for (const { vehicleId, pickedUpAt } of shipments) {
    if (vehicleId === null || pickedUpAt === null) continue;
    byVehicle.set(vehicleId, [...(byVehicle.get(vehicleId) ?? []), pickedUpAt]);
  }
  return byVehicle;
}
