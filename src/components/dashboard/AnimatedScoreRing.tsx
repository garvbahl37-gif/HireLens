"use client";

import { useEffect, useId, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { scoreColor } from "@/components/ScoreRing";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Counts a number up from zero once mounted. Under prefers-reduced-motion the
 * final value is shown at rest, derived rather than set from the effect.
 */
function useCountUp(target: number, delay = 0.15) {
  const reduce = useReducedMotion();
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, target, {
      duration: 1.2,
      delay,
      ease: EASE,
      onUpdate: (v) => setAnimated(Math.round(v)),
    });
    return () => controls.stop();
  }, [target, delay, reduce]);

  return { display: reduce ? target : animated, reduce };
}

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
  const uid = useId().replace(/:/g, "");
  const { display, reduce } = useCountUp(clamped);

  // Inset the ring so the glow blur has room to fall off INSIDE the svg.
  const pad = Math.round(stroke * 0.9) + 3;
  const r = (size - stroke) / 2 - pad;
  const c = 2 * Math.PI * r;
  const color = scoreColor(clamped);
  const target = c * (1 - clamped / 100);

  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      initial={reduce ? false : { scale: 0.94, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
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
              <feFuncA type="linear" slope="0.45" />
            </feComponentTransfer>
          </filter>
          <radialGradient id={`core-${uid}`} cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* a pale glass disc inside the ring — clipped to the ring, never a box */}
        <circle cx={size / 2} cy={size / 2} r={r} fill={`url(#core-${uid})`} />

        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(18 33 26 / 0.09)"
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
          transition={{ duration: 1.2, ease: EASE, delay: 0.15 }}
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
          transition={{ duration: 1.2, ease: EASE, delay: 0.15 }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-light leading-none tabular-nums tracking-tight"
          style={{ fontSize: size * 0.29 }}
        >
          {display}
        </span>
        <span className="mt-1 text-[11px] text-muted">of 100</span>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

// Geometry for the gauge, in viewBox units. The arc's centre sits on the
// bottom edge so the half-circle fills the box; the tick ring rides outside it.
const GW = 260;
const GH = 146;
const CX = GW / 2;
const CY = 134;
const R = 92; // the thick arc
const T_IN = 110; // tick ring, inner edge
const T_OUT = 120; // tick ring, outer edge
const TICKS = 48;

function polar(r: number, t: number) {
  // t = 0 → far left, t = 1 → far right, sweeping over the top
  const a = Math.PI + t * Math.PI;
  // Rounded: Node and the browser disagree in the last float digit of
  // sin/cos, which would otherwise fail hydration on every tick.
  const round = (n: number) => Math.round(n * 100) / 100;
  return [round(CX + r * Math.cos(a)), round(CY + r * Math.sin(a))] as const;
}

/**
 * The semicircle match gauge from the reference's profile screen: a thick arc
 * that sweeps from the left to the score, a fine tick ring riding outside it
 * (ticks up to the score are inked, the rest are faint), and the number set
 * light in the middle with its caption underneath.
 *
 * The arc's colour still comes from scoreColor() and always ships with the
 * number. Draws in and counts up once; static under reduced motion.
 */
export function AnimatedScoreGauge({
  score,
  caption = "Overall score",
  className,
}: {
  score: number;
  caption?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const uid = useId().replace(/:/g, "");
  const { display, reduce } = useCountUp(clamped);
  const color = scoreColor(clamped);
  const frac = clamped / 100;

  const [lx, ly] = polar(R, 0);
  const [rx, ry] = polar(R, 1);
  const arc = `M ${lx} ${ly} A ${R} ${R} 0 0 1 ${rx} ${ry}`;

  return (
    <div className={className}>
      <div className="relative mx-auto w-full max-w-[260px]">
        <svg
          viewBox={`0 0 ${GW} ${GH}`}
          className="block w-full overflow-visible"
          role="img"
          aria-label={`${caption}: ${clamped} out of 100`}
        >
          <defs>
            <linearGradient id={`gauge-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
            {/* the hatched glass the unfilled part of the arc is cut from */}
            <pattern
              id={`hatch-${uid}`}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill="rgb(255 255 255 / 0.45)" />
              <rect width="2" height="6" fill="rgb(18 33 26 / 0.08)" />
            </pattern>
          </defs>

          {/* tick ring */}
          {Array.from({ length: TICKS + 1 }, (_, i) => {
            const t = i / TICKS;
            const [x1, y1] = polar(T_IN, t);
            const [x2, y2] = polar(T_OUT, t);
            const on = t <= frac + 1e-6 && clamped > 0;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={on ? color : "rgb(18 33 26 / 0.16)"}
                strokeOpacity={on ? 0.85 : 1}
                strokeWidth={1.4}
                strokeLinecap="round"
              />
            );
          })}

          {/* the track, hatched */}
          <path
            d={arc}
            fill="none"
            stroke={`url(#hatch-${uid})`}
            strokeWidth={26}
          />
          <path
            d={arc}
            fill="none"
            stroke="rgb(255 255 255 / 0.7)"
            strokeWidth={26}
            strokeOpacity={0.35}
          />

          {/* the score */}
          {clamped > 0 && (
            <motion.path
              d={arc}
              fill="none"
              stroke={`url(#gauge-${uid})`}
              strokeWidth={26}
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: frac }}
              transition={{ duration: 1.2, ease: EASE, delay: 0.15 }}
            />
          )}
        </svg>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span
            className="text-[2.6rem] font-light leading-none tabular-nums tracking-tight"
            style={{ color }}
          >
            {display}
          </span>
          <span className="mt-1.5 text-xs text-muted">{caption}</span>
        </div>
      </div>
    </div>
  );
}
