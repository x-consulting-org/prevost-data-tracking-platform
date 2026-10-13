import { formatDecimal, formatDuration, formatShare } from "@/lib/format";
import {
  reviewMetricText,
  reviewMetricUnit,
  type ReviewMetricId,
  type Verdict,
} from "@/lib/performance/review";

/** Written out in full so Tailwind finds them. */
export const verdictStyle = {
  strength: {
    solid: "bg-verdict-strength",
    tint: "bg-verdict-strength-tint",
    ink: "text-verdict-strength-ink",
  },
  on_par: {
    solid: "bg-verdict-on-par",
    tint: "bg-verdict-on-par-tint",
    ink: "text-verdict-on-par-ink",
  },
  needs_work: {
    solid: "bg-verdict-needs-work",
    tint: "bg-verdict-needs-work-tint",
    ink: "text-verdict-needs-work-ink",
  },
} as const satisfies Record<Verdict, { solid: string; tint: string; ink: string }>;

export function formatMetric(id: ReviewMetricId, value: number): string {
  switch (reviewMetricUnit[id]) {
    case "duration":
      return formatDuration(value);
    case "share":
      return formatShare(value);
    case "count":
      return `${formatDecimal(value)} igény`;
  }
}

/** "14 lerakás alapján"; nothing for the unanswered count, which is its own sample. */
export function sampleText(id: ReviewMetricId, sampleSize: number): string | null {
  const noun = reviewMetricText[id].sample;
  return noun === null ? null : `${sampleSize} ${noun} alapján`;
}
