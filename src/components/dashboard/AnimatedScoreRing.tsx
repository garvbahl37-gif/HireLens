"use client";

import { useEffect, useId, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { scoreColor } from "@/components/ScoreRing";

/**
 * The score ring — the product's signature number, so it earns real motion.
 *
 * The glow lives INSIDE the <svg> (an feGaussianBlur on a twin arc), never as a
 * blurred DOM element behind it. The old version used `blur-2xl` on an inset-0
 * div, and `filter: blur()` clipped by any `overflow-hidden` ancestor renders as
 * a hard-edged dark rectangle — the "black box" behind the ring. An in-SVG glow
 * is bounded by the ring's own padding and can't clip to a box.
 *
 * The arc draws in, the number counts up, and the whole thing lifts on hover —
 * transform/opacity only, so it stays on the compositor. All of it collapses to
 * a static ring under prefers-reduced-motion.
 */
export function AnimatedScoreRing({
  score,
  size = 132,
  stroke = 10,
}: {
  score: number;
  size?: number;
  stroke?: number;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");

  // Inset the ring so the glow blur has room to fall off INSIDE the svg.
  const pad = Math.round(stroke * 0.9) + 3;
  const r = (size - stroke) / 2 - pad;
  const c = 2 * Math.PI * r;
  const color = scoreColor(clamped);
  const target = c * (1 - clamped / 100);

  // Count up from 0; under reduced motion the number is shown at rest, derived
  // rather than set from the effect.
  const [animated, setAnimated] = useState(0);
  const display = reduce ? clamped : animated;

  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, clamped, {
      duration: 1.2,
      delay: 0.15,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setAnimated(Math.round(v)),
    });
    return () => controls.stop();
  }, [clamped, reduce]);

  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      initial={reduce ? false : { scale: 0.94, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={reduce ? undefined : { scale: 1.03 }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Score ${clamped} out of 100`}
      >
        <defs>
          <linearGradient id={`ring-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.75" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
          <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feComponentTransfer in="b">
              <feFuncA type="linear" slope="0.7" />
            </feComponentTransfer>
          </filter>
          <radialGradient id={`core-${uid}`} cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor={color} stopOpacity="0.10" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* contained inner wash for depth — clipped to the ring, never a box */}
        <circle cx={size / 2} cy={size / 2} r={r} fill={`url(#core-${uid})`} />

        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-edge)"
          strokeWidth={stroke}
        />

        {/* glow twin of the progress arc, blurred inside the svg */}
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
          filter={`url(#glow-${uid})`}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: target }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />

        {/* the progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#ring-${uid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: target }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-extrabold leading-none tabular-nums"
          style={{ fontSize: size * 0.29 }}
        >
          {display}
        </span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
          / 100
        </span>
      </div>
    </motion.div>
  );
}
