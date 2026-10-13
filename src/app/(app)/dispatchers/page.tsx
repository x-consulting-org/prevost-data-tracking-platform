import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPerformanceReview } from "@/actions/performance";
import { PerformanceReview } from "@/components/dispatchers/performance-review";
import { PerformanceReviewSkeleton } from "@/components/dispatchers/performance-review-skeleton";
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
