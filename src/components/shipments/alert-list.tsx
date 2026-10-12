"use client";

import { WarningAltFilled } from "@carbon/icons-react";
import { describeShipmentAlert, type ShipmentAlert } from "@/lib/shipments/alerts";

/** Carbon's warning icon with its inner mark drawn, as in Carbon notifications. */
export function AttentionIcon({ className }: { className?: string }) {
  return (
    <WarningAltFilled
      size={16}
      aria-hidden="true"
      className={`shrink-0 fill-support-warning [&_[data-icon-path=inner-path]]:fill-black [&_[data-icon-path=inner-path]]:opacity-100 ${className ?? ""}`}
    />
  );
}

/** Alerts as sentences with the warning icon; never colour alone. */
export function AlertList({ alerts }: { alerts: readonly ShipmentAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1 text-sm">
      {alerts.map((alert) => (
        <li key={alert.kind} className="flex items-start gap-2">
          <AttentionIcon className="mt-px" />
          <span>{describeShipmentAlert(alert)}</span>
        </li>
      ))}
    </ul>
  );
}
