import { ShipmentStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/format";
import {
  onTimeToleranceMs,
  unansweredAfterMs,
  type MetricSettings,
} from "@/lib/performance/settings";
import { stopTiming } from "@/lib/shipments/milestones";
import { hourMs } from "@/lib/time";

/** Not a review metric, so not on the Mérőszámok page; a workshop placeholder. */
const unplannedPickupWithinHours = 24;

/** The settings the alerts read; the review and the cards use the same values. */
export type AlertSettings = Pick<
  MetricSettings,
  "unansweredAfterMinutes" | "onTimeToleranceMinutes"
>;

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
export function getShipmentAlerts(
  shipment: AlertInput,
  now: Date,
  settings: AlertSettings,
): ShipmentAlert[] {
  const alerts: ShipmentAlert[] = [];
  const nowMs = now.getTime();

  switch (shipment.status) {
    case ShipmentStatus.UNHANDLED:
      if (nowMs - shipment.requestedAt.getTime() >= unansweredAfterMs(settings)) {
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
      // Same rule as the card's delivery line: past plan by more than the on-time tolerance.
      if (
        shipment.deliveryAt !== null &&
        stopTiming(shipment.deliveryAt, null, now, onTimeToleranceMs(settings)).kind === "overdue"
      ) {
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
