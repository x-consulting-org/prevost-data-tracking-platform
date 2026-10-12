"use client";

import { SkeletonPlaceholder, SkeletonText } from "@carbon/react";

/** Same footprint as the board, so nothing jumps when the data arrives. */
export function BoardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Fuvarok betöltése"
      className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      {[0, 1, 2, 3].map((column) => (
        <div key={column} className="flex flex-col gap-2">
          <SkeletonText heading width="60%" />
          {[0, 1, 2].map((card) => (
            <SkeletonPlaceholder key={card} className="h-48! w-full!" />
          ))}
        </div>
      ))}
    </div>
  );
}
