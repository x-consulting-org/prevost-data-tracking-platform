import NextLink from "next/link";
import { Avatar } from "@/components/avatar";
import { ScrollIntoView } from "@/components/dispatchers/scroll-into-view";
import { formatDecimal, formatDuration, formatShare } from "@/lib/format";
import {
  reviewMetricIds,
  reviewMetricText,
  reviewMetricUnit,
  verdictLabel,
  type DispatcherMetric,
  type DispatcherReview,
  type MetricValue,
  type PerformanceReview as PerformanceReviewData,
  type ReviewMetricId,
  type Verdict,
} from "@/lib/performance/review";
import { shipmentsHref } from "@/lib/shipments/schemas";
import type { DispatcherSummary } from "@/server/shipments";

/** Written out in full so Tailwind finds them. */
const verdictStyle = {
  strength: { solid: "bg-verdict-strength", ink: "text-verdict-strength-ink" },
  on_par: { solid: "bg-verdict-on-par", ink: "text-verdict-on-par-ink" },
  needs_work: { solid: "bg-verdict-needs-work", ink: "text-verdict-needs-work-ink" },
} as const satisfies Record<Verdict, { solid: string; ink: string }>;

function formatMetric(id: ReviewMetricId, value: number): string {
  switch (reviewMetricUnit[id]) {
    case "duration":
      return formatDuration(value);
    case "share":
      return formatShare(value);
    case "count":
      return `${formatDecimal(value)} igény`;
  }
}

/** "14 lerakás alapján"; nothing for the unanswered count, which is its own sample. */
function sampleText(id: ReviewMetricId, sampleSize: number): string | null {
  const noun = reviewMetricText[id].sample;
  return noun === null ? null : `${sampleSize} ${noun} alapján`;
}

/** "2 erősség, 1 fejlesztendő", or that everything is on par. */
function verdictSummary(metrics: Record<ReviewMetricId, DispatcherMetric>): string {
  const verdicts = reviewMetricIds.flatMap((id) => {
    const metric = metrics[id];
    return metric.kind === "measured" ? [metric.verdict] : [];
  });
  const strengths = verdicts.filter((verdict) => verdict === "strength").length;
  const needsWork = verdicts.filter((verdict) => verdict === "needs_work").length;
  const parts = [
    strengths > 0 ? `${strengths} erősség` : null,
    needsWork > 0 ? `${needsWork} fejlesztendő` : null,
  ].filter((part) => part !== null);
  if (parts.length > 0) return parts.join(", ");
  return verdicts.length > 0 ? "Minden mutató csapatszinten" : "Még kevés az adat";
}

/**
 * Where everyone stands on one metric: the scale runs from the best (left) to the worst value
 * of the team. Decorative: the value, the verdict and the team value are written out.
 */
function TeamScale({
  own,
  others,
  team,
  verdict,
}: {
  own: number;
  others: number[];
  team: number;
  verdict: Verdict;
}) {
  const values = [own, team, ...others];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const position = (value: number) => (max === min ? 50 : ((value - min) / (max - min)) * 100);

  return (
    <div aria-hidden="true" className="relative mx-1.5 h-4">
      <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-onyx-100" />
      {others.map((value, index) => (
        <span
          key={index}
          className="absolute top-1/2 h-2.5 w-0.5 -translate-1/2 rounded-full bg-onyx-300"
          style={{ left: `${position(value)}%` }}
        />
      ))}
      <span
        className="absolute top-1/2 h-4 w-0.5 -translate-1/2 rounded-full bg-onyx-800"
        style={{ left: `${position(team)}%` }}
      />
      <span
        className={`absolute top-1/2 size-3.5 -translate-1/2 rounded-full ring-2 ring-layer ${verdictStyle[verdict].solid}`}
        style={{ left: `${position(own)}%` }}
      />
    </div>
  );
}

function MetricRow({
  id,
  metric,
  team,
  others,
}: {
  id: ReviewMetricId;
  metric: DispatcherMetric;
  team: MetricValue;
  others: number[];
}) {
  const text = reviewMetricText[id];

  return (
    <div className="flex flex-col gap-1.5 py-3">
      <dt className="text-sm text-text-secondary">{text.label}</dt>
      <dd className="flex flex-col gap-1.5">
        {metric.kind === "measured" && team.kind === "measured" ? (
          <>
            <p className="flex items-baseline justify-between gap-3">
              <span className="text-xl leading-none font-semibold tabular-nums">
                {formatMetric(id, metric.value)}
              </span>
              <span className={`text-sm font-medium ${verdictStyle[metric.verdict].ink}`}>
                {verdictLabel[metric.verdict]}
              </span>
            </p>
            <TeamScale
              own={metric.value}
              others={others}
              team={team.value}
              verdict={metric.verdict}
            />
            <p className="flex justify-between gap-3 text-xs text-text-secondary tabular-nums">
              <span>Csapat: {formatMetric(id, team.value)}</span>
              <span>{sampleText(id, metric.sampleSize)}</span>
            </p>
          </>
        ) : (
          <p className="text-sm text-text-secondary">
            Kevés adat
            {metric.sampleSize > 0 ? ` (${sampleText(id, metric.sampleSize)})` : null}
          </p>
        )}
      </dd>
    </div>
  );
}

function DispatcherCard({
  review,
  everyone,
  team,
  focused,
}: {
  review: DispatcherReview<DispatcherSummary>;
  everyone: DispatcherReview<DispatcherSummary>[];
  team: Record<ReviewMetricId, MetricValue>;
  focused: boolean;
}) {
  const { dispatcher, metrics, openShipmentCount } = review;
  const othersOn = (id: ReviewMetricId) =>
    everyone.flatMap((other) => {
      const metric = other.metrics[id];
      return other !== review && metric.kind === "measured" ? [metric.value] : [];
    });

  return (
    <section
      aria-labelledby={`dispatcher-${dispatcher.id}-name`}
      aria-current={focused ? "true" : undefined}
      className="relative flex flex-col rounded-2xl border border-border-subtle bg-layer p-4 aria-[current]:border-brand aria-[current]:ring-4 aria-[current]:ring-brand/30 md:p-5"
    >
      {focused ? <ScrollIntoView className="absolute top-0 scroll-mt-20 lg:scroll-mt-8" /> : null}
      <header className="flex items-center gap-3 pb-2">
        <Avatar person={dispatcher} size="lg" />
        <div className="flex min-w-0 flex-col">
          <h2 id={`dispatcher-${dispatcher.id}-name`} className="truncate text-base font-semibold">
            {dispatcher.name}
          </h2>
          <p className="text-sm text-text-secondary">{verdictSummary(metrics)}</p>
        </div>
      </header>

      <dl className="flex flex-col divide-y divide-border-subtle">
        {reviewMetricIds.map((id) => (
          <MetricRow key={id} id={id} metric={metrics[id]} team={team[id]} others={othersOn(id)} />
        ))}
      </dl>

      <div className="mt-auto border-t border-border-subtle pt-3">
        <NextLink
          href={shipmentsHref({
            view: "kanban",
            filter: {
              dispatcherId: dispatcher.id,
              pickupWithin24h: false,
              includeCancelled: false,
            },
          })}
          className="text-sm font-medium text-link-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-focus"
        >
          {openShipmentCount} nyitott fuvar a Fuvarok nézetben
        </NextLink>
      </div>
    </section>
  );
}

/** What the page covers and how to read the scales, once for every card. */
function ReviewIntro({ windowDays }: { windowDays: number }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-text-secondary">
        Az elmúlt {windowDays} nap kollégánként, a csapathoz mérve. Hogy mi mit jelent, és mikortól
        számít valami erősségnek, a{" "}
        <NextLink
          href="/dispatchers/metrics"
          className="text-link-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-focus"
        >
          Mérőszámok
        </NextLink>{" "}
        oldalon látod és állítod.
      </p>
      <ScaleLegend />
    </div>
  );
}

/** How to read the scales. */
function ScaleLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-secondary">
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="size-3 rounded-full bg-verdict-on-par" />A kolléga
      </span>
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="h-3.5 w-0.5 rounded-full bg-onyx-800" />A csapat
      </span>
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="h-2.5 w-0.5 rounded-full bg-onyx-300" />
        Többi kolléga
      </span>
      <span>Minden mutatónál a kevesebb a jobb, a sávon balra.</span>
    </div>
  );
}

/**
 * One review card per dispatcher. `focusedDispatcherId` comes from the URL (a dispatcher link
 * on a shipment leads here); that card is ringed in the brand gold and scrolled into view.
 */
export function PerformanceReview({
  review,
  focusedDispatcherId,
}: {
  review: PerformanceReviewData<DispatcherSummary>;
  focusedDispatcherId: string | undefined;
}) {
  return (
    <>
      <ReviewIntro windowDays={review.settings.reviewWindowDays} />
      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {review.dispatchers.map((dispatcherReview) => (
          <DispatcherCard
            key={dispatcherReview.dispatcher.id}
            review={dispatcherReview}
            everyone={review.dispatchers}
            team={review.team}
            focused={dispatcherReview.dispatcher.id === focusedDispatcherId}
          />
        ))}
      </div>
    </>
  );
}
