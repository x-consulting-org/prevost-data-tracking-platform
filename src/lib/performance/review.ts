import { ShipmentStatus } from "@/generated/prisma/enums";
import {
  getShipmentAlerts,
  unansweredRequestAfterHours,
  type AlertInput,
} from "@/lib/shipments/alerts";
import { dayMs } from "@/lib/time";

/** The review looks back this many days from `now`. */
export const reviewWindowDays = 30;

/**
 * Thresholds are placeholders until the operations workshop sets the real ones. A value within
 * `onParTolerance` of the team value is on par; a median needs `minMedianSample` cases and a
 * share `minShareSample`, below that the metric says there is too little data.
 */
export const onParTolerance = 0.15;
export const minMedianSample = 3;
export const minShareSample = 5;
/** A shipment counts as repeatedly changed from this many schedule or detail changes. */
export const repeatedChangeCount = 2;

/** The review's metrics, in display order. For every one of them lower is better. */
export const reviewMetricIds = [
  "idleAfterUnload",
  "firstResponse",
  "decision",
  "unanswered",
  "repeatedChanges",
] as const;

export type ReviewMetricId = (typeof reviewMetricIds)[number];

/** How a metric's number reads: a duration in ms, a share between 0 and 1, or a count. */
export type ReviewMetricUnit = "duration" | "share" | "count";

export const reviewMetricUnit = {
  idleAfterUnload: "duration",
  firstResponse: "duration",
  decision: "duration",
  unanswered: "count",
  repeatedChanges: "share",
} as const satisfies Record<ReviewMetricId, ReviewMetricUnit>;

export type Verdict = "strength" | "on_par" | "needs_work";

export type MetricValue =
  | { kind: "measured"; value: number; sampleSize: number }
  | { kind: "insufficient_data"; sampleSize: number };

export type DispatcherMetric =
  | { kind: "measured"; value: number; sampleSize: number; verdict: Verdict }
  | { kind: "insufficient_data"; sampleSize: number };

export type ReviewShipment = AlertInput & {
  id: string;
  dispatcherId: string;
  vehicleId: string | null;
  /** The first RESPONSE_SENT event; null while the customer got no reply. */
  firstResponseAt: Date | null;
  /** The TRIP_LINKED event; null while no T-Port trip is linked. */
  tripLinkedAt: Date | null;
  /** SCHEDULE_CHANGED and DETAILS_CHANGED events. */
  changeCount: number;
};

export type DispatcherReview<TDispatcher> = {
  dispatcher: TDispatcher;
  /** Shipments not completed or cancelled, to link to the Fuvarok screen. */
  openShipmentCount: number;
  metrics: Record<ReviewMetricId, DispatcherMetric>;
};

export type PerformanceReview<TDispatcher> = {
  windowStart: Date;
  team: Record<ReviewMetricId, MetricValue>;
  dispatchers: DispatcherReview<TDispatcher>[];
};

/** One dispatcher's raw observations per metric, before they become a number. */
type Observations = {
  idleAfterUnload: number[];
  firstResponse: number[];
  decision: number[];
  /** One boolean per shipment requested in the window: changed repeatedly or not. */
  repeatedChanges: boolean[];
  unanswered: number;
};

function median(values: readonly number[]): number {
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function medianOf(values: readonly number[]): MetricValue {
  return values.length < minMedianSample
    ? { kind: "insufficient_data", sampleSize: values.length }
    : { kind: "measured", value: median(values), sampleSize: values.length };
}

function shareOf(flags: readonly boolean[]): MetricValue {
  return flags.length < minShareSample
    ? { kind: "insufficient_data", sampleSize: flags.length }
    : {
        kind: "measured",
        value: flags.filter(Boolean).length / flags.length,
        sampleSize: flags.length,
      };
}

/** Lower is better for every metric, so a value well below the team's is a strength. */
export function verdictFor(value: number, team: number): Verdict {
  if (team === 0) return value === 0 ? "on_par" : "needs_work";
  const ratio = value / team;
  if (ratio <= 1 - onParTolerance) return "strength";
  if (ratio >= 1 + onParTolerance) return "needs_work";
  return "on_par";
}

/**
 * The time from an unload to the same vehicle's next pickup. An unload with no later pickup
 * yet is left out: the truck may still be waiting, so there is no gap to measure.
 */
function idleGaps(shipments: readonly ReviewShipment[], windowStart: Date, now: Date) {
  const nextPickups = new Map<string, number[]>();
  for (const shipment of shipments) {
    if (
      shipment.vehicleId === null ||
      shipment.pickupAt === null ||
      shipment.status === ShipmentStatus.CANCELLED
    ) {
      continue;
    }
    const pickups = nextPickups.get(shipment.vehicleId) ?? [];
    pickups.push(shipment.pickupAt.getTime());
    nextPickups.set(shipment.vehicleId, pickups);
  }

  const gaps: { dispatcherId: string; gapMs: number }[] = [];
  for (const shipment of shipments) {
    if (
      shipment.status !== ShipmentStatus.COMPLETED ||
      shipment.vehicleId === null ||
      shipment.deliveryAt === null ||
      shipment.deliveryAt < windowStart ||
      shipment.deliveryAt > now
    ) {
      continue;
    }
    const unloadMs = shipment.deliveryAt.getTime();
    const later = (nextPickups.get(shipment.vehicleId) ?? []).filter(
      (pickupMs) => pickupMs >= unloadMs,
    );
    if (later.length > 0) {
      gaps.push({ dispatcherId: shipment.dispatcherId, gapMs: Math.min(...later) - unloadMs });
    }
  }
  return gaps;
}

function emptyObservations(): Observations {
  return {
    idleAfterUnload: [],
    firstResponse: [],
    decision: [],
    repeatedChanges: [],
    unanswered: 0,
  };
}

/** Adds every shipment's observations to its dispatcher's; unknown dispatchers are skipped. */
function observe(
  byDispatcher: ReadonlyMap<string, Observations>,
  shipments: readonly ReviewShipment[],
  windowStart: Date,
  now: Date,
) {
  for (const { dispatcherId, gapMs } of idleGaps(shipments, windowStart, now)) {
    byDispatcher.get(dispatcherId)?.idleAfterUnload.push(gapMs);
  }

  for (const shipment of shipments) {
    const observations = byDispatcher.get(shipment.dispatcherId);
    if (observations === undefined) continue;

    if (getShipmentAlerts(shipment, now).some((alert) => alert.kind === "unanswered_request")) {
      observations.unanswered += 1;
    }

    if (shipment.requestedAt < windowStart || shipment.requestedAt > now) continue;
    const requestedMs = shipment.requestedAt.getTime();
    if (shipment.firstResponseAt !== null) {
      observations.firstResponse.push(shipment.firstResponseAt.getTime() - requestedMs);
    }
    if (shipment.tripLinkedAt !== null) {
      observations.decision.push(shipment.tripLinkedAt.getTime() - requestedMs);
    }
    if (shipment.status !== ShipmentStatus.CANCELLED) {
      observations.repeatedChanges.push(shipment.changeCount >= repeatedChangeCount);
    }
  }
}

/** The unanswered count has no sample beyond itself: its `sampleSize` is the count. */
function valuesOf(observations: Observations): Record<ReviewMetricId, MetricValue> {
  return {
    idleAfterUnload: medianOf(observations.idleAfterUnload),
    firstResponse: medianOf(observations.firstResponse),
    decision: medianOf(observations.decision),
    unanswered: {
      kind: "measured",
      value: observations.unanswered,
      sampleSize: observations.unanswered,
    },
    repeatedChanges: shareOf(observations.repeatedChanges),
  };
}

function compare(own: MetricValue, team: MetricValue): DispatcherMetric {
  return own.kind === "measured" && team.kind === "measured"
    ? { ...own, verdict: verdictFor(own.value, team.value) }
    : { kind: "insufficient_data", sampleSize: own.sampleSize };
}

/**
 * Each dispatcher's metrics over the last `reviewWindowDays`, next to the team's. The team
 * value pools every dispatcher's cases (a median of all gaps, not a median of medians); for
 * the unanswered count it is the average per dispatcher. Derived on every read (ADR 0006).
 */
export function buildPerformanceReview<TDispatcher extends { id: string }>(
  dispatchers: readonly TDispatcher[],
  shipments: readonly ReviewShipment[],
  now: Date,
): PerformanceReview<TDispatcher> {
  const windowStart = new Date(now.getTime() - reviewWindowDays * dayMs);
  const rows = dispatchers.map((dispatcher) => ({
    dispatcher,
    observations: emptyObservations(),
  }));
  observe(
    new Map(rows.map((row) => [row.dispatcher.id, row.observations])),
    shipments,
    windowStart,
    now,
  );

  const all = rows.map((row) => row.observations);
  const unansweredTotal = all.reduce((sum, o) => sum + o.unanswered, 0);
  const team: Record<ReviewMetricId, MetricValue> = {
    ...valuesOf({
      idleAfterUnload: all.flatMap((o) => o.idleAfterUnload),
      firstResponse: all.flatMap((o) => o.firstResponse),
      decision: all.flatMap((o) => o.decision),
      repeatedChanges: all.flatMap((o) => o.repeatedChanges),
      unanswered: 0,
    }),
    unanswered:
      rows.length === 0
        ? { kind: "insufficient_data", sampleSize: 0 }
        : { kind: "measured", value: unansweredTotal / rows.length, sampleSize: unansweredTotal },
  };

  return {
    windowStart,
    team,
    dispatchers: rows.map(({ dispatcher, observations }) => {
      const own = valuesOf(observations);
      return {
        dispatcher,
        openShipmentCount: shipments.filter(
          (shipment) =>
            shipment.dispatcherId === dispatcher.id &&
            shipment.status !== ShipmentStatus.COMPLETED &&
            shipment.status !== ShipmentStatus.CANCELLED,
        ).length,
        metrics: {
          idleAfterUnload: compare(own.idleAfterUnload, team.idleAfterUnload),
          firstResponse: compare(own.firstResponse, team.firstResponse),
          decision: compare(own.decision, team.decision),
          unanswered: compare(own.unanswered, team.unanswered),
          repeatedChanges: compare(own.repeatedChanges, team.repeatedChanges),
        },
      };
    }),
  };
}

/**
 * What each metric is called and how it is counted, as the UI shows it. `sample` names the
 * cases a number is based on ("14 lerakás alapján"); the unanswered count is its own sample.
 */
export const reviewMetricText = {
  idleAfterUnload: {
    label: "Leürült kamion következő felrakásáig",
    definition:
      "Egy lerakástól ugyanannak a kamionnak a következő felrakásáig eltelt idő mediánja. Az a lerakás, amely után még nincs új felrakás, nem számít bele.",
    sample: "lerakás",
  },
  firstResponse: {
    label: "Első érdemi válaszig",
    definition: "Az igény beérkezésétől a megbízónak küldött első válaszig eltelt idő mediánja.",
    sample: "igény",
  },
  decision: {
    label: "Döntésig",
    definition:
      "Az igény beérkezésétől a T-Port járat hozzárendeléséig eltelt idő mediánja: ekkor dől el, melyik kamion viszi.",
    sample: "igény",
  },
  unanswered: {
    label: "Válasz nélkül maradt igények",
    definition: `A most nyitott igények, amelyekre ${unansweredRequestAfterHours} órán belül nem ment válasz. A csapatérték a kollégánkénti átlag.`,
    sample: null,
  },
  repeatedChanges: {
    label: "Többször módosított fuvarok",
    definition: `Azoknak a fuvaroknak az aránya, amelyeken legalább ${repeatedChangeCount}-szer módosult az időpont vagy egy adat, bárki kérte is.`,
    sample: "fuvar",
  },
} as const satisfies Record<
  ReviewMetricId,
  { label: string; definition: string; sample: string | null }
>;

export const verdictLabel = {
  strength: "Erősség",
  on_par: "Csapatszinten",
  needs_work: "Fejlesztendő",
} as const satisfies Record<Verdict, string>;
