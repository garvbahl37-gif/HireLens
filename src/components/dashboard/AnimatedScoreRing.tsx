"use client";

import { motion } from "motion/react";
import { scoreColor } from "@/components/ScoreRing";

/** Score ring that draws itself in — for the dashboard hero. */
export function AnimatedScoreRing({
  score,
  size = 132,
  stroke = 10,
}: {
  score: number;
  size?: number;
  stroke?: number;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor(clamped);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* soft glow in the score's own color */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: color, opacity: 0.18 }}
      />
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative"
        role="img"
        aria-label={`Score ${clamped} out of 100`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-edge)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - clamped / 100) }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-extrabold leading-none"
          style={{ fontSize: size * 0.29 }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {clamped}
        </motion.span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
          / 100
        </span>
      </div>
    </div>
  );
}
