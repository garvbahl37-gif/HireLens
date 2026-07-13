"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";

/** Counts up to `value` once it scrolls into view. */
export function AnimatedNumber({
  value,
  duration = 1.1,
  suffix = "",
  fallback = "—",
}: {
  value: number | null;
  duration?: number;
  suffix?: string;
  fallback?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px 120px 0px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || value === null) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return (
    <span ref={ref}>
      {value === null ? fallback : `${display}${suffix}`}
    </span>
  );
}
