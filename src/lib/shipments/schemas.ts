import { z } from "zod";
import { paginationInputSchema } from "@/lib/pagination";

export const shipmentFilterSchema = z.object({
  dispatcherId: z.uuid().optional(),
  /**
   * Only shipments whose pickup is between now and 24 hours from now. A pickup that is
   * already late is not "upcoming"; the alerts flag it instead.
   */
  pickupWithin24h: z.boolean().default(false),
  /** Also shipments cancelled within the last `closedVisibleDays`. */
  includeCancelled: z.boolean().default(false),
});

export type ShipmentFilter = z.infer<typeof shipmentFilterSchema>;

/** Table columns the server knows how to sort by. */
const sortableShipmentColumns = [
  "reference",
  "customer",
  "pickupAt",
  "deliveryAt",
  "status",
  "dispatcher",
] as const;

export type SortableShipmentColumn = (typeof sortableShipmentColumns)[number];

export const sortableShipmentColumnSchema = z.enum(sortableShipmentColumns);

export const shipmentPageInputSchema = paginationInputSchema.extend({
  sorting: z
    .array(z.object({ id: sortableShipmentColumnSchema, desc: z.boolean() }))
    .max(1)
    .default([]),
  filter: shipmentFilterSchema,
});

export type ShipmentPageInput = z.infer<typeof shipmentPageInputSchema>;

export const shipmentDetailInputSchema = z.object({ id: z.uuid() });

export const shipmentViews = ["kanban", "table"] as const;

export type ShipmentView = (typeof shipmentViews)[number];

/** The view a bare `/shipments` URL shows; it is left out of the URL. */
const defaultShipmentView: ShipmentView = "kanban";

// Each screen's URL is parsed by its schema and built by its href function, side by side,
// so the param names and defaults have one home (the round trip is tested).

/** The review by colleague (a card each) or by metric (everyone ranked on one metric). */
export const reviewViews = ["people", "metrics"] as const;

export type ReviewView = (typeof reviewViews)[number];

const defaultReviewView: ReviewView = "people";

/** What the Kollégák screen shows: the view, and in it the dispatcher to bring into view. */
export type DispatchersSearchParams = { view: ReviewView; dispatcherId: string | undefined };

export const dispatchersSearchParamsSchema = z
  .object({
    view: z.enum(reviewViews).default(defaultReviewView),
    dispatcher: z.uuid().optional(),
  })
  .transform(({ view, dispatcher }): DispatchersSearchParams => ({
    view,
    dispatcherId: dispatcher,
  }));

/** Defaults are left out, so the bare `/dispatchers` URL is the default screen. */
export function dispatchersHref({ view, dispatcherId }: DispatchersSearchParams): string {
  const params = new URLSearchParams();
  if (view !== defaultReviewView) params.set("view", view);
  if (dispatcherId !== undefined) params.set("dispatcher", dispatcherId);
  const query = params.toString();
  return query === "" ? "/dispatchers" : `/dispatchers?${query}`;
}

/** What the Fuvarok screen shows; its URL encodes exactly this. */
export type ShipmentsSearchParams = { view: ShipmentView; filter: ShipmentFilter };

/** Search params of the Fuvarok screen; parsed into the same filter the actions take. */
export const shipmentsSearchParamsSchema = z
  .object({
    view: z.enum(shipmentViews).default(defaultShipmentView),
    dispatcher: z.uuid().optional(),
    next24h: z.stringbool().default(false),
    cancelled: z.stringbool().default(false),
  })
  .transform(({ view, dispatcher, next24h, cancelled }): ShipmentsSearchParams => ({
    view,
    filter: {
      dispatcherId: dispatcher,
      pickupWithin24h: next24h,
      includeCancelled: cancelled,
    } satisfies ShipmentFilter,
  }));

/** Defaults are left out, so the bare `/shipments` URL is the default screen. */
export function shipmentsHref({ view, filter }: ShipmentsSearchParams): string {
  const params = new URLSearchParams();
  if (view !== defaultShipmentView) params.set("view", view);
  if (filter.dispatcherId !== undefined) params.set("dispatcher", filter.dispatcherId);
  if (filter.pickupWithin24h) params.set("next24h", "true");
  if (filter.includeCancelled) params.set("cancelled", "true");
  const query = params.toString();
  return query === "" ? "/shipments" : `/shipments?${query}`;
}
