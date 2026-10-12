"use client";

import { Tag } from "@carbon/react";
import type { ShipmentStatus } from "@/generated/prisma/enums";
import { shipmentStatusLabel } from "@/lib/shipments/status";

type TagType = "gray" | "blue" | "teal" | "green" | "warm-gray";

/** Colour supports the label; the label always carries the status. */
export const statusTagType = {
  UNHANDLED: "gray",
  ORGANIZING: "blue",
  IN_TRANSIT: "teal",
  COMPLETED: "green",
  CANCELLED: "warm-gray",
} as const satisfies Record<ShipmentStatus, TagType>;

export function ShipmentStatusTag({ status }: { status: ShipmentStatus }) {
  return (
    <Tag type={statusTagType[status]} size="sm" className="m-0">
      {shipmentStatusLabel[status]}
    </Tag>
  );
}
