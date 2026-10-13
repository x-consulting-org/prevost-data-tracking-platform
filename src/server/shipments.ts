import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { ShipmentEventType, ShipmentStatus, type DataSource } from "@/generated/prisma/enums";
import { toPaginatedResult, toSkipTake, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { getShipmentAlerts, type ShipmentAlert } from "@/lib/shipments/alerts";
import { groupByStatus, type StatusColumn } from "@/lib/shipments/grouping";
import type {
  ShipmentFilter,
  ShipmentPageInput,
  SortableShipmentColumn,
} from "@/lib/shipments/schemas";
import { externalSources } from "@/lib/shipments/sources";
import {
  milestoneEventTypes,
  milestonesOf,
  pickupsByVehicle,
  truckTurnaround,
  type ShipmentMilestones,
  type TruckTurnaround,
} from "@/lib/shipments/milestones";
import { boardStatuses, boardStatusesFor, closedVisibleDays } from "@/lib/shipments/status";
import { dayMs } from "@/lib/time";

const shipmentCardSelect = {
  id: true,
  reference: true,
  status: true,
  requestedAt: true,
  pickupAt: true,
  deliveryAt: true,
  tportTripId: true,
  originCity: true,
  originCountry: true,
  destinationCity: true,
  destinationCountry: true,
  dispatcherId: true,
  vehicleId: true,
  dispatcher: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true } },
  events: {
    where: { type: { in: [...milestoneEventTypes] } },
    select: { type: true, occurredAt: true },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.ShipmentSelect;

const shipmentDetailSelect = {
  ...shipmentCardSelect,
  statusChangedAt: true,
  cargoDescription: true,
  specialRequirements: true,
  events: {
    select: { id: true, type: true, source: true, summary: true, occurredAt: true },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.ShipmentSelect;

const dispatcherSelect = { id: true, name: true } satisfies Prisma.DispatcherSelect;

type ShipmentCardRow = Prisma.ShipmentGetPayload<{ select: typeof shipmentCardSelect }>;
type ShipmentDetailRow = Prisma.ShipmentGetPayload<{ select: typeof shipmentDetailSelect }>;

export type DispatcherSummary = Prisma.DispatcherGetPayload<{ select: typeof dispatcherSelect }>;
/** What the cards, the table and the detail add to a row: alerts, milestones, the truck's turn. */
type Derived = {
  alerts: ShipmentAlert[];
  milestones: ShipmentMilestones;
  turnaround: TruckTurnaround;
};

export type ShipmentCard = ShipmentCardRow & Derived;
export type ShipmentDetail = ShipmentDetailRow & Derived;

export type StatusBoard = {
  /** The `now` alerts were computed against; relative times in the UI use it too. */
  generatedAt: Date;
  columns: StatusColumn<ShipmentCard>[];
};

export type SyncState =
  | { status: "never_synced"; source: DataSource }
  | { status: "synced"; source: DataSource; lastSyncedAt: Date };

/** The last key of every ordering, so rows with equal values keep a stable order. */
const idTiebreaker = { id: "asc" } satisfies Prisma.ShipmentOrderByWithRelationInput;

/** Board order: soonest pickup first, shipments without one last. `id` makes it total. */
const boardOrderBy = [
  { pickupAt: { sort: "asc", nulls: "last" } },
  { requestedAt: "asc" },
  idTiebreaker,
] satisfies Prisma.ShipmentOrderByWithRelationInput[];

const sortableColumnOrderBy = {
  reference: (sort) => [{ reference: sort }],
  customer: (sort) => [{ customer: { name: sort } }],
  pickupAt: (sort) => [{ pickupAt: { sort, nulls: "last" } }],
  deliveryAt: (sort) => [{ deliveryAt: { sort, nulls: "last" } }],
  status: (sort) => [{ status: sort }],
  dispatcher: (sort) => [{ dispatcher: { name: sort } }],
} satisfies Record<
  SortableShipmentColumn,
  (sort: Prisma.SortOrder) => Prisma.ShipmentOrderByWithRelationInput[]
>;

/**
 * Open shipments plus those completed (and, when the filter asks, cancelled) within the last
 * `closedVisibleDays`. The boards load
 * all of them unpaged: phase 0 has tens of open shipments per dispatcher, and a larger
 * volume needs per-column paging before it goes live.
 */
function boardWhere(filter: ShipmentFilter, now: Date): Prisma.ShipmentWhereInput {
  const closedSince = new Date(now.getTime() - closedVisibleDays * dayMs);

  return {
    dispatcherId: filter.dispatcherId,
    pickupAt: filter.pickupWithin24h
      ? { gte: now, lte: new Date(now.getTime() + dayMs) }
      : undefined,
    OR: [
      { status: { in: boardStatuses.filter((status) => status !== ShipmentStatus.COMPLETED) } },
      { status: ShipmentStatus.COMPLETED, statusChangedAt: { gte: closedSince } },
      ...(filter.includeCancelled
        ? [{ status: ShipmentStatus.CANCELLED, statusChangedAt: { gte: closedSince } }]
        : []),
    ],
  };
}

/**
 * Adds what is derived from the current time and the events. A delivered shipment's truck is
 * followed to its next actual pickup, which may belong to a shipment outside `shipments`.
 */
async function withDerived<TShipment extends ShipmentCardRow>(
  shipments: readonly TShipment[],
  now: Date,
): Promise<(TShipment & Derived)[]> {
  const withMilestones = shipments.map((shipment) => ({
    shipment,
    milestones: milestonesOf(shipment.events),
  }));
  const unloadedVehicleIds = [
    ...new Set(
      withMilestones.flatMap(({ shipment, milestones }) =>
        shipment.vehicleId !== null && milestones.deliveredAt !== null ? [shipment.vehicleId] : [],
      ),
    ),
  ];
  const pickups =
    unloadedVehicleIds.length === 0
      ? []
      : await prisma.shipmentEvent.findMany({
          where: {
            type: ShipmentEventType.PICKED_UP,
            shipment: { vehicleId: { in: unloadedVehicleIds } },
          },
          select: { occurredAt: true, shipment: { select: { vehicleId: true } } },
          orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
        });
  const pickupsOf = pickupsByVehicle(
    pickups.map((pickup) => ({
      vehicleId: pickup.shipment.vehicleId,
      pickedUpAt: pickup.occurredAt,
    })),
  );

  return withMilestones.map(({ shipment, milestones }) => ({
    ...shipment,
    alerts: getShipmentAlerts(shipment, now),
    milestones,
    turnaround: truckTurnaround(milestones.deliveredAt, shipment.vehicleId, pickupsOf),
  }));
}

export async function findStatusBoard(filter: ShipmentFilter, now: Date): Promise<StatusBoard> {
  const shipments = await prisma.shipment.findMany({
    where: boardWhere(filter, now),
    select: shipmentCardSelect,
    orderBy: boardOrderBy,
  });

  return {
    generatedAt: now,
    columns: groupByStatus(await withDerived(shipments, now), boardStatusesFor(filter)),
  };
}

export async function listShipments(
  { pageIndex, pageSize, sorting, filter }: ShipmentPageInput,
  now: Date,
): Promise<PaginatedResult<ShipmentCard>> {
  const where = boardWhere(filter, now);
  const [sort] = sorting;
  const orderBy = sort
    ? [...sortableColumnOrderBy[sort.id](sort.desc ? "desc" : "asc"), idTiebreaker]
    : boardOrderBy;

  const [shipments, rowCount] = await prisma.$transaction([
    prisma.shipment.findMany({
      where,
      select: shipmentCardSelect,
      orderBy,
      ...toSkipTake({ pageIndex, pageSize }),
    }),
    prisma.shipment.count({ where }),
  ]);

  return toPaginatedResult({
    items: await withDerived(shipments, now),
    rowCount,
    pageIndex,
    pageSize,
  });
}

/** `null` means there is no shipment with this id. */
export async function findShipmentDetail(id: string, now: Date): Promise<ShipmentDetail | null> {
  const shipment = await prisma.shipment.findUnique({
    where: { id },
    select: shipmentDetailSelect,
  });

  if (shipment === null) return null;
  const [detail] = await withDerived([shipment], now);
  return detail;
}

export async function findDispatchers(): Promise<DispatcherSummary[]> {
  return prisma.dispatcher.findMany({
    select: dispatcherSelect,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}

export async function findSyncStates(): Promise<SyncState[]> {
  const syncs = await prisma.sourceSync.findMany({
    where: { source: { in: [...externalSources] } },
    select: { source: true, lastSyncedAt: true },
    orderBy: { source: "asc" },
  });

  return externalSources.map((source): SyncState => {
    const sync = syncs.find((row) => row.source === source);
    return sync
      ? { status: "synced", source, lastSyncedAt: sync.lastSyncedAt }
      : { status: "never_synced", source };
  });
}
