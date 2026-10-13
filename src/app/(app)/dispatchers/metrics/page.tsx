import { ArrowLeft } from "@carbon/icons-react";
import { SkeletonPlaceholder } from "@carbon/react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { Suspense } from "react";
import { getMetricSettings } from "@/actions/metric-settings";
import { MetricSettings } from "@/components/dispatchers/metric-settings";

export const metadata: Metadata = {
  title: "Mérőszámok",
};

export default function MetricsPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <NextLink
          href="/dispatchers"
          className="-ml-1 inline-flex w-fit items-center gap-1.5 rounded-lg px-1 py-0.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-focus"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Kollégák
        </NextLink>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Mérőszámok</h1>
          <p className="text-sm text-text-secondary">
            Ezekből a szabályokból számol az értékelés, a Fuvarok kártyái és a figyelmeztetések.
          </p>
        </div>
      </header>
      <Suspense
        fallback={
          <div
            aria-busy="true"
            aria-label="Mérőszámok betöltése"
            className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_23rem]"
          >
            <SkeletonPlaceholder className="h-[40rem]! w-full! rounded-2xl!" />
            <SkeletonPlaceholder className="hidden h-[22rem]! w-full! rounded-2xl! lg:block" />
          </div>
        }
      >
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  const { settings, updatedAt } = await getMetricSettings();
  return <MetricSettings settings={settings} updatedAt={updatedAt} />;
}
