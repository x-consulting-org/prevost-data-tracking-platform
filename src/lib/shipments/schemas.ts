import { z } from "zod";
import { paginationInputSchema } from "@/lib/pagination";

export const shipmentFilterSchema = z.object({
  dispatcherId: z.uuid().optional(),
  /**
   * Only shipments whose pickup is between now and 24 hours from now. A pickup that is
   * already late is not "upcoming"; the alerts flag it instead.
   */
  pickupWithin24h: z.boolean().default(false),
});

export type ShipmentFilter = z.infer<typeof shipmentFilterSchema>;

/** Table columns the server knows how to sort by. */
export const sortableShipmentColumns = [
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
export const defaultShipmentView: ShipmentView = "kanban";

// Each screen's URL is parsed by its schema and built by its href function, side by side,
// so the param names and defaults have one home (the round trip is tested).

/** Search params of the Kollégák screen: the dispatcher to bring into view. */
export const dispatchersSearchParamsSchema = z.object({ dispatcher: z.uuid().optional() });

export function dispatchersHref(dispatcherId: string): string {
  return `/dispatchers?${new URLSearchParams({ dispatcher: dispatcherId }).toString()}`;
}

/** What the Fuvarok screen shows; its URL encodes exactly this. */
export type ShipmentsSearchParams = { view: ShipmentView; filter: ShipmentFilter };

/** Search params of the Fuvarok screen; parsed into the same filter the actions take. */
export const shipmentsSearchParamsSchema = z
  .object({
    view: z.enum(shipmentViews).default(defaultShipmentView),
    dispatcher: z.uuid().optional(),
    next24h: z.stringbool().default(false),
  })
  .transform(({ view, dispatcher, next24h }): ShipmentsSearchParams => ({
    view,
    filter: { dispatcherId: dispatcher, pickupWithin24h: next24h } satisfies ShipmentFilter,
  }));

/** Defaults are left out, so the bare `/shipments` URL is the default screen. */
export function shipmentsHref({ view, filter }: ShipmentsSearchParams): string {
  const params = new URLSearchParams();
  if (view !== defaultShipmentView) params.set("view", view);
  if (filter.dispatcherId !== undefined) params.set("dispatcher", filter.dispatcherId);
  if (filter.pickupWithin24h) params.set("next24h", "true");
  const query = params.toString();
  return query === "" ? "/shipments" : `/shipments?${query}`;
}
