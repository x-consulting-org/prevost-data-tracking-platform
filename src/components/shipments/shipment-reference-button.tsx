"use client";

import { openShipmentDetail } from "@/components/shipments/shipment-detail-url";

// The card's corner radius (rounded-xl); the focus ring is drawn around the whole card. z-1 lifts
// it over positioned card content (the route); links stay above it with `relative z-10`.
const stretchedClassName =
  "after:absolute after:inset-0 after:z-1 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-focus";

/**
 * The shipment's reference; activating it opens the shipment detail. `stretched` makes its hit
 * area cover the nearest positioned ancestor, so a whole card opens the detail while links
 * inside it (raised with `relative z-10`) keep working.
 */
export function ShipmentReferenceButton({
  shipment,
  stretched = false,
}: {
  shipment: { id: string; reference: string };
  stretched?: boolean;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      className={`shrink-0 cursor-pointer text-sm font-semibold text-text-primary tabular-nums hover:text-link-primary ${stretched ? stretchedClassName : "focus-visible:outline-2 focus-visible:outline-focus"}`}
      onClick={(event) => openShipmentDetail(shipment.id, event.currentTarget)}
    >
      {shipment.reference}
    </button>
  );
}
