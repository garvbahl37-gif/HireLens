"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

/**
 * A number that counts up to its value on mount, the way every figure on the
 * reference's dashboard does (68 → 168, 29% → 78%). Reduced motion shows the
 * final value straight away.
 */
export function CountUp({
  to,
  delay = 0,
  duration = 1.4,
}: {
  to: number;
  delay?: number;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, to, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [to, delay, duration, reduce]);

  return <>{reduce ? to : n}</>;
}
