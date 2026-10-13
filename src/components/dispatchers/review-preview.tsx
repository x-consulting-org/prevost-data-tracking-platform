import { Avatar } from "@/components/avatar";
import { verdictStyle } from "@/components/dispatchers/review-format";
import {
  reviewMetricIds,
  reviewMetricText,
  verdictLabel,
  type DispatcherMetric,
  type PerformanceReview,
} from "@/lib/performance/review";
import type { DispatcherSummary } from "@/server/shipments";

function sameOutcome(a: DispatcherMetric, b: DispatcherMetric): boolean {
  return a.kind === "measured" && b.kind === "measured"
    ? a.verdict === b.verdict
    : a.kind === b.kind;
}

function outcomeLabel(metric: DispatcherMetric): string {
  return metric.kind === "measured" ? verdictLabel[metric.verdict] : "Kevés adat";
}

/** One dot per metric; an empty ring when there is too little data. */
function OutcomeDot({ metric, changed }: { metric: DispatcherMetric; changed: boolean }) {
  return (
    <span
      className={`size-3.5 rounded-full ${
        metric.kind === "measured"
          ? verdictStyle[metric.verdict].solid
          : "border-2 border-onyx-300 bg-layer"
      } ${changed ? "ring-2 ring-onyx-900 ring-offset-2 ring-offset-layer" : ""}`}
    />
  );
}

/**
 * How the review would read with the draft numbers: a row of verdict dots per colleague, with
 * the ones that would change ringed. `current` is the review as it stands.
 */
export function ReviewPreview({
  draft,
  current,
  settling,
}: {
  draft: PerformanceReview<DispatcherSummary>;
  current: PerformanceReview<DispatcherSummary>;
  settling: boolean;
}) {
  const before = new Map(current.dispatchers.map((row) => [row.dispatcher.id, row.metrics]));

  return (
    <ul aria-busy={settling} className="flex flex-col transition-opacity aria-busy:opacity-50">
      {draft.dispatchers.map(({ dispatcher, metrics }) => {
        const was = before.get(dispatcher.id);
        const changedIds = reviewMetricIds.filter(
          (id) => was !== undefined && !sameOutcome(metrics[id], was[id]),
        );
        return (
          <li
            key={dispatcher.id}
            className="flex items-center justify-between gap-3 border-b border-border-subtle py-2.5 last:border-b-0"
          >
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
              <Avatar person={dispatcher} size="md" />
              <span className="truncate">{dispatcher.name}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {reviewMetricIds.map((id) => (
                <span
                  key={id}
                  title={`${reviewMetricText[id].label}: ${outcomeLabel(metrics[id])}`}
                  className="flex"
                >
                  <OutcomeDot metric={metrics[id]} changed={changedIds.includes(id)} />
                </span>
              ))}
              <span className="sr-only">
                {reviewMetricIds
                  .map((id) => `${reviewMetricText[id].short}: ${outcomeLabel(metrics[id])}`)
                  .join(", ")}
                {changedIds.length > 0 ? `. ${changedIds.length} változna.` : null}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The dot order and colours, under the preview. */
export function PreviewLegend() {
  return (
    <div className="flex flex-col gap-2 text-xs text-text-secondary">
      <p className="text-xs">
        Sorrendben:{" "}
        {reviewMetricIds
          .map((id) => reviewMetricText[id].short.toLocaleLowerCase("hu-HU"))
          .join(", ")}
        .
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {(["strength", "on_par", "needs_work"] as const).map((verdict) => (
          <span key={verdict} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`size-2.5 rounded-full ${verdictStyle[verdict].solid}`}
            />
            {verdictLabel[verdict]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-full border-2 border-onyx-300" />
          Kevés adat
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full bg-onyx-200 ring-2 ring-onyx-900 ring-offset-1"
          />
          Változna
        </span>
      </div>
    </div>
  );
}
