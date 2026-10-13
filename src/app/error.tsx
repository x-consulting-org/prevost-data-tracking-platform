"use client";

import { LoadError } from "@/components/feedback/load-error";

/** Errors the shell itself hits (its session and data freshness), shown without the shell. */
export default function RootError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12">
      <LoadError {...props} />
    </main>
  );
}
