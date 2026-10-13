import { AlertList, AttentionIcon } from "@/components/shipments/alert-list";
import { ShipmentStatus } from "@/generated/prisma/enums";
import { CountryCode } from "@/components/shipments/country-code";
import { DispatcherLink } from "@/components/shipments/dispatcher-link";
import { ShipmentReferenceButton } from "@/components/shipments/shipment-reference-button";
import { statusStyle } from "@/components/shipments/status-badge";
import { formatDateTime, formatDuration, formatRelative } from "@/lib/format";
import { reviewMetricText } from "@/lib/performance/review";
import {
  onTimeToleranceMs,
  unansweredAfterMs,
  type MetricSettings,
} from "@/lib/performance/settings";
import type { ShipmentAlert } from "@/lib/shipments/alerts";
import { isLate, stopTiming, type StopTiming } from "@/lib/shipments/milestones";
import { scheduleProgress } from "@/lib/shipments/progress";
import type { ShipmentCard as ShipmentCardData } from "@/server/shipments";

const stopLabel = {
  pickup: { planned: "Felrakás", done: "Felrakva" },
  delivery: { planned: "Lerakás", done: "Lerakva" },
} as const;

/** The plan, or what T-Port reported next to the plan. Lateness is written out and in red. */
function StopTime({
  stop,
  timing,
  now,
  toleranceMs,
}: {
  stop: keyof typeof stopLabel;
  timing: StopTiming;
  now: Date;
  toleranceMs: number;
}) {
  const label = stopLabel[stop];
  const name = <span className="font-medium text-text-secondary">{label.planned}</span>;

  switch (timing.kind) {
    case "unplanned":
      return <p className="text-xs text-text-helper">{name} nincs megadva</p>;
    case "upcoming":
      // Relative first, then the exact date, so "3 nap múlva" never has to be guessed.
      return (
        <p
          className="truncate text-xs tabular-nums"
          title={`Tervezett ${label.planned.toLocaleLowerCase("hu-HU")}: ${formatDateTime(timing.plannedAt)}`}
        >
          {name}{" "}
          <time dateTime={timing.plannedAt.toISOString()}>
            <span className="text-text-secondary">{formatRelative(timing.plannedAt, now)}</span>
            <span className="text-text-helper">, {formatDateTime(timing.plannedAt)}</span>
          </time>
        </p>
      );
    case "overdue":
      return (
        <p className="flex items-start gap-1 text-xs text-attention-ink tabular-nums">
          <AttentionIcon />
          <span>
            <span className="font-medium">{label.planned} késik</span>,{" "}
            {formatDuration(timing.overdueMs)} óta.{" "}
            <span className="text-text-secondary">
              Terv:{" "}
              <time dateTime={timing.plannedAt.toISOString()}>
                {formatDateTime(timing.plannedAt)}
              </time>
            </span>
          </span>
        </p>
      );
    case "done": {
      const late = isLate(timing.delayMs, toleranceMs);
      return (
        <p
          className="text-xs tabular-nums"
          title={
            timing.plannedAt === null
              ? undefined
              : `Terv: ${formatDateTime(timing.plannedAt)}, tény: ${formatDateTime(timing.actualAt)}`
          }
        >
          <span className="font-medium text-text-secondary">{label.done}</span>{" "}
          <time dateTime={timing.actualAt.toISOString()} className="text-text-secondary">
            {formatDateTime(timing.actualAt)}
          </time>
          {timing.delayMs === null ? null : late ? (
            <span className="font-medium text-attention-ink">
              , {formatDuration(timing.delayMs)} késéssel
            </span>
          ) : (
            <span className="text-text-helper">, terv szerint</span>
          )}
        </p>
      );
    }
  }
}

function Stop({
  stop,
  city,
  country,
  timing,
  now,
  toleranceMs,
}: {
  stop: keyof typeof stopLabel;
  city: string;
  country: string;
  timing: StopTiming;
  now: Date;
  toleranceMs: number;
}) {
  // The city gets the full width; the time below it is always named.
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-semibold" title={city}>
          {city}
        </span>
        <CountryCode code={country} />
      </p>
      <StopTime stop={stop} timing={timing} now={now} toleranceMs={toleranceMs} />
    </div>
  );
}

/**
 * The route: pickup above delivery, joined by a line. On the road, the line fills with the
 * share of the planned drive time that has passed.
 */
function Route({
  shipment,
  now,
  toleranceMs,
}: {
  shipment: ShipmentCardData;
  now: Date;
  toleranceMs: number;
}) {
  // Only a shipment on the road is somewhere between its pickup and its delivery.
  const progress = scheduleProgress(shipment.pickupAt, shipment.deliveryAt, now);
  const elapsedShare =
    shipment.status === ShipmentStatus.IN_TRANSIT && progress.kind === "planned"
      ? progress.elapsedShare
      : null;
  const dot = statusStyle[shipment.status].solid;

  // Two rows, a marker beside each stop. The line hangs from the pickup marker across the gap
  // down to the delivery marker, so it fits stops of any height.
  return (
    <div className="grid grid-cols-[0.625rem_minmax(0,1fr)] gap-x-2.5 gap-y-2.5 text-sm">
      <span aria-hidden="true" className="relative">
        <span className="absolute top-[0.6rem] -bottom-[1.225rem] left-[0.21rem] w-0.5 overflow-hidden rounded-full bg-border-subtle">
          {elapsedShare === null ? null : (
            <span
              className={`absolute inset-x-0 top-0 rounded-full ${dot}`}
              style={{ height: `${elapsedShare * 100}%` }}
            />
          )}
        </span>
        <span className={`absolute top-[0.4rem] left-0 size-2.5 rounded-full ${dot}`} />
      </span>
      <Stop
        stop="pickup"
        city={shipment.originCity}
        country={shipment.originCountry}
        timing={stopTiming(shipment.pickupAt, shipment.milestones.pickedUpAt, now, toleranceMs)}
        now={now}
        toleranceMs={toleranceMs}
      />
      <span aria-hidden="true" className="relative">
        <span className="absolute top-[0.4rem] left-0 size-2.5 rounded-full border-2 border-border-strong bg-layer" />
      </span>
      <Stop
        stop="delivery"
        city={shipment.destinationCity}
        country={shipment.destinationCountry}
        timing={stopTiming(shipment.deliveryAt, shipment.milestones.deliveredAt, now, toleranceMs)}
        now={now}
        toleranceMs={toleranceMs}
      />
      {elapsedShare === null ? null : (
        <p className="sr-only">A tervezett menetidő {Math.round(elapsedShare * 100)}%-a telt el.</p>
      )}
    </div>
  );
}

/** `slow` marks a value past the review's threshold; `running` a clock still ticking. */
type MetricLine = {
  id: "firstResponse" | "decision" | "idleAfterUnload";
  text: string;
  slow: boolean;
  running: boolean;
};

/**
 * This shipment's share of the colleague's review (src/lib/performance/review.ts): how long the
 * first reply and the T-Port trip took, and how soon the unloaded truck got its next load. A
 * clock still running reads "még nincs" (an empty truck "üresen") with the time so far; the
 * board refreshes it.
 */
function metricLines(
  shipment: ShipmentCardData,
  now: Date,
  settings: MetricSettings,
): MetricLine[] {
  const { status, requestedAt, milestones, turnaround } = shipment;
  const since = (from: Date, to: Date) => to.getTime() - from.getTime();
  const lines: MetricLine[] = [];

  if (milestones.firstResponseAt !== null) {
    const tookMs = since(requestedAt, milestones.firstResponseAt);
    lines.push({
      id: "firstResponse",
      text: formatDuration(tookMs),
      slow: tookMs >= unansweredAfterMs(settings),
      running: false,
    });
  } else if (status === ShipmentStatus.UNHANDLED) {
    const waitingMs = since(requestedAt, now);
    lines.push({
      id: "firstResponse",
      text: `még nincs, ${formatDuration(waitingMs)}`,
      slow: waitingMs >= unansweredAfterMs(settings),
      running: true,
    });
  }

  if (milestones.tripLinkedAt !== null) {
    lines.push({
      id: "decision",
      text: formatDuration(since(requestedAt, milestones.tripLinkedAt)),
      slow: false,
      running: false,
    });
  } else if (status === ShipmentStatus.ORGANIZING) {
    lines.push({
      id: "decision",
      text: `még nincs, ${formatDuration(since(requestedAt, now))}`,
      slow: false,
      running: true,
    });
  }

  switch (turnaround.kind) {
    case "reloaded":
      lines.push({
        id: "idleAfterUnload",
        text: formatDuration(since(turnaround.unloadedAt, turnaround.nextPickupAt)),
        slow: false,
        running: false,
      });
      break;
    case "waiting":
      lines.push({
        id: "idleAfterUnload",
        text: `üresen, ${formatDuration(since(turnaround.unloadedAt, now))}`,
        slow: false,
        running: true,
      });
      break;
    case "no_vehicle":
    case "not_unloaded":
      break;
  }

  return lines;
}

function MetricLines({ lines }: { lines: MetricLine[] }) {
  if (lines.length === 0) return null;

  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-lg bg-layer-sunken px-2.5 py-2 text-xs">
      {lines.map((line) => (
        <div key={line.id} className="contents">
          <dt className="text-text-secondary">{reviewMetricText[line.id].short}</dt>
          <dd
            className={`flex items-center justify-end gap-1 text-right font-medium tabular-nums ${line.slow ? "text-attention-ink" : "text-text-primary"}`}
          >
            {line.slow && line.running ? <AttentionIcon /> : null}
            {line.text}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Alerts the card already shows inline, with the same rule: the first-reply clock and the late
 * delivery line. The lane's attention count still includes them.
 */
const inlineAlertKinds = new Set<ShipmentAlert["kind"]>(["unanswered_request", "delivery_overdue"]);

export function ShipmentCard({
  shipment,
  now,
  settings,
}: {
  shipment: ShipmentCardData;
  now: Date;
  settings: MetricSettings;
}) {
  return (
    <article
      aria-label={shipment.reference}
      className="group relative flex flex-col gap-3 rounded-xl border border-border-subtle bg-layer p-3.5 transition-colors hover:border-border-strong"
    >
      <header className="flex items-baseline justify-between gap-3">
        <ShipmentReferenceButton shipment={shipment} stretched />
        <p className="truncate text-xs text-text-secondary">{shipment.customer.name}</p>
      </header>

      <Route shipment={shipment} now={now} toleranceMs={onTimeToleranceMs(settings)} />

      <MetricLines lines={metricLines(shipment, now, settings)} />

      <AlertList alerts={shipment.alerts.filter((alert) => !inlineAlertKinds.has(alert.kind))} />

      <footer className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
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
