"use server";

import type { z } from "zod";
import { parseActionInput } from "@/actions/helpers/parse";
import { metricSettingsUpdateSchema } from "@/lib/performance/settings";
import { findMetricSettings, updateMetricSettings } from "@/server/metric-settings";
import { requirePrincipal } from "@/server/principal";

// Every signed-in user may change the settings for now (ADR 0004 says when this changes).

export async function getMetricSettings() {
  await requirePrincipal();
  return findMetricSettings();
}

export async function saveMetricSettings(input: z.input<typeof metricSettingsUpdateSchema>) {
  await requirePrincipal();
  const { settings, expectedUpdatedAt } = parseActionInput(metricSettingsUpdateSchema, input);
  return updateMetricSettings(settings, expectedUpdatedAt);
}
