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

/** Search params of the Fuvarok screen; parsed into the same filter the actions take. */
export const shipmentsSearchParamsSchema = z
  .object({
    view: z.enum(shipmentViews).default("kanban"),
    dispatcher: z.uuid().optional(),
    next24h: z.stringbool().default(false),
  })
  .transform(({ view, dispatcher, next24h }) => ({
    view,
    filter: { dispatcherId: dispatcher, pickupWithin24h: next24h } satisfies ShipmentFilter,
  }));
