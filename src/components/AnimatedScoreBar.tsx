"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
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
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color }}>
          {clamped}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/[0.08]">
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

/**
 * A glass stat tile, after the reference's Type / Deadline / Rate / Method
 * row: an icon and label up top, and a hatched glass block rising from the
 * floor to the score's height with the number set light inside it. The block's
 * top edge (and a faint tint) come from scoreColor(); the number always ships
 * with it.
 */
export function ScoreTile({
  label,
  score,
  icon,
  delay = 0,
}: {
  label: string;
  score: number;
  icon?: ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px 120px 0px" });
  const reduce = useReducedMotion();

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const color = scoreColor(clamped);
  // never let the block get so short that the number spills out of it
  const height = `${Math.max(38, clamped)}%`;

  return (
    <div
      ref={ref}
      className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/35"
    >
      <div className="flex min-w-0 items-center gap-2 p-3 sm:p-3.5">
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/70 text-muted">
            {icon}
          </span>
        )}
        <span className="min-w-0 text-sm leading-tight text-muted">{label}</span>
      </div>

      <div className="relative h-24 sm:h-36 xl:h-40" aria-hidden>
        <motion.div
          className="absolute inset-x-1.5 bottom-1.5 rounded-xl"
          style={{
            background: `repeating-linear-gradient(135deg, rgb(255 255 255 / 0.55) 0 2px, transparent 2px 7px), color-mix(in srgb, ${color} 10%, rgb(255 255 255 / 0.45))`,
            boxShadow: `inset 0 2px 0 0 ${color}`,
          }}
          initial={reduce ? false : { height: 0 }}
          animate={inView || reduce ? { height } : { height: 0 }}
          transition={{ duration: 1, delay, ease: EASE }}
        />
      </div>

      <p className="absolute bottom-4 left-4 flex items-baseline gap-1">
        <span className="text-[1.9rem] font-light leading-none tabular-nums tracking-tight text-ink">
          {clamped}
        </span>
        <span className="text-xs text-faint">/ 100</span>
      </p>
    </div>
  );
}
