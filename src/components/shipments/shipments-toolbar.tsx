"use client";

import { Checkmark, Time } from "@carbon/icons-react";
import { ContentSwitcher, Switch } from "@carbon/react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import {
  shipmentsHref,
  shipmentViews,
  type ShipmentFilter,
  type ShipmentsSearchParams,
  type ShipmentView,
} from "@/lib/shipments/schemas";
import type { DispatcherSummary } from "@/server/shipments";

const viewLabel = { kanban: "Kanban", table: "Tábla" } as const satisfies Record<
  ShipmentView,
  string
>;

/** A filter chip; `pressed` is its state, announced as a toggle button. */
function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-border-subtle bg-layer px-3 text-sm font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-pressed:border-text-primary aria-pressed:bg-text-primary aria-pressed:text-white"
    >
      {children}
    </button>
  );
}

/** View and filter controls. Their state is the URL, so the server renders the result. */
export function ShipmentsToolbar({
  view,
  filter,
  dispatchers,
}: {
  view: ShipmentView;
  filter: ShipmentFilter;
  dispatchers: DispatcherSummary[];
}) {
  const router = useRouter();

  function show(next: ShipmentsSearchParams) {
    router.replace(shipmentsHref(next), { scroll: false });
  }

  function showDispatcher(dispatcherId: string | undefined) {
    show({ view, filter: { ...filter, dispatcherId } });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ContentSwitcher
          size="md"
          className="w-52"
          selectedIndex={shipmentViews.indexOf(view)}
          onChange={({ index }) => {
            const next = index === undefined ? undefined : shipmentViews[index];
            if (next === undefined) {
              throw new Error(`View switch reported an unknown index ${String(index)}`);
            }
            show({ view: next, filter });
          }}
        >
          {shipmentViews.map((option) => (
            <Switch key={option} name={option} text={viewLabel[option]} />
          ))}
        </ContentSwitcher>
        <Chip
          pressed={filter.pickupWithin24h}
          onClick={() =>
            show({ view, filter: { ...filter, pickupWithin24h: !filter.pickupWithin24h } })
          }
        >
          {filter.pickupWithin24h ? (
            <Checkmark size={16} aria-hidden="true" />
          ) : (
            <Time size={16} aria-hidden="true" />
          )}
          Felrakás 24 órán belül
        </Chip>
      </div>
      {/* One chip per dispatcher; on narrow screens the row scrolls sideways. */}
      <div
        role="group"
        aria-label="Kolléga"
        className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
      >
        <Chip pressed={filter.dispatcherId === undefined} onClick={() => showDispatcher(undefined)}>
          Minden kolléga
        </Chip>
        {dispatchers.map((dispatcher) => (
          <Chip
            key={dispatcher.id}
            pressed={filter.dispatcherId === dispatcher.id}
            onClick={() => showDispatcher(dispatcher.id)}
          >
            <Avatar person={dispatcher} size="sm" />
            {dispatcher.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}
