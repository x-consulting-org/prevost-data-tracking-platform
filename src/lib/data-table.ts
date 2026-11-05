import {
  type Column,
  columnResizingFeature,
  columnSizingFeature,
  rowPaginationFeature,
  rowSortingFeature,
  type RowData,
  type SortDirection,
  tableFeatures,
} from "@tanstack/react-table";

/** Default feature set for server-driven data tables in this app. */
export const dataTableFeatures = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  columnSizingFeature,
  columnResizingFeature,
});

export type DataTableFeatures = typeof dataTableFeatures;

/** Keyboard resize step for a column separator, in pixels. */
export const columnResizeStep = 8;

/**
 * Initial column width from its content: the widest of the header and the cells,
 * plus the column's fixed chrome (padding, icons), clamped to the column's limits.
 */
export function fitColumnSize({
  headerWidth,
  cellWidths,
  chrome,
  minSize,
  maxSize,
}: {
  headerWidth: number;
  cellWidths: readonly number[];
  chrome: number;
  minSize: number;
  maxSize: number;
}): number {
  const content = Math.max(headerWidth, ...cellWidths) + chrome;
  return Math.min(maxSize, Math.max(minSize, Math.ceil(content)));
}

type DataTableColumn<TRow extends RowData> = Column<DataTableFeatures, TRow>;

/** Every data table column has a plain text header; controls (sorting, resizing) are named by it. */
export function columnLabel<TRow extends RowData>(column: DataTableColumn<TRow>): string {
  const { header } = column.columnDef;
  if (typeof header !== "string") {
    throw new Error(`Data table column "${column.id}" needs a plain text header`);
  }
  return header;
}

/** Every data table column declares its width limits; resizing is clamped to them. */
export function columnSizeLimits<TRow extends RowData>(
  column: DataTableColumn<TRow>,
): { minSize: number; maxSize: number } {
  const { minSize, maxSize } = column.columnDef;
  if (minSize === undefined || maxSize === undefined) {
    throw new Error(`Data table column "${column.id}" needs a minSize and a maxSize`);
  }
  return { minSize, maxSize };
}

/** Accessible name of a sortable header: what clicking it does next. */
export function sortActionLabel(label: string, next: SortDirection | false): string {
  switch (next) {
    case "asc":
      return `Rendezés ${label} szerint, növekvő sorrendben`;
    case "desc":
      return `Rendezés ${label} szerint, csökkenő sorrendben`;
    case false:
      return `${label} szerinti rendezés megszüntetése`;
  }
}
