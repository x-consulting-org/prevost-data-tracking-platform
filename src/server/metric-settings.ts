import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { MetricSettings, MetricSettingsUpdateResult } from "@/lib/performance/settings";
import { prisma } from "@/lib/prisma";

/** The migration inserts row 1 and a CHECK keeps it the only one. */
const settingsRow = { id: 1 } as const;

const settingsSelect = {
  reviewWindowDays: true,
  unansweredAfterMinutes: true,
  onTimeToleranceMinutes: true,
  repeatedChangeCount: true,
  onParTolerancePercent: true,
  minMedianSample: true,
  minShareSample: true,
} satisfies Prisma.MetricSettingsSelect satisfies Record<keyof MetricSettings, true>;

export type StoredMetricSettings = { settings: MetricSettings; updatedAt: Date };

export async function findMetricSettings(): Promise<StoredMetricSettings> {
  const { updatedAt, ...settings } = await prisma.metricSettings.findUniqueOrThrow({
    where: settingsRow,
    select: { ...settingsSelect, updatedAt: true },
  });
  return { settings, updatedAt };
}

/**
 * Writes only if nobody saved since `expectedUpdatedAt`, in one conditional statement, so of two
 * people editing at once the second is told instead of silently overwriting the first.
 */
export async function updateMetricSettings(
  settings: MetricSettings,
  expectedUpdatedAt: Date,
): Promise<MetricSettingsUpdateResult> {
  const updatedAt = new Date();
  const { count } = await prisma.metricSettings.updateMany({
    where: { ...settingsRow, updatedAt: expectedUpdatedAt },
    data: { ...settings, updatedAt },
  });
  return count === 1 ? { status: "saved", updatedAt } : { status: "conflict" };
}
