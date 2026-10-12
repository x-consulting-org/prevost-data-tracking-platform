"use client";

import { ContentSwitcher, Dropdown, Switch, Toggle } from "@carbon/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  defaultShipmentView,
  shipmentViews,
  type ShipmentFilter,
  type ShipmentView,
} from "@/lib/shipments/schemas";
import type { DispatcherSummary } from "@/server/shipments";

type DispatcherOption = { id: string | null; name: string };

const allDispatchers: DispatcherOption = { id: null, name: "Minden kolléga" };

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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(name: string, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (value === null) {
      params.delete(name);
    } else {
      params.set(name, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const options: DispatcherOption[] = [allDispatchers, ...dispatchers];
  const selected = options.find((option) => option.id === (filter.dispatcherId ?? null));

  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
      <ContentSwitcher
        size="md"
        className="w-48"
        selectedIndex={shipmentViews.indexOf(view)}
        onChange={({ name }) =>
          setParam("view", name === defaultShipmentView ? null : String(name))
        }
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
          onChange={({ selectedItem }) => setParam("dispatcher", selectedItem?.id ?? null)}
        />
      </div>
      <Toggle
        id="pickup-within-24h"
        size="sm"
        labelText="Felrakás a következő 24 órában"
        labelA="Ki"
        labelB="Be"
        toggled={filter.pickupWithin24h}
        onToggle={(checked) => setParam("next24h", checked ? "true" : null)}
      />
    </div>
  );
}
