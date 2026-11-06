"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { formatTime } from "@/lib/format";
import { minuteMs } from "@/lib/time";

/** How often a screen in use reloads; also the age past which a returning user gets fresh data. */
const refreshIntervalMs = 5 * minuteMs;

/** Signs that someone is at the screen. Passive: they only stamp a time. */
const activityEvents = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

/**
 * Keeps the card timers and statuses current while someone is using the screen: a visible tab
 * reloads every `refreshIntervalMs`, but only if there was activity since the last load. A screen
 * left open with nobody at it stops after one interval, and a hidden tab holds no timer, so neither
 * costs requests or database reads. The first activity, focus or return to the tab after that
 * reloads at once if the data has aged an interval. Clicking the status reloads straight away.
 * `renderedAt` is the server's time of the last load; the dot pings each time it changes.
 * No live region: an announcement on every reload would only be noise.
 */
export function LiveRefresh({ renderedAt }: { renderedAt: Date }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isRefreshing, startTransition] = useTransition();
  // Set by the effect, which owns the timer, so a click restarts the interval too.
  const refreshNow = useRef<() => void>(undefined);

  useEffect(() => {
    // The client's clock, so the server's cannot skew it. The page was loaded at mount, and
    // whoever opened it is at the screen.
    let refreshedAt = Date.now();
    let activeAt = refreshedAt;
    let timer: number | undefined;

    function refresh() {
      refreshedAt = Date.now();
      startTransition(() => router.refresh());
      // Client-paged data (the Fuvarok table) is not part of the server render.
      void queryClient.invalidateQueries();
      schedule();
    }

    function schedule() {
      window.clearTimeout(timer);
      timer = undefined;
      if (document.visibilityState !== "visible") return;
      timer = window.setTimeout(onTimer, refreshedAt + refreshIntervalMs - Date.now());
    }

    // Idle since the last load: let the timer lapse; the next activity picks it up again.
    function onTimer() {
      timer = undefined;
      if (activeAt > refreshedAt) refresh();
    }

    function onActivity() {
      activeAt = Date.now();
      if (document.visibilityState !== "visible") return;
      if (activeAt - refreshedAt >= refreshIntervalMs) refresh();
      else if (timer === undefined) schedule();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") onActivity();
      else schedule();
    }

    refreshNow.current = refresh;
    schedule();
    const options = { passive: true } as const;
    for (const event of activityEvents) window.addEventListener(event, onActivity, options);
    window.addEventListener("focus", onActivity);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(timer);
      refreshNow.current = undefined;
      for (const event of activityEvents) window.removeEventListener(event, onActivity);
      window.removeEventListener("focus", onActivity);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router, queryClient]);

  return (
    <button
      type="button"
      onClick={() => refreshNow.current?.()}
      disabled={isRefreshing}
      title="Adatok frissítése most"
      className="flex cursor-pointer items-center gap-2 self-start rounded font-medium text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-default disabled:no-underline"
    >
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
    </button>
  );
}
