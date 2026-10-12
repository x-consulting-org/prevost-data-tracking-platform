import { AlertList } from "@/components/shipments/alert-list";
import { CountryCode } from "@/components/shipments/country-code";
import { DispatcherLink } from "@/components/shipments/dispatcher-link";
import { ShipmentReferenceButton } from "@/components/shipments/shipment-reference-button";
import { statusStyle } from "@/components/shipments/status-badge";
import { formatDateTime, formatRelative } from "@/lib/format";
import { scheduleProgress } from "@/lib/shipments/progress";
import type { ShipmentCard as ShipmentCardData } from "@/server/shipments";

function Stop({
  label,
  city,
  country,
  at,
  now,
}: {
  label: string;
  city: string;
  country: string;
  at: Date | null;
  now: Date;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
      <p className="flex min-w-0 items-center gap-1.5">
        <span className="sr-only">{label}: </span>
        <span className="truncate font-semibold" title={city}>
          {city}
        </span>
        <CountryCode code={country} />
      </p>
      {at === null ? (
        <p className="text-xs text-text-helper">nincs időpont</p>
      ) : (
        <p className="text-xs text-text-secondary tabular-nums">
          <time dateTime={at.toISOString()} title={formatDateTime(at)}>
            {formatRelative(at, now)}
          </time>
        </p>
      )}
    </div>
  );
}

/**
 * The route: pickup above delivery, joined by a line. On the road, the line fills with the
 * share of the planned drive time that has passed.
 */
function Route({ shipment, now }: { shipment: ShipmentCardData; now: Date }) {
  // Only a shipment on the road is somewhere between its pickup and its delivery.
  const progress = scheduleProgress(shipment.pickupAt, shipment.deliveryAt, now);
  const elapsedShare =
    shipment.status === "IN_TRANSIT" && progress.kind === "planned" ? progress.elapsedShare : null;
  const dot = statusStyle[shipment.status].solid;

  return (
    <div className="relative flex flex-col gap-2.5 pl-5 text-sm">
      <span
        aria-hidden="true"
        className="absolute top-[0.6rem] bottom-[0.6rem] left-[0.21rem] w-0.5 overflow-hidden rounded-full bg-border-subtle"
      >
        {elapsedShare === null ? null : (
          <span
            className={`absolute inset-x-0 top-0 rounded-full ${dot}`}
            style={{ height: `${elapsedShare * 100}%` }}
          />
        )}
      </span>
      <span
        aria-hidden="true"
        className={`absolute top-[0.4rem] left-0 size-2.5 rounded-full ${dot}`}
      />
      <span
        aria-hidden="true"
        className="absolute bottom-[0.4rem] left-0 size-2.5 rounded-full border-2 border-border-strong bg-layer"
      />
      <Stop
        label="Felrakás"
        city={shipment.originCity}
        country={shipment.originCountry}
        at={shipment.pickupAt}
        now={now}
      />
      <Stop
        label="Lerakás"
        city={shipment.destinationCity}
        country={shipment.destinationCountry}
        at={shipment.deliveryAt}
        now={now}
      />
      {elapsedShare === null ? null : (
        <p className="sr-only">A tervezett menetidő {Math.round(elapsedShare * 100)}%-a telt el.</p>
      )}
    </div>
  );
}

export function ShipmentCard({ shipment, now }: { shipment: ShipmentCardData; now: Date }) {
  return (
    <article
      aria-label={shipment.reference}
      className="group relative flex flex-col gap-3 rounded-xl border border-border-subtle bg-layer p-3.5 transition-[box-shadow,border-color,translate] duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_6px_20px_-8px_rgb(21_26_36/0.25)]"
    >
      <header className="flex items-baseline justify-between gap-3">
        <ShipmentReferenceButton shipment={shipment} stretched />
        <p className="truncate text-xs text-text-secondary">{shipment.customer.name}</p>
      </header>

      <Route shipment={shipment} now={now} />

      <AlertList alerts={shipment.alerts} />

      <footer className="flex items-center justify-between gap-3">
        <DispatcherLink dispatcher={shipment.dispatcher} className="relative z-10 -ml-0.5" />
        <p className="shrink-0 text-xs text-text-helper tabular-nums">
          {shipment.tportTripId === null ? (
            "Nincs T-Port járat"
          ) : (
            <>
              <span className="sr-only">T-Port járat: </span>
              {shipment.tportTripId}
            </>
          )}
        </p>
      </footer>
    </article>
  );
}
