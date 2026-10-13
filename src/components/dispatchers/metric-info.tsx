"use client";

import { Information } from "@carbon/icons-react";
import { Toggletip, ToggletipActions, ToggletipButton, ToggletipContent } from "@carbon/react";
import NextLink from "next/link";
import { reviewMetricText, type ReviewMetricId } from "@/lib/performance/review";

/** What a metric measures, one click away from its number. */
export function MetricInfo({ id }: { id: ReviewMetricId }) {
  const text = reviewMetricText[id];

  return (
    <Toggletip align="bottom" autoAlign>
      <ToggletipButton
        label={`Mit mér: ${text.label}`}
        className="text-text-helper hover:text-text-primary"
      >
        <Information size={16} />
      </ToggletipButton>
      <ToggletipContent>
        <p className="text-sm">{text.definition}</p>
        <ToggletipActions>
          <NextLink
            href="/dispatchers/metrics"
            className="text-sm font-medium text-sunflower-gold-300 underline-offset-2 hover:underline"
          >
            Küszöbök a Mérőszámok oldalon
          </NextLink>
        </ToggletipActions>
      </ToggletipContent>
    </Toggletip>
  );
}
