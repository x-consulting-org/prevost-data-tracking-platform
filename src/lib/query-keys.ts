import type { ShipmentPageInput } from "@/lib/shipments/schemas";

/**
 * Hierarchical query-key factory (TanStack Query convention).
 * Invalidate with prefixes: `queryClient.invalidateQueries({ queryKey: queryKeys.shipments.all })`.
 */
export const queryKeys = {
  shipments: {
    all: ["shipments"] as const,
    pages: () => [...queryKeys.shipments.all, "page"] as const,
    page: (input: ShipmentPageInput) => [...queryKeys.shipments.pages(), input] as const,
    details: () => [...queryKeys.shipments.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.shipments.details(), id] as const,
  },
} as const;
