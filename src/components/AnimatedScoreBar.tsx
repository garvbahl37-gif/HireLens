"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { scoreColor } from "@/components/ScoreRing";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Score bar that fills from zero, and counts its number up, once in view. */
export function AnimatedScoreBar({
  label,
  score,
  note,
  delay = 0,
}: {
  label: string;
  score: number;
  note?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px 120px 0px" });

  const clamped = Math.max(0, Math.min(100, score));
  const color = scoreColor(clamped);

  return (
    <div ref={ref}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-sm font-bold tabular-nums" style={{ color }}>
          {clamped}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-edge">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={inView ? { width: `${clamped}%` } : { width: 0 }}
          transition={{ duration: 1, delay, ease: EASE }}
        />
      </div>
      {note && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{note}</p>
      )}
    </div>
  );
}
