"use client";

import type { RowData, Table } from "@tanstack/react-table";
import {
  columnLabel,
  columnResizeStep,
  columnSizeLimits,
  type DataTableFeatures,
} from "@/lib/data-table";

/**
 * One separator per column edge, laid over the table so Carbon's header markup stays intact.
 * Drag (mouse or touch) to resize, double-click to fit the content again, arrow keys to step.
 */
export function ColumnResizeHandles<TRow extends RowData>({
  table,
}: {
  table: Table<DataTableFeatures, TRow>;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {table.getFlatHeaders().map((header) => {
        const { column } = header;
        if (!column.getCanResize()) return null;

        const size = column.getSize();
        const { minSize, maxSize } = columnSizeLimits(column);
        const resizeHandler = header.getResizeHandler();
        const label = columnLabel(column);

        return (
          <div
            key={header.id}
            role="separator"
            aria-orientation="vertical"
            aria-label={`${label} oszlop szélessége`}
            aria-valuenow={size}
            aria-valuemin={minSize}
            aria-valuemax={maxSize}
            tabIndex={0}
            title="Húzd az oszlop szélességéhez, dupla kattintás: igazítás a tartalomhoz"
            className={`group pointer-events-auto absolute top-0 bottom-0 z-10 flex w-2 cursor-col-resize touch-none justify-center select-none focus-visible:outline-2 focus-visible:outline-focus ${
              column.getIsResizing() ? "is-resizing" : ""
            }`}
            style={{ left: header.getStart() + size - 4 }}
            onMouseDown={resizeHandler}
            onTouchStart={resizeHandler}
            onDoubleClick={() => column.resetSize()}
            onKeyDown={(event) => {
              const step =
                event.key === "ArrowRight"
                  ? columnResizeStep
                  : event.key === "ArrowLeft"
                    ? -columnResizeStep
                    : 0;
              if (step === 0) return;
              event.preventDefault();
              table.setColumnSizing((sizing) => ({
                ...sizing,
                [column.id]: Math.min(maxSize, Math.max(minSize, size + step)),
              }));
            }}
          >
            <span className="h-full w-0.5 bg-focus opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-[.is-resizing]:opacity-100" />
          </div>
        );
      })}
    </div>
  );
}
