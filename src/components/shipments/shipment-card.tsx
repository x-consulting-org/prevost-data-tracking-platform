"use client";

import { AlertList } from "@/components/shipments/alert-list";
import { DispatcherTag } from "@/components/shipments/dispatcher-tag";
import { ShipmentReferenceButton } from "@/components/shipments/shipment-reference-button";
import { formatDateTime, formatRelative } from "@/lib/format";
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
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3">
      <p className="truncate font-semibold">
        <span className="sr-only">{label}: </span>
        {city} <span className="font-normal text-text-secondary">{country}</span>
      </p>
      {at === null ? (
        <p className="text-xs text-text-helper">{label}: nincs megadva</p>
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

export function ShipmentCard({ shipment, now }: { shipment: ShipmentCardData; now: Date }) {
  return (
    <article className="flex flex-col gap-3 bg-layer p-4" aria-label={shipment.reference}>
      <header className="flex items-baseline justify-between gap-3">
        <ShipmentReferenceButton shipment={shipment} />
        <p className="truncate text-xs text-text-secondary">{shipment.customer.name}</p>
      </header>

      {/* The route: pickup above delivery, joined by a line. */}
      <div className="relative flex flex-col gap-3 pl-5 text-sm">
        <span
          aria-hidden="true"
          className="absolute top-[0.45rem] bottom-[0.45rem] left-[0.2rem] w-px bg-border-strong"
        />
        <span
          aria-hidden="true"
          className="absolute top-[0.3rem] left-0 size-[0.45rem] rounded-full bg-text-primary"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-[0.3rem] left-0 size-[0.45rem] rounded-full border border-text-primary bg-layer"
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
      </div>

      <p className="text-xs text-text-secondary">
        {shipment.tportTripId === null ? (
          "Nincs T-Port járat"
        ) : (
          <>
            T-Port járat:{" "}
            <span className="font-mono text-text-primary">{shipment.tportTripId}</span>
          </>
        )}
      </p>

      <AlertList alerts={shipment.alerts} />

      <DispatcherTag dispatcher={shipment.dispatcher} />
    </article>
  );
}
