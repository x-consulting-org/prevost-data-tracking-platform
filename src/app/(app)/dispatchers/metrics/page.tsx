import { SkeletonText } from "@carbon/react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getMetricSettings } from "@/actions/metric-settings";
import { MetricSettingsForm } from "@/components/dispatchers/metric-settings-form";

export const metadata: Metadata = {
  title: "Mérőszámok",
};

export default function MetricsPage() {
  return (
    <Suspense
      fallback={
        <div aria-busy="true" aria-label="Mérőszámok betöltése" className="max-w-[72ch]">
          <SkeletonText paragraph lineCount={12} />
        </div>
      }
    >
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const { settings, updatedAt } = await getMetricSettings();
  // A new version remounts the form, so a save or a reload starts from the stored values.
  return (
    <MetricSettingsForm key={updatedAt.toISOString()} settings={settings} updatedAt={updatedAt} />
  );
}
