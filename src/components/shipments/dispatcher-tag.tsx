"use client";

import { Tag } from "@carbon/react";
import NextLink from "next/link";
import { dispatchersHref } from "@/lib/shipments/schemas";
import type { DispatcherSummary } from "@/server/shipments";

/** Links a shipment to its dispatcher's column on the Kollégák screen, which brings it into view. */
export function DispatcherTag({ dispatcher }: { dispatcher: DispatcherSummary }) {
  return (
    <NextLink
      href={dispatchersHref(dispatcher.id)}
      className="inline-flex w-fit focus-visible:outline-2 focus-visible:outline-focus"
      aria-label={`${dispatcher.name}: kolléga fuvarjai`}
    >
      <Tag type="cool-gray" size="sm" className="m-0 cursor-pointer">
        {dispatcher.name}
      </Tag>
    </NextLink>
  );
}
