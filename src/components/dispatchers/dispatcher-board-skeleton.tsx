"use client";

import { SkeletonPlaceholder } from "@carbon/react";

/** Same grid as the dispatcher board. */
export function DispatcherBoardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Kollégák betöltése"
      className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {[0, 1, 2].map((column) => (
        <SkeletonPlaceholder key={column} className="h-96! w-full! rounded-2xl!" />
      ))}
    </div>
  );
}
