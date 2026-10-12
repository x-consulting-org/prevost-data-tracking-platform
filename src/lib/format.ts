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

const relativeTimeFormat = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

/** "okt. 14. 08:00" in Budapest time. */
export function formatDateTime(date: Date): string {
  return dateTimeFormat.format(date);
}

/** "6 óra múlva", "tegnap", "35 perccel ezelőtt", relative to `now`. */
export function formatRelative(date: Date, now: Date): string {
  const diffMs = date.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);

  if (absMs < hourMs) return relativeTimeFormat.format(Math.round(diffMs / minuteMs), "minute");
  if (absMs < dayMs) return relativeTimeFormat.format(Math.round(diffMs / hourMs), "hour");
  return relativeTimeFormat.format(Math.round(diffMs / dayMs), "day");
}
