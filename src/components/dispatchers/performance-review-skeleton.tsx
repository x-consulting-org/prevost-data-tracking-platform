"use client";

import { SkeletonPlaceholder } from "@carbon/react";

/** Same grid as the performance review. */
export function PerformanceReviewSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Értékelés betöltése"
      className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {[0, 1, 2].map((card) => (
        <SkeletonPlaceholder key={card} className="h-[34rem]! w-full! rounded-2xl!" />
      ))}
    </div>
  );
}
