"use client";

import { Tag } from "@carbon/react";
import NextLink from "next/link";
import type { DispatcherSummary } from "@/server/shipments";

/** Links a shipment to its dispatcher's column on the Kollégák screen. */
export function DispatcherTag({ dispatcher }: { dispatcher: DispatcherSummary }) {
  return (
    <NextLink
      href={`/dispatchers#dispatcher-${dispatcher.id}`}
      className="inline-flex w-fit focus-visible:outline-2 focus-visible:outline-focus"
      aria-label={`${dispatcher.name}: kolléga fuvarjai`}
    >
      <Tag type="cool-gray" size="sm" className="m-0 cursor-pointer">
        {dispatcher.name}
      </Tag>
    </NextLink>
  );
}
