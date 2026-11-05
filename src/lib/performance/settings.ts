import { z } from "zod";
import { minuteMs } from "@/lib/time";

const whole = (min: number, max: number) =>
  z
    .number({ error: "Adj meg egy egész számot." })
    .int("Adj meg egy egész számot.")
    .min(min, `Legalább ${min} lehet.`)
    .max(max, `Legfeljebb ${max} lehet.`);

/**
 * The thresholds the alerts, the shipment cards and the performance review share. The
 * database row (`MetricSettings`) holds the values; this schema is the authority on what a
 * valid value is. The ranges keep a typo from switching a metric off or flooding the alerts.
 */
export const metricSettingsSchema = z.object({
  reviewWindowDays: whole(7, 180),
  unansweredAfterMinutes: whole(5, 24 * 60),
  onTimeToleranceMinutes: whole(0, 240),
  repeatedChangeCount: whole(2, 10),
  onParTolerancePercent: whole(1, 50),
  minMedianSample: whole(1, 50),
  minShareSample: whole(1, 100),
});

export type MetricSettings = z.infer<typeof metricSettingsSchema>;

/** A save names the version it edited, so a save over someone else's change is refused. */
export const metricSettingsUpdateSchema = z.object({
  settings: metricSettingsSchema,
  expectedUpdatedAt: z.date(),
});

export type MetricSettingsUpdateResult =
  | { status: "saved"; updatedAt: Date }
  /** Someone saved in between; nothing was written. */
  | { status: "conflict" };

export function unansweredAfterMs(settings: Pick<MetricSettings, "unansweredAfterMinutes">) {
  return settings.unansweredAfterMinutes * minuteMs;
}

export function onTimeToleranceMs(settings: Pick<MetricSettings, "onTimeToleranceMinutes">) {
  return settings.onTimeToleranceMinutes * minuteMs;
}
