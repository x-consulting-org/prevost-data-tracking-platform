import { ShipmentStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/format";
import { hourMs } from "@/lib/time";

/** Thresholds are placeholders until the operations workshop sets the real ones. */
export const unansweredRequestAfterHours = 2;
export const unplannedPickupWithinHours = 24;

export type ShipmentAlert =
  | { kind: "unanswered_request"; since: Date }
  | { kind: "pickup_soon_unplanned"; pickupAt: Date }
  | { kind: "delivery_overdue"; deliveryAt: Date }
  | { kind: "missing_schedule" };

export type AlertInput = {
  status: ShipmentStatus;
  requestedAt: Date;
  pickupAt: Date | null;
  deliveryAt: Date | null;
  tportTripId: string | null;
};

/** Conditions that need a dispatcher's attention right now (ADR 0003: derived, never stored). */
export function getShipmentAlerts(shipment: AlertInput, now: Date): ShipmentAlert[] {
  const alerts: ShipmentAlert[] = [];
  const nowMs = now.getTime();

  switch (shipment.status) {
    case ShipmentStatus.UNHANDLED:
      if (nowMs - shipment.requestedAt.getTime() >= unansweredRequestAfterHours * hourMs) {
        alerts.push({ kind: "unanswered_request", since: shipment.requestedAt });
      }
      break;
    case ShipmentStatus.ORGANIZING:
      if (shipment.pickupAt === null) {
        alerts.push({ kind: "missing_schedule" });
      } else if (
        shipment.tportTripId === null &&
        shipment.pickupAt.getTime() - nowMs <= unplannedPickupWithinHours * hourMs
      ) {
        alerts.push({ kind: "pickup_soon_unplanned", pickupAt: shipment.pickupAt });
      }
      break;
    case ShipmentStatus.IN_TRANSIT:
      if (shipment.pickupAt === null) {
        alerts.push({ kind: "missing_schedule" });
      }
      if (shipment.deliveryAt !== null && shipment.deliveryAt.getTime() < nowMs) {
        alerts.push({ kind: "delivery_overdue", deliveryAt: shipment.deliveryAt });
      }
      break;
    case ShipmentStatus.COMPLETED:
    case ShipmentStatus.CANCELLED:
      break;
    default:
      assertNever(shipment.status);
  }

  return alerts;
}

/** One sentence per alert, as the UI shows it. */
export function describeShipmentAlert(alert: ShipmentAlert): string {
  switch (alert.kind) {
    case "unanswered_request":
      return `Megválaszolatlan igény ${formatDateTime(alert.since)} óta`;
    case "pickup_soon_unplanned":
      return `Felrakás ${formatDateTime(alert.pickupAt)}, még nincs T-Port járat`;
    case "delivery_overdue":
      return `Lerakás határideje lejárt: ${formatDateTime(alert.deliveryAt)}`;
    case "missing_schedule":
      return "Nincs megadva felrakási időpont";
    default:
      return assertNever(alert);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}
