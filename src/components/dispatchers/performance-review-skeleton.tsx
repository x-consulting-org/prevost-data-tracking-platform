"use client";

import { SkeletonPlaceholder, SkeletonText } from "@carbon/react";

/** The review's header and the same grid as its cards. */
export function PerformanceReviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Értékelés betöltése" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Kollégák</h1>
        <SkeletonText width="16rem" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,21rem),1fr))] items-start gap-4">
        {[0, 1, 2].map((card) => (
          <SkeletonPlaceholder key={card} className="h-[38rem]! w-full! rounded-2xl!" />
        ))}
      </div>
    </div>
  );
}
