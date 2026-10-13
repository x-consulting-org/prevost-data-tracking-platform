"use server";

import { parseActionInput } from "@/actions/helpers/parse";
import { metricSettingsSchema, type MetricSettings } from "@/lib/performance/settings";
import { findMetricSettings } from "@/server/metric-settings";
import { findPerformanceReview } from "@/server/performance";
import { requirePrincipal } from "@/server/principal";

// Every signed-in user may read the review for now (ADR 0004 says when this changes).

export async function getPerformanceReview() {
  await requirePrincipal();
  const { settings } = await findMetricSettings();
  return findPerformanceReview(new Date(), settings);
}

/** The review as it would read with `input` saved; nothing is written. */
export async function previewPerformanceReview(input: MetricSettings) {
  await requirePrincipal();
  return findPerformanceReview(new Date(), parseActionInput(metricSettingsSchema, input));
}
