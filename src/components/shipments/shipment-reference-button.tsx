"use client";

import { openShipmentDetail } from "@/components/shipments/shipment-detail-url";

/** The shipment's reference; activating it opens the shipment detail. */
export function ShipmentReferenceButton({
  shipment,
}: {
  shipment: { id: string; reference: string };
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      className="shrink-0 cursor-pointer font-mono text-sm text-link-primary hover:underline focus-visible:outline-2 focus-visible:outline-focus"
      onClick={() => openShipmentDetail(shipment.id)}
    >
      {shipment.reference}
    </button>
  );
}
