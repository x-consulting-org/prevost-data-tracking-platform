import { ShipmentStatus } from "@/generated/prisma/enums";

/** Board column order. CANCELLED gets a column only when the filter asks for it, last. */
export const boardStatuses = [
  ShipmentStatus.UNHANDLED,
  ShipmentStatus.ORGANIZING,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.COMPLETED,
] as const satisfies readonly ShipmentStatus[];

/** The columns of a status board, with or without the cancelled shipments. */
export function boardStatusesFor({
  includeCancelled,
}: {
  includeCancelled: boolean;
}): readonly ShipmentStatus[] {
  return includeCancelled ? [...boardStatuses, ShipmentStatus.CANCELLED] : boardStatuses;
}

/** Completed and cancelled shipments stay on the boards for this many days after closing. */
export const closedVisibleDays = 7;

export const shipmentStatusLabel = {
  UNHANDLED: "Kezeletlen igény",
  ORGANIZING: "Szervezés alatt",
  IN_TRANSIT: "Úton",
  COMPLETED: "Teljesítve",
  CANCELLED: "Törölve",
} as const satisfies Record<ShipmentStatus, string>;
