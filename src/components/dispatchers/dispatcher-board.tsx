"use client";

import NextLink from "next/link";
import { useEffect, useRef } from "react";
import { AttentionIcon } from "@/components/shipments/alert-list";
import { ShipmentReferenceButton } from "@/components/shipments/shipment-reference-button";
import { statusTagType } from "@/components/shipments/status-tag";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { StatusColumn } from "@/lib/shipments/grouping";
import { shipmentsHref } from "@/lib/shipments/schemas";
import { shipmentStatusLabel } from "@/lib/shipments/status";
import type { DispatcherBoard as DispatcherBoardData, ShipmentCard } from "@/server/shipments";

/** Share of a dispatcher's shipments per status; the counts are also listed below it. */
function LoadBar({
  statusColumns,
  shipmentCount,
}: {
  statusColumns: StatusColumn<ShipmentCard>[];
  shipmentCount: number;
}) {
  const filled = statusColumns.filter((column) => column.shipments.length > 0);

  return (
    <div
      role="img"
      aria-label={filled
        .map((column) => `${shipmentStatusLabel[column.status]}: ${column.shipments.length}`)
        .join(", ")}
      className="flex h-2 gap-px bg-layer"
    >
      {filled.map((column) => (
        <span
          key={column.status}
          className="h-full"
          style={{
            flexGrow: column.shipments.length / shipmentCount,
            backgroundColor: `var(--cds-tag-color-${statusTagType[column.status]})`,
          }}
        />
      ))}
    </div>
  );
}

function ShipmentRow({ shipment, now }: { shipment: ShipmentCard; now: Date }) {
  return (
    <li className="flex items-baseline gap-2 text-sm">
      <ShipmentReferenceButton shipment={shipment} />
      <span className="min-w-0 flex-1 truncate text-text-secondary">
        {shipment.originCity} – {shipment.destinationCity}
      </span>
      {shipment.alerts.length > 0 ? (
        <span className="self-center">
          <AttentionIcon />
          <span className="sr-only">Figyelmet igényel</span>
        </span>
      ) : null}
      {shipment.pickupAt === null ? null : (
        <time
          dateTime={shipment.pickupAt.toISOString()}
          title={`Felrakás: ${formatDateTime(shipment.pickupAt)}`}
          className="shrink-0 text-xs text-text-secondary tabular-nums"
        >
          <span className="sr-only">Felrakás: </span>
          {formatRelative(shipment.pickupAt, now)}
        </time>
      )}
    </li>
  );
}

/**
 * One column per dispatcher. `focusedDispatcherId` comes from the URL (a dispatcher tag on a
 * shipment links here); that column is outlined and scrolled into view.
 */
export function DispatcherBoard({
  board,
  focusedDispatcherId,
}: {
  board: DispatcherBoardData;
  focusedDispatcherId: string | undefined;
}) {
  const focusedRef = useRef<HTMLElement>(null);

  useEffect(() => {
    focusedRef.current?.scrollIntoView({ block: "start" });
  }, [focusedDispatcherId]);

  return (
    <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
      {board.columns.map(({ dispatcher, statusColumns, shipmentCount, attentionCount }) => (
        <section
          key={dispatcher.id}
          ref={dispatcher.id === focusedDispatcherId ? focusedRef : undefined}
          aria-labelledby={`dispatcher-${dispatcher.id}-name`}
          aria-current={dispatcher.id === focusedDispatcherId ? "true" : undefined}
          className="flex scroll-mt-20 flex-col gap-4 bg-layer p-4 aria-[current]:outline-2 aria-[current]:outline-brand"
        >
          <header className="flex flex-col gap-1">
            <h2 id={`dispatcher-${dispatcher.id}-name`} className="text-base font-semibold">
              {dispatcher.name}
            </h2>
            <p className="flex items-center gap-3 text-sm text-text-secondary tabular-nums">
              {shipmentCount} fuvar
              {attentionCount > 0 ? (
                <span className="flex items-center gap-1 text-text-primary">
                  <AttentionIcon />
                  {attentionCount} figyelmet igényel
                </span>
              ) : null}
            </p>
          </header>

          {shipmentCount === 0 ? (
            <p className="text-sm text-text-secondary">Nincs nyitott vagy friss fuvar.</p>
          ) : (
            <>
              <LoadBar statusColumns={statusColumns} shipmentCount={shipmentCount} />
              {statusColumns
                .filter((column) => column.shipments.length > 0)
                .map((column) => (
                  <section
                    key={column.status}
                    aria-label={`${dispatcher.name}: ${shipmentStatusLabel[column.status]}`}
                    className="flex flex-col gap-2"
                  >
                    <h3 className="text-xs font-semibold text-text-secondary">
                      {shipmentStatusLabel[column.status]}{" "}
                      <span className="font-normal tabular-nums">{column.shipments.length}</span>
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {column.shipments.map((shipment) => (
                        <ShipmentRow
                          key={shipment.id}
                          shipment={shipment}
                          now={board.generatedAt}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
            </>
          )}

          <NextLink
            href={shipmentsHref({
              view: "kanban",
              filter: { dispatcherId: dispatcher.id, pickupWithin24h: false },
            })}
            className="text-sm text-link-primary hover:underline focus-visible:outline-2 focus-visible:outline-focus"
          >
            {dispatcher.name} fuvarjai a Fuvarok nézetben
          </NextLink>
        </section>
      ))}
    </div>
  );
}
