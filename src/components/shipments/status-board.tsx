import { AttentionCount } from "@/components/shipments/alert-list";
import { ShipmentCard } from "@/components/shipments/shipment-card";
import { StatusDot, statusStyle } from "@/components/shipments/status-badge";
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

// The entrance runs top to bottom in each lane; cards further down arrive with the last one.
const enterStepMs = 45;
const enterMaxSteps = 8;

/**
 * One lane per status. From xl up the board fills the viewport and each lane scrolls on its own,
 * so every lane's header stays in view.
 */
export function StatusBoard({ board }: { board: StatusBoardData }) {
  return (
    <div className="grid items-start gap-3 md:grid-cols-2 xl:h-[calc(100dvh-13.5rem)] xl:min-h-96 xl:grid-cols-4">
      {board.columns.map((column) => (
        <section
          key={column.status}
          aria-labelledby={`column-${column.status}`}
          className={`flex flex-col rounded-2xl p-1.5 xl:max-h-full ${statusStyle[column.status].tint}`}
        >
          <header className="flex items-center justify-between gap-2 px-2.5 pt-1.5 pb-2.5">
            <h2
              id={`column-${column.status}`}
              className={`flex items-center gap-2 text-sm font-semibold ${statusStyle[column.status].ink}`}
            >
              <StatusDot status={column.status} />
              {shipmentStatusLabel[column.status]}
              <span className="rounded-full bg-layer/70 px-1.5 text-xs font-medium tabular-nums">
                {column.shipments.length}
              </span>
            </h2>
            {column.attentionCount > 0 ? <AttentionCount count={column.attentionCount} /> : null}
          </header>
          {column.shipments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-strong/70 px-4 py-6 text-center text-sm text-text-secondary">
              {emptyColumnText[column.status]}
            </p>
          ) : (
            <ul className="flex [scrollbar-width:thin] flex-col gap-1.5 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain">
              {column.shipments.map((shipment, index) => (
                <li
                  key={shipment.id}
                  className="animate-enter"
                  style={{ animationDelay: `${Math.min(index, enterMaxSteps) * enterStepMs}ms` }}
                >
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
