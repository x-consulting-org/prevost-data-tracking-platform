import type { ShipmentStatus } from "@/generated/prisma/enums";
import type { ShipmentAlert } from "@/lib/shipments/alerts";

type GroupableShipment = {
  status: ShipmentStatus;
  alerts: readonly ShipmentAlert[];
};

export type StatusColumn<TShipment> = {
  status: ShipmentStatus;
  shipments: TShipment[];
  /** Shipments in this column with at least one alert. */
  attentionCount: number;
};

/**
 * One column per status in `statuses`, in that order, keeping the input order inside each
 * column. Shipments whose status is not among them belong to no column.
 */
export function groupByStatus<TShipment extends GroupableShipment>(
  shipments: readonly TShipment[],
  statuses: readonly ShipmentStatus[],
): StatusColumn<TShipment>[] {
  return statuses.map((status) => {
    const inColumn = shipments.filter((shipment) => shipment.status === status);
    return {
      status,
      shipments: inColumn,
      attentionCount: inColumn.filter((shipment) => shipment.alerts.length > 0).length,
    };
  });
}
