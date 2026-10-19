"use client";

import { motion, useReducedMotion } from "motion/react";
import { scoreColor } from "@/components/ScoreRing";
import { CountUp } from "./CountUp";

/**
 * The thin ring + number used in list rows, after the reference's request
 * list: the ring sweeps round while its number counts up to meet it.
 */
export function ProgressRing({
  score,
  size = 22,
  delay = 0,
}: {
  score: number;
  size?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = c * (1 - clamped / 100);

  return (
    <span className="flex items-center gap-2" aria-label={`Score ${clamped} out of 100`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-ink)"
          strokeOpacity={0.1}
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={scoreColor(clamped)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: target }}
          transition={{ duration: 1.3, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <span className="w-6 text-sm tabular-nums text-muted" aria-hidden>
        <CountUp to={clamped} delay={delay} duration={1.3} />
      </span>
    </span>
  );
}
