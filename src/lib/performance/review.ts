import { ShipmentStatus } from "@/generated/prisma/enums";
import type { MetricSettings } from "@/lib/performance/settings";
import { getShipmentAlerts, type AlertInput } from "@/lib/shipments/alerts";
import {
  pickupsByVehicle,
  truckTurnaround,
  type ShipmentMilestones,
} from "@/lib/shipments/milestones";
import { dayMs } from "@/lib/time";

export function reviewWindowStart(
  now: Date,
  { reviewWindowDays }: Pick<MetricSettings, "reviewWindowDays">,
) {
  return new Date(now.getTime() - reviewWindowDays * dayMs);
}

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
type ReviewMetricUnit = "duration" | "share" | "count";

export const reviewMetricUnit = {
  idleAfterUnload: "duration",
  firstResponse: "duration",
  decision: "duration",
  unanswered: "count",
  repeatedChanges: "share",
} as const satisfies Record<ReviewMetricId, ReviewMetricUnit>;

export const verdicts = ["strength", "on_par", "needs_work"] as const;

export type Verdict = (typeof verdicts)[number];

export type MetricValue =
  | { kind: "measured"; value: number; sampleSize: number }
  | { kind: "insufficient_data"; sampleSize: number };

export type DispatcherMetric =
  | { kind: "measured"; value: number; sampleSize: number; verdict: Verdict }
  | { kind: "insufficient_data"; sampleSize: number };

export type ReviewShipment = AlertInput &
  ShipmentMilestones & {
    id: string;
    dispatcherId: string;
    vehicleId: string | null;
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
  /** The rules this review was computed with. */
  settings: MetricSettings;
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

function medianOf(values: readonly number[], settings: MetricSettings): MetricValue {
  return values.length < settings.minMedianSample
    ? { kind: "insufficient_data", sampleSize: values.length }
    : { kind: "measured", value: median(values), sampleSize: values.length };
}

function shareOf(flags: readonly boolean[], settings: MetricSettings): MetricValue {
  return flags.length < settings.minShareSample
    ? { kind: "insufficient_data", sampleSize: flags.length }
    : {
        kind: "measured",
        value: flags.filter(Boolean).length / flags.length,
        sampleSize: flags.length,
      };
}

/**
 * Lower is better for every metric, so a value well below the team's is a strength. Within
 * `onParTolerancePercent` of the team value either way is on par.
 */
export function verdictFor(
  value: number,
  team: number,
  { onParTolerancePercent }: Pick<MetricSettings, "onParTolerancePercent">,
): Verdict {
  if (team === 0) return value === 0 ? "on_par" : "needs_work";
  const ratio = value / team;
  const tolerance = onParTolerancePercent / 100;
  if (ratio <= 1 - tolerance) return "strength";
  if (ratio >= 1 + tolerance) return "needs_work";
  return "on_par";
}

/**
 * The time from an actual unload to the same vehicle's next actual pickup (`truckTurnaround`).
 * An unload with no later pickup yet is left out: the truck may still be waiting, so there is
 * no gap to measure.
 */
function idleGaps(shipments: readonly ReviewShipment[], windowStart: Date, now: Date) {
  const pickups = pickupsByVehicle(shipments);
  return shipments.flatMap((shipment) => {
    const turnaround = truckTurnaround(shipment.deliveredAt, shipment.vehicleId, pickups);
    return turnaround.kind === "reloaded" &&
      turnaround.unloadedAt >= windowStart &&
      turnaround.unloadedAt <= now
      ? [
          {
            dispatcherId: shipment.dispatcherId,
            gapMs: turnaround.nextPickupAt.getTime() - turnaround.unloadedAt.getTime(),
          },
        ]
      : [];
  });
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
  settings: MetricSettings,
) {
  for (const { dispatcherId, gapMs } of idleGaps(shipments, windowStart, now)) {
    byDispatcher.get(dispatcherId)?.idleAfterUnload.push(gapMs);
  }

  for (const shipment of shipments) {
    const observations = byDispatcher.get(shipment.dispatcherId);
    if (observations === undefined) continue;

    if (
      getShipmentAlerts(shipment, now, settings).some(
        (alert) => alert.kind === "unanswered_request",
      )
    ) {
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
      observations.repeatedChanges.push(shipment.changeCount >= settings.repeatedChangeCount);
    }
  }
}

/** The unanswered count has no sample beyond itself: its `sampleSize` is the count. */
function ownValues(
  observations: Observations,
  settings: MetricSettings,
): Record<ReviewMetricId, MetricValue> {
  return {
    idleAfterUnload: medianOf(observations.idleAfterUnload, settings),
    firstResponse: medianOf(observations.firstResponse, settings),
    decision: medianOf(observations.decision, settings),
    unanswered: {
      kind: "measured",
      value: observations.unanswered,
      sampleSize: observations.unanswered,
    },
    repeatedChanges: shareOf(observations.repeatedChanges, settings),
  };
}

function compare(own: MetricValue, team: MetricValue, settings: MetricSettings): DispatcherMetric {
  return own.kind === "measured" && team.kind === "measured"
    ? { ...own, verdict: verdictFor(own.value, team.value, settings) }
    : { kind: "insufficient_data", sampleSize: own.sampleSize };
}

/**
 * Each dispatcher's metrics over the last `reviewWindowDays` (settings), next to the team's. The team
 * value pools every dispatcher's cases (a median of all gaps, not a median of medians); for
 * the unanswered count it is the average per dispatcher. Derived on every read (ADR 0006).
 */
export function buildPerformanceReview<TDispatcher extends { id: string }>(
  dispatchers: readonly TDispatcher[],
  shipments: readonly ReviewShipment[],
  now: Date,
  settings: MetricSettings,
): PerformanceReview<TDispatcher> {
  const windowStart = reviewWindowStart(now, settings);
  const rows = dispatchers.map((dispatcher) => ({
    dispatcher,
    observations: emptyObservations(),
  }));
  observe(
    new Map(rows.map((row) => [row.dispatcher.id, row.observations])),
    shipments,
    windowStart,
    now,
    settings,
  );

  const all = rows.map((row) => row.observations);
  const unansweredTotal = all.reduce((sum, o) => sum + o.unanswered, 0);
  const team: Record<ReviewMetricId, MetricValue> = {
    idleAfterUnload: medianOf(
      all.flatMap((o) => o.idleAfterUnload),
      settings,
    ),
    firstResponse: medianOf(
      all.flatMap((o) => o.firstResponse),
      settings,
    ),
    decision: medianOf(
      all.flatMap((o) => o.decision),
      settings,
    ),
    unanswered:
      rows.length === 0
        ? { kind: "insufficient_data", sampleSize: 0 }
        : { kind: "measured", value: unansweredTotal / rows.length, sampleSize: unansweredTotal },
    repeatedChanges: shareOf(
      all.flatMap((o) => o.repeatedChanges),
      settings,
    ),
  };

  return {
    settings,
    team,
    dispatchers: rows.map(({ dispatcher, observations }) => {
      const own = ownValues(observations, settings);
      return {
        dispatcher,
        openShipmentCount: shipments.filter(
          (shipment) =>
            shipment.dispatcherId === dispatcher.id &&
            shipment.status !== ShipmentStatus.COMPLETED &&
            shipment.status !== ShipmentStatus.CANCELLED,
        ).length,
        metrics: {
          idleAfterUnload: compare(own.idleAfterUnload, team.idleAfterUnload, settings),
          firstResponse: compare(own.firstResponse, team.firstResponse, settings),
          decision: compare(own.decision, team.decision, settings),
          unanswered: compare(own.unanswered, team.unanswered, settings),
          repeatedChanges: compare(own.repeatedChanges, team.repeatedChanges, settings),
        },
      };
    }),
  };
}

/**
 * What each metric is called and how it is counted, as the UI shows it. `sample` names the
 * cases a number is based on ("14 lerakás alapján"); the unanswered count is its own sample.
 * `short` names the metric on a shipment card, where one case of it is shown.
 */
export const reviewMetricText = {
  idleAfterUnload: {
    label: "Leürült kamion következő felrakásáig",
    short: "Kamion lerakás után",
    definition:
      "A T-Port szerinti lerakástól ugyanannak a kamionnak a következő felrakásáig eltelt idő mediánja. Az a lerakás, amely után még nincs új felrakás, nem számít bele.",
    sample: "lerakás",
  },
  firstResponse: {
    label: "Első érdemi válaszig",
    short: "Első válasz",
    definition: "Az igény beérkezésétől a megbízónak küldött első válaszig eltelt idő mediánja.",
    sample: "igény",
  },
  decision: {
    label: "Döntésig",
    short: "Döntés (járat)",
    definition:
      "Az igény beérkezésétől a T-Port járat hozzárendeléséig eltelt idő mediánja: ekkor dől el, melyik kamion viszi.",
    sample: "igény",
  },
  unanswered: {
    label: "Válasz nélkül maradt igények",
    short: "Válasz nélkül",
    definition:
      "A most nyitott igények, amelyekre a beállított időn belül nem ment válasz. A csapatérték a kollégánkénti átlag.",
    sample: null,
  },
  repeatedChanges: {
    label: "Többször módosított fuvarok",
    short: "Módosítások",
    definition:
      "Azoknak a fuvaroknak az aránya, amelyeken legalább a beállított számú alkalommal módosult az időpont vagy egy adat, bárki kérte is.",
    sample: "fuvar",
  },
} as const satisfies Record<
  ReviewMetricId,
  { label: string; short: string; definition: string; sample: string | null }
>;

export const verdictLabel = {
  strength: "Erősség",
  on_par: "Csapatszinten",
  needs_work: "Fejlesztendő",
} as const satisfies Record<Verdict, string>;

/** Shown in place of a verdict when a metric has too few cases. */
export const insufficientDataLabel = "Kevés adat";

/** How many of `metrics` landed on each verdict; those without enough data are not counted. */
export function countVerdicts(metrics: readonly DispatcherMetric[]): Record<Verdict, number> {
  const counts = { strength: 0, on_par: 0, needs_work: 0 };
  for (const metric of metrics) {
    if (metric.kind === "measured") counts[metric.verdict] += 1;
  }
  return counts;
}

/** The whole review in a few numbers: what the Mérőszámok page shows a rule change would do. */
export type ReviewSummary = {
  verdicts: Record<Verdict, number>;
  /** Dispatcher metrics left without a value for lack of data. */
  insufficient: number;
  /** Requests open now without a reply past the threshold, across the team (the team value's
   * `sampleSize`: the count is its own sample). */
  unanswered: number;
  /** Shipments requested in the window, not cancelled: the sample of the change share. */
  shipmentsInWindow: number;
  /** The team's share of repeatedly changed shipments; null without enough data. */
  repeatedChangeShare: number | null;
};

export function summarizeReview<TDispatcher>(
  review: PerformanceReview<TDispatcher>,
): ReviewSummary {
  const metrics = review.dispatchers.flatMap(({ metrics }) =>
    reviewMetricIds.map((id) => metrics[id]),
  );
  const { unanswered, repeatedChanges } = review.team;

  return {
    verdicts: countVerdicts(metrics),
    insufficient: metrics.filter((metric) => metric.kind === "insufficient_data").length,
    unanswered: unanswered.sampleSize,
    shipmentsInWindow: repeatedChanges.sampleSize,
    repeatedChangeShare: repeatedChanges.kind === "measured" ? repeatedChanges.value : null,
  };
}
