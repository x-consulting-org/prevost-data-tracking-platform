import NextLink from "next/link";
import { Avatar } from "@/components/avatar";
import { MetricInfo } from "@/components/dispatchers/metric-info";
import { formatMetric, sampleText, verdictStyle } from "@/components/dispatchers/review-format";
import {
  insufficientDataLabel,
  reviewMetricIds,
  reviewMetricText,
  verdictLabel,
  type DispatcherMetric,
  type MetricValue,
  type PerformanceReview,
  type ReviewMetricId,
} from "@/lib/performance/review";
import { dispatchersHref } from "@/lib/shipments/schemas";
import type { DispatcherSummary } from "@/server/shipments";

type Row = { dispatcher: DispatcherSummary; metric: DispatcherMetric };

/** Best first; colleagues without enough data last, by name. */
function ranked(rows: Row[]): Row[] {
  return rows.toSorted((a, b) => {
    if (a.metric.kind === "measured" && b.metric.kind === "measured") {
      return (
        a.metric.value - b.metric.value || a.dispatcher.name.localeCompare(b.dispatcher.name, "hu")
      );
    }
    if (a.metric.kind !== b.metric.kind) return a.metric.kind === "measured" ? -1 : 1;
    return a.dispatcher.name.localeCompare(b.dispatcher.name, "hu");
  });
}

/** Everyone on one metric, as bars on a shared scale with the team value marked. */
function MetricPanel({ id, team, rows }: { id: ReviewMetricId; team: MetricValue; rows: Row[] }) {
  const values = rows.flatMap(({ metric }) => (metric.kind === "measured" ? [metric.value] : []));
  const scaleMax = Math.max(...values, team.kind === "measured" ? team.value : 0);
  const width = (value: number) => (scaleMax === 0 ? 0 : (value / scaleMax) * 100);

  return (
    <section
      aria-labelledby={`metric-${id}`}
      className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-layer p-5"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={`metric-${id}`} className="flex items-center gap-1 text-base font-semibold">
          {reviewMetricText[id].label}
          <MetricInfo id={id} />
        </h2>
        <p className="text-sm text-text-secondary tabular-nums">
          {team.kind === "measured"
            ? `Csapat: ${formatMetric(id, team.value)}`
            : insufficientDataLabel}
        </p>
      </header>

      <ol className="-mx-2 flex flex-col">
        {ranked(rows).map(({ dispatcher, metric }) => (
          <li key={dispatcher.id}>
            <NextLink
              href={dispatchersHref({ view: "people", dispatcherId: dispatcher.id })}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2 text-text-primary transition-colors hover:bg-layer-hover focus-visible:outline-2 focus-visible:outline-focus md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_6.5rem]"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <Avatar person={dispatcher} size="md" />
                <span className="truncate">{dispatcher.name}</span>
              </span>
              {metric.kind === "measured" ? (
                <>
                  <span
                    aria-hidden="true"
                    className="relative col-span-2 row-start-2 h-2.5 rounded-full bg-onyx-100 md:col-span-1 md:col-start-2 md:row-start-1"
                  >
                    <span
                      className={`absolute inset-y-0 left-0 origin-left animate-grow-x rounded-full ${verdictStyle[metric.verdict].solid}`}
                      style={{ width: `${width(metric.value)}%` }}
                    />
                    {team.kind === "measured" ? (
                      <span
                        className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-onyx-800"
                        style={{ left: `${width(team.value)}%` }}
                      />
                    ) : null}
                  </span>
                  <span className="col-start-2 row-start-1 flex flex-col items-end text-right md:col-start-3">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMetric(id, metric.value)}
                    </span>
                    <span className={`text-xs ${verdictStyle[metric.verdict].ink}`}>
                      {verdictLabel[metric.verdict]}
                    </span>
                  </span>
                </>
              ) : (
                <span className="col-start-2 row-start-1 text-xs text-text-helper md:col-span-2">
                  {insufficientDataLabel}
                  {metric.sampleSize > 0 ? `, ${sampleText(id, metric.sampleSize)}` : null}
                </span>
              )}
            </NextLink>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The review by metric: who is fastest on what, at a glance. A row opens the colleague's card. */
export function MetricRanking({ review }: { review: PerformanceReview<DispatcherSummary> }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,28rem),1fr))] items-start gap-4">
      {reviewMetricIds.map((id) => (
        <MetricPanel
          key={id}
          id={id}
          team={review.team[id]}
          rows={review.dispatchers.map(({ dispatcher, metrics }) => ({
            dispatcher,
            metric: metrics[id],
          }))}
        />
      ))}
    </div>
  );
}
