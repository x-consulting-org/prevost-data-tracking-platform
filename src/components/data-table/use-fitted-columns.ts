"use client";

import { useEffect, useMemo, useState } from "react";
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

/** Resolves once the page's web fonts are loaded; measuring earlier would use fallback fonts. */
function useFontsReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void document.fonts.ready.then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return ready;
}

/**
 * The columns with their initial width: fitted to the header and the rows on screen within
 * each column's limits, measured with canvas in the real IBM Plex fonts. Until the fonts are
 * loaded (and during server rendering) every column starts at its minimum width.
 */
export function useFittedColumns<TRow, TColumn extends FittableColumn<TRow>>(
  columns: readonly TColumn[],
  rows: readonly TRow[],
): (TColumn & { size: number })[] {
  const fontsReady = useFontsReady();

  return useMemo(() => {
    if (!fontsReady) {
      return columns.map((column) => ({ ...column, size: column.minSize }));
    }

    const rootStyle = getComputedStyle(document.documentElement);
    const family = {
      sans: rootStyle.getPropertyValue("--font-plex-sans"),
      mono: rootStyle.getPropertyValue("--font-plex-mono"),
    };

    return columns.map((column) => ({
      ...column,
      size: fitColumnSize({
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
    }));
  }, [columns, rows, fontsReady]);
}
