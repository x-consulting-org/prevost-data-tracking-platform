import { ShipmentStatus } from "@/generated/prisma/enums";

/** Board column order. CANCELLED is not a column; it only shows in the table. */
export const boardStatuses = [
  ShipmentStatus.UNHANDLED,
  ShipmentStatus.ORGANIZING,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.COMPLETED,
] as const satisfies readonly ShipmentStatus[];

export type BoardStatus = (typeof boardStatuses)[number];

/** Completed shipments stay on the boards for this many days after completion. */
export const completedVisibleDays = 7;

export const shipmentStatusLabel = {
  UNHANDLED: "Kezeletlen igény",
  ORGANIZING: "Szervezés alatt",
  IN_TRANSIT: "Úton",
  COMPLETED: "Teljesítve",
  CANCELLED: "Törölve",
} as const satisfies Record<ShipmentStatus, string>;
