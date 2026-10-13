import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPerformanceReview } from "@/actions/performance";
import { PerformanceReview } from "@/components/dispatchers/performance-review";
import { PerformanceReviewSkeleton } from "@/components/dispatchers/performance-review-skeleton";
import { reviewWindowDays } from "@/lib/performance/review";
import { dispatchersSearchParamsSchema } from "@/lib/shipments/schemas";

export const metadata: Metadata = {
  title: "Kollégák",
};

export default function DispatchersPage({ searchParams }: PageProps<"/dispatchers">) {
  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Kollégák</h1>
        <p className="text-sm text-text-secondary">
          Az elmúlt {reviewWindowDays} nap működése kollégánként, a csapathoz mérve.
        </p>
      </header>
      <Suspense fallback={<PerformanceReviewSkeleton />}>
        <Review searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Review({ searchParams }: Pick<PageProps<"/dispatchers">, "searchParams">) {
  const parsed = dispatchersSearchParamsSchema.safeParse(await searchParams);
  if (!parsed.success) {
    notFound();
  }

  const review = await getPerformanceReview();
  const focusedDispatcherId = parsed.data.dispatcher;
  if (
    focusedDispatcherId !== undefined &&
    !review.dispatchers.some((row) => row.dispatcher.id === focusedDispatcherId)
  ) {
    notFound();
  }

  return <PerformanceReview review={review} focusedDispatcherId={focusedDispatcherId} />;
}
