"use client";

import { useId, useRef, useState } from "react";
import { motion } from "motion/react";

export type TrendPoint = {
  id: string;
  score: number;
  label: string; // job title
  date: string; // pre-formatted
};

const W = 480;
const H = 230;
const PAD = { t: 24, r: 18, b: 22, l: 34 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Single-series score trend (0–100 over time).
 * One hue only — good/warn/bad stay reserved for score grades.
 */
export function ScoreTrend({ points }: { points: TrendPoint[] }) {
  const uid = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const n = points.length;
  const x = (i: number) =>
    n === 1 ? PAD.l + PLOT_W / 2 : PAD.l + (i * PLOT_W) / (n - 1);
  const y = (s: number) => PAD.t + (1 - Math.max(0, Math.min(100, s)) / 100) * PLOT_H;

  const coords = points.map((p, i) => ({ ...p, cx: x(i), cy: y(p.score) }));
  const linePath = smoothPath(coords.map((c) => [c.cx, c.cy]));
  const baseY = PAD.t + PLOT_H;
  const areaPath = `${linePath} L ${coords[n - 1].cx} ${baseY} L ${coords[0].cx} ${baseY} Z`;

  const avg = Math.round(points.reduce((s, p) => s + p.score, 0) / n);
  const avgY = y(avg);
  const last = coords[n - 1];
  const active = hover !== null ? coords[hover] : null;

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // map pointer x → viewBox x → nearest index
    const vx = ((e.clientX - r.left) / r.width) * W;
    let nearest = 0;
    let best = Infinity;
    coords.forEach((c, i) => {
      const d = Math.abs(c.cx - vx);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHover(nearest);
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Resume score trend across ${n} reviews, most recent ${last.score} out of 100`}
      >
        <defs>
          <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* recessive gridlines + y ticks, so the 0–100 scale is legible */}
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line
              x1={PAD.l}
              x2={PAD.l + PLOT_W}
              y1={y(g)}
              y2={y(g)}
              stroke="var(--color-edge)"
              strokeWidth={1}
              opacity={g === 0 ? 1 : 0.55}
            />
            {(g === 0 || g === 50 || g === 100) && (
              <text
                x={PAD.l - 8}
                y={y(g)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill="var(--color-faint)"
              >
                {g}
              </text>
            )}
          </g>
        ))}

        {/* average reference line */}
        <line
          x1={PAD.l}
          x2={PAD.l + PLOT_W}
          y1={avgY}
          y2={avgY}
          stroke="var(--color-faint)"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.6}
        />
        <text
          x={PAD.l + PLOT_W}
          y={avgY - 6}
          textAnchor="end"
          fontSize={11}
          fill="var(--color-faint)"
        >
          avg {avg}
        </text>

        {/* area + line */}
        <motion.path
          d={areaPath}
          fill={`url(#fill-${uid})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.35, ease: EASE }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: EASE }}
        />

        {/* crosshair */}
        {active && (
          <line
            x1={active.cx}
            x2={active.cx}
            y1={PAD.t}
            y2={baseY}
            stroke="var(--color-edge2)"
            strokeWidth={1}
          />
        )}

        {/* markers — 2px surface ring so they read on the fill */}
        {coords.map((c, i) => (
          <motion.circle
            key={c.id}
            cx={c.cx}
            cy={c.cy}
            r={hover === i ? 6 : 4}
            fill="var(--color-accent)"
            stroke="var(--color-card)"
            strokeWidth={2}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.06, ease: EASE }}
            style={{ transformOrigin: `${c.cx}px ${c.cy}px` }}
          />
        ))}

        {/* direct-label the latest point only */}
        {!active && (
          <motion.text
            x={last.cx}
            y={last.cy - 12}
            textAnchor={n === 1 ? "middle" : "end"}
            fontSize={13}
            fontWeight={700}
            fill="var(--color-ink)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            {last.score}
          </motion.text>
        )}
      </svg>

      {/* tooltip — flips at the edges so it never leaves the card */}
      {active &&
        (() => {
          const leftPct = (active.cx / W) * 100;
          const topPct = (active.cy / H) * 100;
          const xAnchor =
            leftPct < 28 ? "0%" : leftPct > 72 ? "-100%" : "-50%";
          // near the top of the plot, drop the tooltip below the point instead
          const flipDown = topPct < 42;
          const yAnchor = flipDown ? "0%" : "-100%";

          return (
            <div
              className="pointer-events-none absolute z-10 rounded-xl border border-edge2 bg-bg/95 px-3 py-2 shadow-xl backdrop-blur"
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: `translate(${xAnchor}, ${yAnchor})`,
                marginTop: flipDown ? 14 : -14,
              }}
            >
              <p className="whitespace-nowrap text-xs font-bold">
                {active.score}/100
              </p>
              <p className="max-w-[170px] truncate text-[11px] text-muted">
                {active.label}
              </p>
              <p className="text-[11px] text-faint">{active.date}</p>
            </div>
          );
        })()}
    </div>
  );
}

/* Catmull-Rom → cubic bezier, for a smooth but non-overshooting curve. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
  if (pts.length === 2)
    return `M ${pts[0][0]} ${pts[0][1]} L ${pts[1][0]} ${pts[1][1]}`;

  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const t = 0.5; // tension
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * t * 2;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * t * 2;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * t * 2;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * t * 2;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}
