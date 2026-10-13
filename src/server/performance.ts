import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { ShipmentEventType, ShipmentStatus } from "@/generated/prisma/enums";
import {
  buildPerformanceReview,
  reviewWindowDays,
  type PerformanceReview,
  type ReviewShipment,
} from "@/lib/performance/review";
import { prisma } from "@/lib/prisma";
import { dayMs } from "@/lib/time";
import { findDispatchers, type DispatcherSummary } from "@/server/shipments";

const changeEventTypes = [ShipmentEventType.SCHEDULE_CHANGED, ShipmentEventType.DETAILS_CHANGED];

const reviewShipmentSelect = {
  id: true,
  dispatcherId: true,
  status: true,
  requestedAt: true,
  pickupAt: true,
  deliveryAt: true,
  tportTripId: true,
  vehicleId: true,
  events: {
    where: { type: { in: [ShipmentEventType.RESPONSE_SENT, ShipmentEventType.TRIP_LINKED] } },
    select: { type: true, occurredAt: true },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
  },
  _count: { select: { events: { where: { type: { in: changeEventTypes } } } } },
} satisfies Prisma.ShipmentSelect;

type ReviewShipmentRow = Prisma.ShipmentGetPayload<{ select: typeof reviewShipmentSelect }>;

function toReviewShipment({ events, _count, ...shipment }: ReviewShipmentRow): ReviewShipment {
  // Events come oldest first, so `find` gives the first response.
  const firstOf = (type: ShipmentEventType) =>
    events.find((event) => event.type === type)?.occurredAt ?? null;

  return {
    ...shipment,
    firstResponseAt: firstOf(ShipmentEventType.RESPONSE_SENT),
    tripLinkedAt: firstOf(ShipmentEventType.TRIP_LINKED),
    changeCount: _count.events,
  };
}

/**
 * Everything the review window touches: shipments requested, picked up or unloaded in it (an
 * unload's next pickup is always later, so it is in the window too) and every open shipment.
 */
export async function findPerformanceReview(
  now: Date,
): Promise<PerformanceReview<DispatcherSummary>> {
  const windowStart = new Date(now.getTime() - reviewWindowDays * dayMs);
  const [dispatchers, shipments] = await Promise.all([
    findDispatchers(),
    prisma.shipment.findMany({
      where: {
        OR: [
          { requestedAt: { gte: windowStart } },
          { pickupAt: { gte: windowStart } },
          { deliveryAt: { gte: windowStart } },
          { status: { notIn: [ShipmentStatus.COMPLETED, ShipmentStatus.CANCELLED] } },
        ],
      },
      select: reviewShipmentSelect,
      orderBy: [{ requestedAt: "asc" }, { id: "asc" }],
    }),
  ]);

  return buildPerformanceReview(dispatchers, shipments.map(toReviewShipment), now);
}
