import { WarningAltFilled } from "@carbon/icons-react";
import { describeShipmentAlert, type ShipmentAlert } from "@/lib/shipments/alerts";

/** Carbon's warning icon in the attention red, with its inner mark drawn white. */
export function AttentionIcon({ className }: { className?: string }) {
  return (
    <WarningAltFilled
      size={16}
      aria-hidden="true"
      className={`shrink-0 fill-attention [&_[data-icon-path=inner-path]]:fill-white [&_[data-icon-path=inner-path]]:opacity-100 ${className ?? ""}`}
    />
  );
}

/** Alerts as sentences with the warning icon; never colour alone. */
export function AlertList({ alerts }: { alerts: readonly ShipmentAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1.5 rounded-lg bg-attention-tint px-2.5 py-2 text-sm text-attention-ink">
      {alerts.map((alert) => (
        <li key={alert.kind} className="flex items-start gap-2">
          <AttentionIcon className="mt-0.5" />
          <span>{describeShipmentAlert(alert)}</span>
        </li>
      ))}
    </ul>
  );
}

/** "3 figyelmet igényel" as a compact red pill. */
export function AttentionCount({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-attention-tint px-2 py-0.5 text-xs font-medium text-attention-ink tabular-nums">
      <AttentionIcon />
      {count}
      <span className="sr-only"> figyelmet igényel</span>
    </span>
  );
}
