"use client";

import { ContentSwitcher, Dropdown, Switch, Toggle } from "@carbon/react";
import { useRouter } from "next/navigation";
import {
  shipmentsHref,
  shipmentViews,
  type ShipmentFilter,
  type ShipmentsSearchParams,
  type ShipmentView,
} from "@/lib/shipments/schemas";
import type { DispatcherSummary } from "@/server/shipments";

/** `id` is the filter value: undefined means every dispatcher. */
type DispatcherOption = { id: string | undefined; name: string };

const allDispatchers: DispatcherOption = { id: undefined, name: "Minden kolléga" };

const viewLabel = { kanban: "Kanban", table: "Tábla" } as const satisfies Record<
  ShipmentView,
  string
>;

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

  const options: DispatcherOption[] = [allDispatchers, ...dispatchers];
  // The page answers 404 for an unknown dispatcher, so the filter always names an option.
  const selected = options.find((option) => option.id === filter.dispatcherId);
  if (selected === undefined) {
    throw new Error(`Dispatcher filter "${filter.dispatcherId}" is not a known dispatcher`);
  }

  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
      <ContentSwitcher
        size="md"
        className="w-48"
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
      <div className="w-64">
        <Dropdown<DispatcherOption>
          id="dispatcher-filter"
          titleText="Kolléga"
          label="Minden kolléga"
          size="md"
          items={options}
          itemToString={(option) => option?.name ?? ""}
          selectedItem={selected}
          onChange={({ selectedItem }) => {
            // Every option is a real choice and the dropdown has no clear action.
            if (selectedItem === null) {
              throw new Error("Dispatcher dropdown reported no selection");
            }
            show({ view, filter: { ...filter, dispatcherId: selectedItem.id } });
          }}
        />
      </div>
      <Toggle
        id="pickup-within-24h"
        size="sm"
        labelText="Felrakás a következő 24 órában"
        labelA="Ki"
        labelB="Be"
        toggled={filter.pickupWithin24h}
        onToggle={(checked) => show({ view, filter: { ...filter, pickupWithin24h: checked } })}
      />
    </div>
  );
}
