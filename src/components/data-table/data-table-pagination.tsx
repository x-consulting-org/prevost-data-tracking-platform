"use client";

import { Pagination } from "@carbon/react";
import type { PaginationState } from "@tanstack/react-table";
import { pageSizeOptions } from "@/lib/pagination";

type DataTablePaginationProps = {
  pagination: PaginationState;
  rowCount: number;
  onPaginationChange: (pagination: PaginationState) => void;
};

/**
 * Carbon Pagination for TanStack Table (manual / server pagination).
 * Wire from `table.state.pagination`, `table.getRowCount()` and `table.setPagination` (see README).
 */
export function DataTablePagination({
  pagination,
  rowCount,
  onPaginationChange,
}: DataTablePaginationProps) {
  return (
    <Pagination
      page={pagination.pageIndex + 1}
      pageSize={pagination.pageSize}
      pageSizes={[...pageSizeOptions]}
      totalItems={rowCount}
      onChange={({ page, pageSize }) => onPaginationChange({ pageIndex: page - 1, pageSize })}
      backwardText="Előző oldal"
      forwardText="Következő oldal"
      itemsPerPageText="Sorok oldalanként:"
      itemRangeText={(min, max, total) => `${min}–${max} / ${total} sor`}
      pageRangeText={(_current, total) => `/ ${total} oldal`}
      pageSelectLabelText={(total) => `Oldal kiválasztása, összesen ${total} oldal`}
    />
  );
}
