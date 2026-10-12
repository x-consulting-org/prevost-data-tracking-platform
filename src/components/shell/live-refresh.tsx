"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { formatTime } from "@/lib/format";
import { minuteMs } from "@/lib/time";

const refreshIntervalMs = minuteMs;

/**
 * Reloads the screen's data every minute while the tab is visible, and right away when the
 * person comes back to it. `renderedAt` is the server's time of the last load; the dot pings
 * each time it changes. No live region: a minutely announcement would only be noise.
 */
export function LiveRefresh({ renderedAt }: { renderedAt: Date }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRefreshing, startTransition] = useTransition();

  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== "visible") return;
      startTransition(() => router.refresh());
      // Client-paged data (the Fuvarok table) is not part of the server render.
      void queryClient.invalidateQueries();
    }

    const interval = window.setInterval(refresh, refreshIntervalMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, queryClient]);

  return (
    <p className="flex items-center gap-2 font-medium text-white">
      <span aria-hidden="true" className="relative flex size-2">
        <span
          key={renderedAt.getTime()}
          className="absolute inset-0 animate-ping-once rounded-full bg-status-completed"
        />
        <span className="relative size-2 rounded-full bg-status-completed" />
      </span>
      {isRefreshing ? (
        "Frissítés…"
      ) : (
        <span>
          Frissítve <time dateTime={renderedAt.toISOString()}>{formatTime(renderedAt)}</time>
        </span>
      )}
    </p>
  );
}
