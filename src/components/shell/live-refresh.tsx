"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { formatTime } from "@/lib/format";
import { minuteMs } from "@/lib/time";

const refreshIntervalMs = minuteMs;

/**
 * Reloads the screen's data once it is a minute old, but only while the tab is visible: a hidden
 * tab keeps no timer, and one brought back loads again only if its data has aged a minute.
 * `renderedAt` is the server's time of the last load; the dot pings each time it changes.
 * No live region: a minutely announcement would only be noise.
 */
export function LiveRefresh({ renderedAt }: { renderedAt: Date }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRefreshing, startTransition] = useTransition();

  useEffect(() => {
    // The client's clock, so the server's cannot skew it; the page was loaded at mount.
    let refreshedAt = Date.now();
    let timer: number | undefined;

    function refresh() {
      refreshedAt = Date.now();
      startTransition(() => router.refresh());
      // Client-paged data (the Fuvarok table) is not part of the server render.
      void queryClient.invalidateQueries();
      scheduleNext();
    }

    function scheduleNext() {
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, refreshedAt + refreshIntervalMs - Date.now());
    }

    function onVisibilityChange() {
      if (document.visibilityState !== "visible") {
        window.clearTimeout(timer);
      } else if (Date.now() - refreshedAt >= refreshIntervalMs) {
        refresh();
      } else {
        scheduleNext();
      }
    }

    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
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
