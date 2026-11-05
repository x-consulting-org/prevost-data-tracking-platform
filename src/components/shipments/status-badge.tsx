import type { ShipmentStatus } from "@/generated/prisma/enums";
import { shipmentStatusLabel } from "@/lib/shipments/status";

/**
 * The status palette (globals.css) as Tailwind classes, written out in full so Tailwind finds
 * them. Colour supports the label; the label always carries the status.
 */
export const statusStyle = {
  UNHANDLED: {
    solid: "bg-status-unhandled",
    tint: "bg-status-unhandled-tint",
    ink: "text-status-unhandled-ink",
  },
  ORGANIZING: {
    solid: "bg-status-organizing",
    tint: "bg-status-organizing-tint",
    ink: "text-status-organizing-ink",
  },
  IN_TRANSIT: {
    solid: "bg-status-in-transit",
    tint: "bg-status-in-transit-tint",
    ink: "text-status-in-transit-ink",
  },
  COMPLETED: {
    solid: "bg-status-completed",
    tint: "bg-status-completed-tint",
    ink: "text-status-completed-ink",
  },
  CANCELLED: {
    solid: "bg-status-cancelled",
    tint: "bg-status-cancelled-tint",
    ink: "text-status-cancelled-ink",
  },
} as const satisfies Record<ShipmentStatus, { solid: string; tint: string; ink: string }>;

export function StatusDot({ status }: { status: ShipmentStatus }) {
  return (
    <span
      aria-hidden="true"
      className={`size-2 shrink-0 rounded-full ${statusStyle[status].solid}`}
    />
  );
}

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const style = statusStyle[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${style.tint} ${style.ink}`}
    >
      <StatusDot status={status} />
      {shipmentStatusLabel[status]}
    </span>
  );
}
