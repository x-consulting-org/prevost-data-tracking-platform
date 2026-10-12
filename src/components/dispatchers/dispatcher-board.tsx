"use client";

import { ArrowRight } from "@carbon/icons-react";
import NextLink from "next/link";
import { useEffect, useRef } from "react";
import { Avatar } from "@/components/avatar";
import { AttentionCount, AttentionIcon } from "@/components/shipments/alert-list";
import { ShipmentReferenceButton } from "@/components/shipments/shipment-reference-button";
import { StatusDot, statusStyle } from "@/components/shipments/status-badge";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { StatusColumn } from "@/lib/shipments/grouping";
import { shipmentsHref } from "@/lib/shipments/schemas";
import { shipmentStatusLabel } from "@/lib/shipments/status";
import type { DispatcherBoard as DispatcherBoardData, ShipmentCard } from "@/server/shipments";

/** Share of a dispatcher's shipments per status. Decorative: StatusCounts carries the numbers. */
function LoadBar({
  statusColumns,
  shipmentCount,
}: {
  statusColumns: StatusColumn<ShipmentCard>[];
  shipmentCount: number;
}) {
  const filled = statusColumns.filter((column) => column.shipments.length > 0);

  return (
    <div aria-hidden="true" className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
      {filled.map((column) => (
        <span
          key={column.status}
          className={`h-full rounded-full ${statusStyle[column.status].solid}`}
          style={{ flexGrow: column.shipments.length / shipmentCount }}
        />
      ))}
    </div>
  );
}

/** The four status counts, each in its status colour. */
function StatusCounts({ statusColumns }: { statusColumns: StatusColumn<ShipmentCard>[] }) {
  return (
    <dl className="grid grid-cols-2 gap-1.5">
      {statusColumns.map((column) => (
        <div
          key={column.status}
          className={`flex flex-row-reverse items-center justify-end gap-2 rounded-lg px-2.5 py-1.5 ${statusStyle[column.status].tint} ${statusStyle[column.status].ink}`}
        >
          <dt className="truncate text-xs">{shipmentStatusLabel[column.status]}</dt>
          <dd className="text-base leading-none font-semibold tabular-nums">
            {column.shipments.length}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ShipmentRow({ shipment, now }: { shipment: ShipmentCard; now: Date }) {
  return (
    <li className="relative -mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-layer-hover">
      <ShipmentReferenceButton shipment={shipment} stretched />
      <span className="min-w-0 flex-1 truncate text-text-secondary">
        {shipment.originCity} – {shipment.destinationCity}
      </span>
      {shipment.alerts.length > 0 ? (
        <span>
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
 * One card per dispatcher. `focusedDispatcherId` comes from the URL (a dispatcher link on a
 * shipment leads here); that card is ringed in the brand orange and scrolled into view.
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
    focusedRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focusedDispatcherId]);

  return (
    <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
      {board.columns.map(({ dispatcher, statusColumns, shipmentCount, attentionCount }, index) => (
        <section
          key={dispatcher.id}
          ref={dispatcher.id === focusedDispatcherId ? focusedRef : undefined}
          aria-labelledby={`dispatcher-${dispatcher.id}-name`}
          aria-current={dispatcher.id === focusedDispatcherId ? "true" : undefined}
          className="flex animate-enter scroll-mt-20 flex-col gap-4 rounded-2xl border border-border-subtle bg-layer p-4 aria-[current]:border-brand aria-[current]:ring-4 aria-[current]:ring-brand/30 lg:scroll-mt-8"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <header className="flex items-center gap-3">
            <Avatar person={dispatcher} size="lg" />
            <div className="flex min-w-0 flex-1 flex-col">
              <h2
                id={`dispatcher-${dispatcher.id}-name`}
                className="truncate text-base font-semibold"
              >
                {dispatcher.name}
              </h2>
              <p className="text-sm text-text-secondary tabular-nums">{shipmentCount} fuvar</p>
            </div>
            {attentionCount > 0 ? <AttentionCount count={attentionCount} /> : null}
          </header>

          {shipmentCount === 0 ? (
            <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-sm text-text-secondary">
              Nincs nyitott vagy friss fuvar.
            </p>
          ) : (
            <>
              <LoadBar statusColumns={statusColumns} shipmentCount={shipmentCount} />
              <StatusCounts statusColumns={statusColumns} />
              {statusColumns
                .filter((column) => column.shipments.length > 0)
                .map((column) => (
                  <section
                    key={column.status}
                    aria-label={`${dispatcher.name}: ${shipmentStatusLabel[column.status]}`}
                    className="flex flex-col gap-0.5"
                  >
                    <h3 className="flex items-center gap-2 pb-1 text-xs font-medium text-text-secondary">
                      <StatusDot status={column.status} />
                      {shipmentStatusLabel[column.status]}
                    </h3>
                    <ul className="flex flex-col">
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
            className="group inline-flex w-fit items-center gap-1.5 text-sm font-medium text-link-primary focus-visible:outline-2 focus-visible:outline-focus"
          >
            {dispatcher.name} fuvarjai a Fuvarok nézetben
            <ArrowRight
              size={16}
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            />
          </NextLink>
        </section>
      ))}
    </div>
  );
}
