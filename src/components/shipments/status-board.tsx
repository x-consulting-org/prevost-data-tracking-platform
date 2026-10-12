import { AttentionIcon } from "@/components/shipments/alert-list";
import { ShipmentCard } from "@/components/shipments/shipment-card";
import {
  completedVisibleDays,
  shipmentStatusLabel,
  type BoardStatus,
} from "@/lib/shipments/status";
import type { StatusBoard as StatusBoardData } from "@/server/shipments";

const emptyColumnText = {
  UNHANDLED: "Nincs kezeletlen igény.",
  ORGANIZING: "Nincs szervezés alatt álló fuvar.",
  IN_TRANSIT: "Nincs úton lévő fuvar.",
  COMPLETED: `Az elmúlt ${completedVisibleDays} napban nem teljesült fuvar.`,
} as const satisfies Record<BoardStatus, string>;

export function StatusBoard({ board }: { board: StatusBoardData }) {
  return (
    <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
      {board.columns.map((column) => (
        <section
          key={column.status}
          aria-labelledby={`column-${column.status}`}
          className="flex flex-col gap-2"
        >
          <header className="flex items-center justify-between gap-2 border-b border-border-subtle pb-2">
            <h2 id={`column-${column.status}`} className="text-base font-semibold">
              {shipmentStatusLabel[column.status]}
              <span className="ml-2 font-normal text-text-secondary tabular-nums">
                {column.shipments.length}
              </span>
            </h2>
            {column.attentionCount > 0 ? (
              <p className="flex items-center gap-1 text-sm tabular-nums">
                <AttentionIcon />
                {column.attentionCount}
                <span className="sr-only"> figyelmet igényel</span>
              </p>
            ) : null}
          </header>
          {column.shipments.length === 0 ? (
            <p className="bg-layer p-4 text-sm text-text-secondary">
              {emptyColumnText[column.status]}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {column.shipments.map((shipment) => (
                <li key={shipment.id}>
                  <ShipmentCard shipment={shipment} now={board.generatedAt} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
