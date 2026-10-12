import { z } from "zod";

/** Page sizes offered by `DataTablePagination`; the largest one is the server-side cap. */
export const pageSizeOptions = [10, 25, 50, 100] as const;

/** Aligns with TanStack Table `PaginationState` (0-based `pageIndex`). */
export const paginationInputSchema = z.object({
  pageIndex: z.number().int().min(0).default(0),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(pageSizeOptions[pageSizeOptions.length - 1])
    .default(pageSizeOptions[0]),
});

export type PaginationInput = z.infer<typeof paginationInputSchema>;

export const sortingItemSchema = z.object({
  id: z.string().min(1),
  desc: z.boolean(),
});

/** Aligns with TanStack Table `SortingState`. */
export const sortingInputSchema = z.array(sortingItemSchema).default([]);

export type SortingInput = z.infer<typeof sortingInputSchema>;

export const listQueryInputSchema = paginationInputSchema.extend({
  sorting: sortingInputSchema,
});

export type ListQueryInput = z.infer<typeof listQueryInputSchema>;

export type PaginatedResult<T> = {
  items: T[];
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  /** Total rows across all pages — pass to TanStack Table as `rowCount`. */
  rowCount: number;
};

export function parseListQueryInput(input: unknown): ListQueryInput {
  return listQueryInputSchema.parse(input);
}

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
  const pageCount = pageSize > 0 ? Math.ceil(rowCount / pageSize) : 0;

  return {
    items,
    pageIndex,
    pageSize,
    pageCount,
    rowCount,
  };
}
