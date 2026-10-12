import { z } from "zod";
import { paginationInputSchema } from "@/lib/pagination";

export const shipmentFilterSchema = z.object({
  dispatcherId: z.uuid().optional(),
  /** Only shipments whose pickup falls within the next 24 hours. */
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

export function isSortableShipmentColumn(id: string): id is SortableShipmentColumn {
  return (sortableShipmentColumns as readonly string[]).includes(id);
}

export const shipmentPageInputSchema = paginationInputSchema.extend({
  sorting: z
    .array(z.object({ id: z.enum(sortableShipmentColumns), desc: z.boolean() }))
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

/** Search params of the Kollégák screen: the dispatcher to bring into view. */
export const dispatchersSearchParamsSchema = z.object({ dispatcher: z.uuid().optional() });

/** Search params of the Fuvarok screen; parsed into the same filter the actions take. */
export const shipmentsSearchParamsSchema = z
  .object({
    view: z.enum(shipmentViews).default(defaultShipmentView),
    dispatcher: z.uuid().optional(),
    next24h: z.stringbool().default(false),
  })
  .transform(({ view, dispatcher, next24h }) => ({
    view,
    filter: { dispatcherId: dispatcher, pickupWithin24h: next24h } satisfies ShipmentFilter,
  }));
