import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { ShipmentEventType, ShipmentStatus } from "@/generated/prisma/enums";
import {
  buildPerformanceReview,
  reviewWindowStart,
  type PerformanceReview,
  type ReviewShipment,
} from "@/lib/performance/review";
import { prisma } from "@/lib/prisma";
import { milestoneEventTypes, milestonesOf } from "@/lib/shipments/milestones";
import { findMetricSettings } from "@/server/metric-settings";
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
    where: { type: { in: [...milestoneEventTypes] } },
    select: { type: true, occurredAt: true },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
  },
  _count: { select: { events: { where: { type: { in: changeEventTypes } } } } },
} satisfies Prisma.ShipmentSelect;

type ReviewShipmentRow = Prisma.ShipmentGetPayload<{ select: typeof reviewShipmentSelect }>;

function toReviewShipment({ events, _count, ...shipment }: ReviewShipmentRow): ReviewShipment {
  return { ...shipment, ...milestonesOf(events), changeCount: _count.events };
}

/**
 * Everything the review window touches: shipments requested, planned to be picked up or
 * unloaded in it (an unload's next pickup is always later, so it is in the window too) and every
 * open shipment.
 */
export async function findPerformanceReview(
  now: Date,
): Promise<PerformanceReview<DispatcherSummary>> {
  // The settings decide the window, so they are read first.
  const { settings } = await findMetricSettings();
  const windowStart = reviewWindowStart(now, settings);
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

  return buildPerformanceReview(dispatchers, shipments.map(toReviewShipment), now, settings);
}
