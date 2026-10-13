import { DeliveryTruck } from "@carbon/icons-react";
import NextLink from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { MetricInfo } from "@/components/dispatchers/metric-info";
import { formatMetric, sampleText, verdictStyle } from "@/components/dispatchers/review-format";
import { ScrollIntoView } from "@/components/dispatchers/scroll-into-view";
import {
  reviewMetricIds,
  reviewMetricText,
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

/** How many metrics landed on each verdict, for the chips under a colleague's name. */
function verdictCounts(metrics: Record<ReviewMetricId, DispatcherMetric>) {
  const verdicts = reviewMetricIds.flatMap((id) => {
    const metric = metrics[id];
    return metric.kind === "measured" ? [metric.verdict] : [];
  });
  return {
    measured: verdicts.length,
    strength: verdicts.filter((verdict) => verdict === "strength").length,
    needsWork: verdicts.filter((verdict) => verdict === "needs_work").length,
  };
}

function Pill({ tone, children }: { tone: Verdict; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-medium ${verdictStyle[tone].tint} ${verdictStyle[tone].ink}`}
    >
      {children}
    </span>
  );
}

function VerdictChips({ metrics }: { metrics: Record<ReviewMetricId, DispatcherMetric> }) {
  const counts = verdictCounts(metrics);
  if (counts.measured === 0) return <Pill tone="on_par">Még kevés az adat</Pill>;
  if (counts.strength === 0 && counts.needsWork === 0) {
    return <Pill tone="on_par">Minden mutató csapatszinten</Pill>;
  }

  return (
    <>
      {counts.strength > 0 ? <Pill tone="strength">{counts.strength} erősség</Pill> : null}
      {counts.needsWork > 0 ? <Pill tone="needs_work">{counts.needsWork} fejlesztendő</Pill> : null}
    </>
  );
}

type ScalePoint = { key: string; label: string; value: number };

/** A mark on the team scale, `left`% along it. Its label opens towards the middle, so it never
 * sticks out of the card. */
function Mark({ label, left, children }: { label: string; left: number; children: ReactNode }) {
  const anchor = left < 25 ? "left-0" : left > 75 ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <span
      className="group/mark absolute top-0 flex h-full w-4 -translate-x-1/2 items-center justify-center"
      style={{ left: `${left}%` }}
    >
      {children}
      <span
        className={`pointer-events-none absolute bottom-full mb-1 rounded-md bg-onyx-900 px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 transition-opacity group-hover/mark:opacity-100 ${anchor}`}
      >
        {label}
      </span>
    </span>
  );
}

/**
 * Where everyone stands on one metric, from the best value of the team (left) to the worst.
 * Pointing at a mark names it. Hidden from assistive tech: the value, the verdict and the team
 * value are written out, and the Mutatók view ranks everyone in text.
 */
function TeamScale({
  own,
  team,
  others,
  verdict,
}: {
  own: ScalePoint;
  team: ScalePoint;
  others: ScalePoint[];
  verdict: Verdict;
}) {
  const values = [own, team, ...others].map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const position = (value: number) => (max === min ? 50 : ((value - min) / (max - min)) * 100);

  return (
    <div aria-hidden="true" className="relative mx-2 h-5">
      <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-onyx-100" />
      {others.map((point) => (
        <Mark key={point.key} label={point.label} left={position(point.value)}>
          <span className="h-3 w-0.5 rounded-full bg-onyx-300 group-hover/mark:bg-onyx-600" />
        </Mark>
      ))}
      <Mark label={team.label} left={position(team.value)}>
        <span className="h-5 w-0.5 rounded-full bg-onyx-800" />
      </Mark>
      <Mark label={own.label} left={position(own.value)}>
        <span
          className={`size-4 rounded-full ring-3 ring-layer transition-transform group-hover/mark:scale-125 ${verdictStyle[verdict].solid}`}
        />
      </Mark>
    </div>
  );
}

function MetricRow({
  id,
  name,
  metric,
  team,
  others,
}: {
  id: ReviewMetricId;
  name: string;
  metric: DispatcherMetric;
  team: MetricValue;
  others: ScalePoint[];
}) {
  return (
    <div className="flex flex-col gap-2 py-3.5">
      <dt className="flex items-center gap-1 text-sm text-text-secondary">
        {reviewMetricText[id].label}
        <MetricInfo id={id} />
      </dt>
      <dd className="flex flex-col gap-2">
        {metric.kind === "measured" && team.kind === "measured" ? (
          <>
            <p className="flex items-center justify-between gap-3">
              <span className="text-2xl/none font-semibold tracking-tight tabular-nums">
                {formatMetric(id, metric.value)}
              </span>
              <Pill tone={metric.verdict}>{verdictLabel[metric.verdict]}</Pill>
            </p>
            <TeamScale
              own={{
                key: "own",
                label: `${name}: ${formatMetric(id, metric.value)}`,
                value: metric.value,
              }}
              team={{
                key: "team",
                label: `Csapat: ${formatMetric(id, team.value)}`,
                value: team.value,
              }}
              others={others}
              verdict={metric.verdict}
            />
            <p className="flex justify-between gap-3 text-xs text-text-helper tabular-nums">
              <span>Csapat: {formatMetric(id, team.value)}</span>
              <span>{sampleText(id, metric.sampleSize)}</span>
            </p>
          </>
        ) : (
          <p className="flex items-center justify-between gap-3">
            <span className="text-2xl/none font-semibold text-text-helper">–</span>
            <span className="text-xs text-text-helper">
              Kevés adat
              {metric.sampleSize > 0 ? `, ${sampleText(id, metric.sampleSize)}` : null}
            </span>
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
    everyone.flatMap((other): ScalePoint[] => {
      const metric = other.metrics[id];
      return other !== review && metric.kind === "measured"
        ? [
            {
              key: other.dispatcher.id,
              label: `${other.dispatcher.name}: ${formatMetric(id, metric.value)}`,
              value: metric.value,
            },
          ]
        : [];
    });

  return (
    <section
      aria-labelledby={`dispatcher-${dispatcher.id}-name`}
      aria-current={focused ? "true" : undefined}
      className="relative flex flex-col rounded-2xl border border-border-subtle bg-layer px-5 pt-5 pb-3 aria-[current]:border-brand aria-[current]:ring-4 aria-[current]:ring-brand/30"
    >
      {focused ? <ScrollIntoView className="absolute top-0 scroll-mt-20 lg:scroll-mt-8" /> : null}
      <header className="flex items-center gap-3 pb-2">
        <Avatar person={dispatcher} size="lg" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2
            id={`dispatcher-${dispatcher.id}-name`}
            className="truncate text-lg/tight font-semibold"
          >
            {dispatcher.name}
          </h2>
          <p className="flex flex-wrap gap-1.5">
            <VerdictChips metrics={metrics} />
          </p>
        </div>
      </header>

      <dl className="flex flex-col divide-y divide-border-subtle">
        {reviewMetricIds.map((id) => (
          <MetricRow
            key={id}
            id={id}
            name={dispatcher.name}
            metric={metrics[id]}
            team={team[id]}
            others={othersOn(id)}
          />
        ))}
      </dl>

      <NextLink
        href={shipmentsHref({
          view: "kanban",
          filter: { dispatcherId: dispatcher.id, pickupWithin24h: false, includeCancelled: false },
        })}
        className="-mx-2 mt-auto inline-flex w-fit items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-layer-hover hover:text-text-primary focus-visible:outline-2 focus-visible:outline-focus"
      >
        <DeliveryTruck size={16} aria-hidden="true" />
        {openShipmentCount} nyitott fuvar
      </NextLink>
    </section>
  );
}

/** How to read the scales, once for every card. */
export function ScaleLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-verdict-on-par" />A kolléga
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-3.5 w-0.5 rounded-full bg-onyx-800" />A csapat
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2.5 w-0.5 rounded-full bg-onyx-300" />
        Többiek
      </span>
      <span className="text-text-helper">Balra a jobb</span>
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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,21rem),1fr))] items-stretch gap-4">
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
  );
}
