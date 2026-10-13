import NextLink from "next/link";
import { Avatar } from "@/components/avatar";
import { dispatchersHref } from "@/lib/shipments/schemas";
import type { DispatcherSummary } from "@/server/shipments";

/** Links a shipment to its dispatcher on the Kollégák screen, which brings them into view. */
export function DispatcherLink({
  dispatcher,
  className,
}: {
  dispatcher: DispatcherSummary;
  className?: string;
}) {
  return (
    <NextLink
      href={dispatchersHref({ view: "people", dispatcherId: dispatcher.id })}
      aria-label={`${dispatcher.name}: kolléga fuvarjai`}
      className={`inline-flex w-fit max-w-full items-center gap-1.5 rounded-full py-0.5 pr-2 pl-0.5 text-xs font-medium text-text-secondary transition-colors hover:bg-layer-hover hover:text-text-primary focus-visible:outline-2 focus-visible:outline-focus ${className ?? ""}`}
    >
      <Avatar person={dispatcher} size="sm" />
      <span className="truncate">{dispatcher.name}</span>
    </NextLink>
  );
}
