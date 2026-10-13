import { dayMs, hourMs, minuteMs } from "@/lib/time";

/** The only place that decides the UI's locale and time zone. */
const locale = "hu-HU";
const timeZone = "Europe/Budapest";

const dateTimeFormat = new Intl.DateTimeFormat(locale, {
  timeZone,
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormat = new Intl.DateTimeFormat(locale, {
  timeZone,
  hour: "2-digit",
  minute: "2-digit",
});

const calendarDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const relativeTimeFormat = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

/** "okt. 14. 08:00" in Budapest time. */
export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date);
}

/** "08:00" in Budapest time. */
export function formatTime(date: Date): string {
  return timeFormat.format(date);
}

/** The Budapest calendar day of `date`, as days since the epoch. */
function budapestDayNumber(date: Date): number {
  return Date.parse(calendarDateFormat.format(date)) / dayMs;
}

/**
 * "35 perccel ezelőtt", "6 óra múlva", relative to `now`. From a day away it counts Budapest
 * calendar days, so "holnap" is always tomorrow's date.
 */
export function formatRelative(date: Date, now: Date): string {
  const diffMs = date.getTime() - now.getTime();

  const minutes = Math.round(diffMs / minuteMs);
  if (Math.abs(minutes) < 60) return relativeTimeFormat.format(minutes, "minute");

  const hours = Math.round(diffMs / hourMs);
  if (Math.abs(hours) < 24) return relativeTimeFormat.format(hours, "hour");

  return relativeTimeFormat.format(budapestDayNumber(date) - budapestDayNumber(now), "day");
}

const decimalFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
const percentFormat = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });

/** One decimal, Hungarian style: "1,4". */
export function formatDecimal(value: number): string {
  return decimalFormat.format(value);
}

/** "42 perc", "5,3 óra", "2,4 nap": the largest unit that keeps the number readable. */
export function formatDuration(ms: number): string {
  if (ms < hourMs) return `${Math.round(ms / minuteMs)} perc`;
  if (ms < 2 * dayMs) return `${decimalFormat.format(ms / hourMs)} óra`;
  return `${decimalFormat.format(ms / dayMs)} nap`;
}

/** A share between 0 and 1 as "18%". */
export function formatShare(share: number): string {
  return percentFormat.format(share);
}
