"use client";

import { useMemo } from "react";
import { fitColumnSize } from "@/lib/data-table";

/** What a column needs for content-aware sizing. */
export type FittableColumn<TRow> = {
  id: string;
  header: string;
  /** The text the cell shows; measured in the column's font. */
  text: (row: TRow) => string;
  font: "sans" | "mono";
  /** Sortable headers also hold Carbon's sort icon. */
  sortable: boolean;
  /** Fixed extra width besides text: cell padding, sort icon, tag chrome. */
  chrome: number;
  minSize: number;
  maxSize: number;
};

// Carbon `body-compact-01` for cells and `heading-compact-01` for headers.
const fontSize = "14px";
const letterSpacing = 0.16;
const sortIconWidth = 28;

let measureContext: CanvasRenderingContext2D | null = null;

function measure(text: string, font: string): number {
  measureContext ??= document.createElement("canvas").getContext("2d");
  if (measureContext === null) {
    throw new Error("Canvas 2D context is not available");
  }
  measureContext.font = font;
  return measureContext.measureText(text).width + letterSpacing * text.length;
}

/**
 * Width per column fitted to the header and the rows on screen, within each column's limits.
 * Measures with canvas in the real IBM Plex fonts; returns nothing until it runs in the browser.
 */
export function useFittedColumnSizes<TRow>(
  columns: readonly FittableColumn<TRow>[],
  rows: readonly TRow[],
): Partial<Record<string, number>> {
  return useMemo(() => {
    if (typeof document === "undefined" || rows.length === 0) return {};

    const rootStyle = getComputedStyle(document.documentElement);
    const family = {
      sans: rootStyle.getPropertyValue("--font-plex-sans"),
      mono: rootStyle.getPropertyValue("--font-plex-mono"),
    };

    return Object.fromEntries(
      columns.map((column) => [
        column.id,
        fitColumnSize({
          headerWidth:
            measure(column.header, `600 ${fontSize} ${family.sans}`) +
            (column.sortable ? sortIconWidth : 0),
          cellWidths: rows.map((row) =>
            measure(column.text(row), `400 ${fontSize} ${family[column.font]}`),
          ),
          chrome: column.chrome,
          minSize: column.minSize,
          maxSize: column.maxSize,
        }),
      ]),
    );
  }, [columns, rows]);
}
