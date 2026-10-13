import type { ShipmentStatus } from "@/generated/prisma/enums";
import type { ShipmentAlert } from "@/lib/shipments/alerts";
import { boardStatuses } from "@/lib/shipments/status";

type GroupableShipment = {
  status: ShipmentStatus;
  dispatcherId: string;
  alerts: readonly ShipmentAlert[];
};

export type StatusColumn<TShipment> = {
  status: ShipmentStatus;
  shipments: TShipment[];
  /** Shipments in this column with at least one alert. */
  attentionCount: number;
};

export type DispatcherColumn<TDispatcher, TShipment> = {
  dispatcher: TDispatcher;
  statusColumns: StatusColumn<TShipment>[];
  shipmentCount: number;
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

/** One column per dispatcher in the given order; a dispatcher without shipments keeps an empty column. */
export function groupByDispatcher<
  TDispatcher extends { id: string },
  TShipment extends GroupableShipment,
>(
  dispatchers: readonly TDispatcher[],
  shipments: readonly TShipment[],
): DispatcherColumn<TDispatcher, TShipment>[] {
  return dispatchers.map((dispatcher) => {
    const statusColumns = groupByStatus(
      shipments.filter((shipment) => shipment.dispatcherId === dispatcher.id),
      boardStatuses,
    );
    return {
      dispatcher,
      statusColumns,
      shipmentCount: statusColumns.reduce((sum, column) => sum + column.shipments.length, 0),
      attentionCount: statusColumns.reduce((sum, column) => sum + column.attentionCount, 0),
    };
  });
}
