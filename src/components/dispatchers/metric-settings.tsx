"use client";

import { ToastNotification } from "@carbon/react";
import { useState } from "react";
import { MetricSettingsForm } from "@/components/dispatchers/metric-settings-form";
import type { MetricSettings as MetricSettingsValues } from "@/lib/performance/settings";

/**
 * The settings form and its save confirmation. The form starts over from every new version
 * (its `key`), so the confirmation lives here, outside it.
 */
export function MetricSettings({
  settings,
  updatedAt,
}: {
  settings: MetricSettingsValues;
  updatedAt: Date;
}) {
  const [saved, setSaved] = useState(false);

  return (
    <>
      <MetricSettingsForm
        key={updatedAt.toISOString()}
        settings={settings}
        updatedAt={updatedAt}
        onSaved={() => setSaved(true)}
      />
      {saved ? (
        <ToastNotification
          kind="success"
          lowContrast
          role="status"
          timeout={5000}
          title="Mentve"
          subtitle="Minden nézet már ezekkel a számokkal számol."
          onClose={() => {
            setSaved(false);
            return false;
          }}
          className="fixed right-4 bottom-4 z-50 md:right-8"
        />
      ) : null}
    </>
  );
}
