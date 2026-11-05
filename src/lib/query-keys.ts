import type { MetricSettings } from "@/lib/performance/settings";
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
  performance: {
    all: ["performance"] as const,
    /** The review computed with `settings`, saved or not (the Mérőszámok preview). */
    preview: (settings: MetricSettings) =>
      [...queryKeys.performance.all, "preview", settings] as const,
  },
} as const;
