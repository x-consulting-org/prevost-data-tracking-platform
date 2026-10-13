import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPerformanceReview } from "@/actions/performance";
import { MetricRanking } from "@/components/dispatchers/metric-ranking";
import { PerformanceReview, ScaleLegend } from "@/components/dispatchers/performance-review";
import { PerformanceReviewSkeleton } from "@/components/dispatchers/performance-review-skeleton";
import { ReviewToolbar } from "@/components/dispatchers/review-toolbar";
import { dispatchersSearchParamsSchema } from "@/lib/shipments/schemas";

export const metadata: Metadata = {
  title: "Kollégák",
};

export default function DispatchersPage({ searchParams }: PageProps<"/dispatchers">) {
  return (
    <Suspense fallback={<PerformanceReviewSkeleton />}>
      <Review searchParams={searchParams} />
    </Suspense>
  );
}

async function Review({ searchParams }: Pick<PageProps<"/dispatchers">, "searchParams">) {
  const parsed = dispatchersSearchParamsSchema.safeParse(await searchParams);
  if (!parsed.success) {
    notFound();
  }
  const { view, dispatcherId } = parsed.data;

  const review = await getPerformanceReview();
  if (
    dispatcherId !== undefined &&
    !review.dispatchers.some((row) => row.dispatcher.id === dispatcherId)
  ) {
    notFound();
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Kollégák</h1>
          <p className="text-sm text-text-secondary">
            Az elmúlt {review.settings.reviewWindowDays} nap, a csapathoz mérve.
          </p>
        </div>
        <ReviewToolbar view={view} />
      </header>
      {view === "people" ? (
        <>
          <ScaleLegend />
          <PerformanceReview review={review} focusedDispatcherId={dispatcherId} />
        </>
      ) : (
        <MetricRanking review={review} />
      )}
    </>
  );
}
