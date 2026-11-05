"use client";

import { SettingsAdjust } from "@carbon/icons-react";
import { Button, ContentSwitcher, Switch } from "@carbon/react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { dispatchersHref, reviewViews, type ReviewView } from "@/lib/shipments/schemas";

const viewLabel = { people: "Kollégák", metrics: "Mutatók" } as const satisfies Record<
  ReviewView,
  string
>;

/** Switches the review between its two views and leads to the rules it is computed by. */
export function ReviewToolbar({ view }: { view: ReviewView }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <ContentSwitcher
        size="md"
        className="w-56"
        selectedIndex={reviewViews.indexOf(view)}
        onChange={({ index }) => {
          const next = index === undefined ? undefined : reviewViews[index];
          if (next === undefined) {
            throw new Error(`View switch reported an unknown index ${String(index)}`);
          }
          router.replace(dispatchersHref({ view: next, dispatcherId: undefined }), {
            scroll: false,
          });
        }}
      >
        {reviewViews.map((option) => (
          <Switch key={option} name={option} text={viewLabel[option]} />
        ))}
      </ContentSwitcher>
      <Button
        as={NextLink}
        href="/dispatchers/metrics"
        kind="tertiary"
        size="md"
        renderIcon={SettingsAdjust}
      >
        Mérőszámok
      </Button>
    </div>
  );
}
