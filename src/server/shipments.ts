import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { ShipmentStatus, type DataSource } from "@/generated/prisma/enums";
import { toPaginatedResult, toSkipTake, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { getShipmentAlerts, type ShipmentAlert } from "@/lib/shipments/alerts";
import {
  groupByDispatcher,
  groupByStatus,
  type DispatcherColumn,
  type StatusColumn,
} from "@/lib/shipments/grouping";
import type {
  ShipmentFilter,
  ShipmentPageInput,
  SortableShipmentColumn,
} from "@/lib/shipments/schemas";
import { externalSources } from "@/lib/shipments/sources";
import { boardStatuses, completedVisibleDays } from "@/lib/shipments/status";

const hourMs = 3_600_000;

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
  dispatcher: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true } },
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
export type ShipmentCard = ShipmentCardRow & { alerts: ShipmentAlert[] };
export type ShipmentDetail = ShipmentDetailRow & { alerts: ShipmentAlert[] };

export type StatusBoard = {
  /** The `now` alerts were computed against; relative times in the UI use it too. */
  generatedAt: Date;
  columns: StatusColumn<ShipmentCard>[];
};

export type DispatcherBoard = {
  generatedAt: Date;
  columns: DispatcherColumn<DispatcherSummary, ShipmentCard>[];
};

export type SyncState =
  | { status: "never_synced"; source: DataSource }
  | { status: "synced"; source: DataSource; lastSyncedAt: Date };

/** Board order: soonest pickup first, shipments without one last. `id` makes it total. */
const boardOrderBy = [
  { pickupAt: { sort: "asc", nulls: "last" } },
  { requestedAt: "asc" },
  { id: "asc" },
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

/** Open shipments plus those completed within the last `completedVisibleDays`. */
function boardWhere(filter: ShipmentFilter, now: Date): Prisma.ShipmentWhereInput {
  const completedSince = new Date(now.getTime() - completedVisibleDays * 24 * hourMs);

  return {
    dispatcherId: filter.dispatcherId,
    pickupAt: filter.pickupWithin24h
      ? { gte: now, lte: new Date(now.getTime() + 24 * hourMs) }
      : undefined,
    OR: [
      { status: { in: boardStatuses.filter((status) => status !== ShipmentStatus.COMPLETED) } },
      { status: ShipmentStatus.COMPLETED, statusChangedAt: { gte: completedSince } },
    ],
  };
}

function withAlerts<TShipment extends ShipmentCardRow>(shipment: TShipment, now: Date) {
  return { ...shipment, alerts: getShipmentAlerts(shipment, now) };
}

export async function findStatusBoard(filter: ShipmentFilter, now: Date): Promise<StatusBoard> {
  const shipments = await prisma.shipment.findMany({
    where: boardWhere(filter, now),
    select: shipmentCardSelect,
    orderBy: boardOrderBy,
  });

  return {
    generatedAt: now,
    columns: groupByStatus(shipments.map((shipment) => withAlerts(shipment, now))),
  };
}

export async function findDispatcherBoard(now: Date): Promise<DispatcherBoard> {
  const [dispatchers, shipments] = await Promise.all([
    findDispatchers(),
    prisma.shipment.findMany({
      where: boardWhere({ pickupWithin24h: false }, now),
      select: shipmentCardSelect,
      orderBy: boardOrderBy,
    }),
  ]);

  return {
    generatedAt: now,
    columns: groupByDispatcher(
      dispatchers,
      shipments.map((shipment) => withAlerts(shipment, now)),
    ),
  };
}

export async function listShipments(
  { pageIndex, pageSize, sorting, filter }: ShipmentPageInput,
  now: Date,
): Promise<PaginatedResult<ShipmentCard>> {
  const where = boardWhere(filter, now);
  const [sort] = sorting;
  const orderBy = sort
    ? [...sortableColumnOrderBy[sort.id](sort.desc ? "desc" : "asc"), { id: "asc" as const }]
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
    items: shipments.map((shipment) => withAlerts(shipment, now)),
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

  return shipment && withAlerts(shipment, now);
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
  });

  return externalSources.map((source): SyncState => {
    const sync = syncs.find((row) => row.source === source);
    return sync
      ? { status: "synced", source, lastSyncedAt: sync.lastSyncedAt }
      : { status: "never_synced", source };
  });
}
