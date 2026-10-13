"use client";

import { SkeletonPlaceholder, SkeletonText } from "@carbon/react";

/** Same footprint as the board's lanes, so nothing jumps when the data arrives. */
export function BoardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Fuvarok betöltése"
      className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4"
    >
      {[0, 1, 2, 3].map((column) => (
        <div key={column} className="flex flex-col gap-1.5 rounded-2xl bg-layer-hover p-1.5">
          <div className="px-2.5 pt-1.5">
            <SkeletonText width="50%" />
          </div>
          {[0, 1, 2].map((card) => (
            <SkeletonPlaceholder key={card} className="h-40! w-full! rounded-xl!" />
          ))}
        </div>
      ))}
    </div>
  );
}
