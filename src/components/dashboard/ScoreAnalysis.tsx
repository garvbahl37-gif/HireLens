"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { CountUp } from "./CountUp";

export type TrendPoint = {
  id: string;
  score: number;
  /** the job-match dimension, drawn as the dashed comparison line */
  match: number | null;
  label: string;
  company: string | null;
  /** short axis label, e.g. "Oct 3" */
  tick: string;
  date: string;
};

const PAD = { t: 34, r: 14, b: 50, l: 34 };

const EASE = [0.16, 1, 0.3, 1] as const;

/** Soft versions of the grade colours, for the heat strip under the plot. */
function heat(score: number) {
  if (score >= 75) return "#8fd18a";
  if (score >= 55) return "#e8c47c";
  return "#eba2ae";
}

/**
 * The overview's headline card: every review's overall score over time, with
 * the job-match dimension dashed behind it. The coloured strip on the floor of
 * the chart is a heat strip, coloured by the score at that point of the
 * timeline, so a run of weak reviews shows up as a band of red.
 */
export function ScoreAnalysis({
  points,
  count,
  avg,
  best,
}: {
  points: TrendPoint[];
  count: number;
  avg: number | null;
  best: number | null;
}) {
  return (
    <section className="card flex w-full min-w-0 flex-col p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div>
          <h2 className="text-lg font-medium tracking-tight">Score analysis</h2>
          <p className="mt-1 text-sm text-muted">
            Every review you&apos;ve run, scored out of 100.
          </p>
        </div>
        <dl className="flex divide-x divide-ink/10">
          <Kpi label="Reviews" value={count} />
          <Kpi label="Average" value={avg} />
          <Kpi label="Best" value={best} />
        </dl>
      </div>

      {points.length >= 2 ? (
        <Chart points={points} />
      ) : (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-ink/15 px-6 py-12 text-center">
          <p className="font-semibold">
            {points.length === 0
              ? "Your score history starts with your first review"
              : `One review in: ${points[0].score}/100`}
          </p>
          <p className="mt-1.5 max-w-sm text-sm text-muted">
            Run {points.length === 0 ? "a review" : "another review"} and this
            chart tracks your resume as it improves.
          </p>
          <Link href="/dashboard/new" className="btn btn-primary mt-5">
            {points.length === 0 ? "Run your first review" : "Run another review"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="px-5 first:pl-0 last:pr-0 sm:px-7">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-[1.9rem] font-normal leading-none tabular-nums tracking-tight">
        {value === null ? "—" : <CountUp to={value} delay={0.25} />}
      </dd>
    </div>
  );
}

function Chart({ points }: { points: TrendPoint[] }) {
  const uid = useId().replace(/:/g, "");
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  // The chart lays itself out at its real pixel width rather than scaling one
  // fixed drawing: scaled down to a phone, a 760-wide viewBox shrank the axis
  // labels to about 5px. 760 is only the first-paint guess before measuring.
  const [W, setW] = useState(760);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setW(Math.max(280, Math.round(entry.contentRect.width)))
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = W < 520;
  const H = narrow ? 240 : 290;
  const PLOT_W = W - PAD.l - PAD.r;
  const PLOT_H = H - PAD.t - PAD.b;
  const BASE = PAD.t + PLOT_H;

  const n = points.length;
  const x = (i: number) => PAD.l + (i * PLOT_W) / (n - 1);
  const y = (s: number) => PAD.t + (1 - Math.max(0, Math.min(100, s)) / 100) * PLOT_H;

  const coords = points.map((p, i) => ({ ...p, cx: x(i), cy: y(p.score) }));
  const line = smoothPath(coords.map((c) => [c.cx, c.cy]));
  const matchPts = coords.filter((c) => c.match !== null);
  const matchLine =
    matchPts.length >= 2
      ? smoothPath(matchPts.map((c) => [c.cx, y(c.match as number)]))
      : null;

  // up to six evenly spaced guides (four on a phone), always including the
  // first and last review
  const guideCount = Math.min(narrow ? 4 : 6, n);
  const guides = Array.from(
    new Set(
      Array.from({ length: guideCount }, (_, k) =>
        Math.round((k * (n - 1)) / (guideCount - 1))
      )
    )
  );

  const active = hover !== null ? coords[hover] : null;

  function nearest(clientX: number) {
    const el = wrapRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const vx = ((clientX - r.left) / r.width) * W;
    let best = 0;
    let dist = Infinity;
    coords.forEach((c, i) => {
      const d = Math.abs(c.cx - vx);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    return best;
  }

  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center gap-5 text-xs text-muted">
        <span className="flex items-center gap-2">
          <span className="h-[3px] w-5 rounded-full bg-accent2" /> Overall score
        </span>
        {matchLine && (
          <span className="flex items-center gap-2">
            <span className="w-5 border-t-2 border-dashed border-ink/35" /> Job match
          </span>
        )}
      </div>

      <div
        ref={wrapRef}
        className="relative cursor-pointer"
        onPointerMove={(e) => setHover(nearest(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          const i = nearest(e.clientX);
          if (i !== null) router.push(`/dashboard/reviews/${coords[i].id}`);
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`Resume score across ${n} reviews, most recent ${coords[n - 1].score} out of 100`}
        >
          <defs>
            <linearGradient id={`heat-${uid}`} x1="0" x2="1" y1="0" y2="0">
              {coords.map((c) => (
                <stop
                  key={c.id}
                  offset={(c.cx - PAD.l) / PLOT_W}
                  style={{ stopColor: heat(c.score) }}
                />
              ))}
            </linearGradient>
          </defs>

          {/* y scale */}
          {[20, 40, 60, 80, 100].map((g) => (
            <text
              key={g}
              x={PAD.l - 10}
              y={y(g)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={12}
              fill="var(--color-faint)"
            >
              {g}
            </text>
          ))}

          {/* vertical guides, each topped with that review's score */}
          {guides.map((i) => (
            <g key={coords[i].id}>
              <line
                x1={coords[i].cx}
                x2={coords[i].cx}
                y1={PAD.t - 6}
                y2={BASE}
                stroke="var(--color-ink)"
                strokeOpacity={0.14}
                strokeDasharray="3 4"
              />
              <text
                x={coords[i].cx}
                y={PAD.t - 14}
                textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                fontSize={11.5}
                fill="var(--color-faint)"
              >
                {coords[i].score}
              </text>
              <text
                x={coords[i].cx}
                y={BASE + 34}
                textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                fontSize={12}
                fill="var(--color-muted)"
              >
                {coords[i].tick}
              </text>
            </g>
          ))}

          {/* the job-match comparison, dashed and recessive */}
          {matchLine && (
            <motion.path
              d={matchLine}
              fill="none"
              stroke="var(--color-ink)"
              strokeOpacity={0.32}
              strokeWidth={1.4}
              strokeDasharray="4 4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            />
          )}

          <motion.path
            d={line}
            fill="none"
            stroke="#2a9d36"
            strokeWidth={2.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: EASE }}
          />

          {/* heat strip on the floor of the chart */}
          <motion.rect
            x={PAD.l}
            y={BASE + 8}
            height={7}
            rx={3.5}
            fill={`url(#heat-${uid})`}
            initial={{ width: 0 }}
            animate={{ width: PLOT_W }}
            transition={{ duration: 1.2, delay: 0.2, ease: EASE }}
          />

          {active && (
            <>
              <line
                x1={active.cx}
                x2={active.cx}
                y1={PAD.t - 6}
                y2={BASE}
                stroke="var(--color-accent)"
                strokeOpacity={0.5}
              />
              <circle
                cx={active.cx}
                cy={active.cy}
                r={6}
                fill="#2a9d36"
                stroke="#fff"
                strokeWidth={2.5}
              />
            </>
          )}
          {!active && (
            <circle
              cx={coords[n - 1].cx}
              cy={coords[n - 1].cy}
              r={5}
              fill="#2a9d36"
              stroke="#fff"
              strokeWidth={2.5}
            />
          )}
        </svg>

        {active &&
          (() => {
            const leftPct = (active.cx / W) * 100;
            const topPct = (active.cy / H) * 100;
            const xAnchor = leftPct < 25 ? "0%" : leftPct > 75 ? "-100%" : "-50%";
            const flipDown = topPct < 40;
            return (
              <div
                className="pointer-events-none absolute z-10 rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-[0_12px_30px_-12px_rgba(18,36,26,0.4)] backdrop-blur"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: `translate(${xAnchor}, ${flipDown ? "0%" : "-100%"})`,
                  marginTop: flipDown ? 14 : -14,
                }}
              >
                <p className="whitespace-nowrap text-sm font-bold tabular-nums">
                  {active.score}/100
                  {active.match !== null && (
                    <span className="ml-2 font-medium text-muted">
                      match {active.match}
                    </span>
                  )}
                </p>
                <p className="max-w-[200px] truncate text-xs text-muted">
                  {active.label}
                  {active.company ? `, ${active.company}` : ""}
                </p>
                <p className="text-xs text-faint">{active.date}</p>
              </div>
            );
          })()}
      </div>
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
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}
