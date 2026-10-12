import { z } from "zod";

/** Page sizes offered by `DataTablePagination`; the largest one is the server-side cap. */
export const pageSizeOptions = [10, 25, 50, 100] as const;

export const defaultPageSize = pageSizeOptions[1];

/** Aligns with TanStack Table `PaginationState` (0-based `pageIndex`). */
export const paginationInputSchema = z.object({
  pageIndex: z.number().int().min(0).default(0),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(pageSizeOptions[pageSizeOptions.length - 1])
    .default(defaultPageSize),
});

type PaginationInput = z.infer<typeof paginationInputSchema>;

export type PaginatedResult<T> = {
  items: T[];
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  /** Total rows across all pages — pass to TanStack Table as `rowCount`. */
  rowCount: number;
};

export function toSkipTake({ pageIndex, pageSize }: PaginationInput): {
  skip: number;
  take: number;
} {
  return { skip: pageIndex * pageSize, take: pageSize };
}

export function toPaginatedResult<T>({
  items,
  rowCount,
  pageIndex,
  pageSize,
}: {
  items: T[];
  rowCount: number;
  pageIndex: number;
  pageSize: number;
}): PaginatedResult<T> {
  return { items, pageIndex, pageSize, pageCount: Math.ceil(rowCount / pageSize), rowCount };
}
