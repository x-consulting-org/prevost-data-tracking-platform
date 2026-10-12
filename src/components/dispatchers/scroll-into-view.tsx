"use client";

import { useEffect, useRef } from "react";

/** Placed at the top of an element, scrolls that element into view once it is on screen. */
export function ScrollIntoView({ className }: { className: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  return <span ref={ref} aria-hidden="true" className={className} />;
}
