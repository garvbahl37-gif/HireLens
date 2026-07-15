"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { ArrowRight, Quote } from "lucide-react";
import { scoreColor } from "@/components/ScoreRing";

const EASE = [0.16, 1, 0.3, 1] as const;

/** A score ring that draws itself once scrolled into view. */
function Ring({
  score,
  label,
  delay,
  inView,
}: {
  score: number;
  label: string;
  delay: number;
  inView: boolean;
}) {
  // The ring is sized in CSS, not in SVG attributes: at a fixed 132px the two
  // rings plus the arrow overflowed a 390px card and overflow-hidden silently
  // chopped the "After" score off. viewBox lets it scale down on small screens.
  const size = 132;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-24 w-24 sm:h-[132px] sm:w-[132px]">
        <svg viewBox={`0 0 ${size} ${size}`} className="relative h-full w-full">
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
            animate={inView ? { strokeDashoffset: c * (1 - score / 100) } : {}}
            transition={{ duration: 1.3, delay, ease: EASE }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-extrabold tabular-nums sm:text-4xl"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: delay + 0.15, ease: EASE }}
          >
            {score}
          </motion.span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
            / 100
          </span>
        </div>
      </div>
      <p className="text-sm font-semibold text-muted">{label}</p>
    </div>
  );
}

export function Proof() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });

  return (
    <div ref={ref} className="mx-auto max-w-5xl">
      <div className="card relative overflow-hidden p-6 sm:p-12">
        <div className="relative grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-14">
          {/* the two scores */}
          <div className="flex items-center justify-center gap-3 sm:gap-8">
            <Ring score={62} label="Before" delay={0.1} inView={inView} />

            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.9, type: "spring", stiffness: 260, damping: 18 }}
              className="flex flex-col items-center gap-1"
            >
              <ArrowRight className="h-5 w-5 text-accent" />
              <span className="chip border-good/30 text-good">+30</span>
            </motion.div>

            <Ring score={92} label="After" delay={0.55} inView={inView} />
          </div>

          {/* the story */}
          <div>
            <h3 className="text-2xl font-extrabold tracking-tight">
              The same resume.{" "}
              <span className="text-gradient">One round of feedback.</span>
            </h3>
            <p className="mt-4 leading-relaxed text-muted">
              This isn&apos;t a mockup. We ran a real resume against a real
              Senior Frontend Engineer posting — it scored{" "}
              <strong className="text-ink">62</strong>. We applied HireLens&apos;s
              own fix list, changed nothing else, and ran it again:{" "}
              <strong className="text-ink">92</strong>.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1.1, duration: 0.6, ease: EASE }}
              className="mt-6 space-y-3"
            >
              <div className="rounded-xl border border-bad/25 bg-bad/[0.04] p-4">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-bad">
                  <Quote className="h-3 w-3" /> Before
                </p>
                <p className="text-sm text-muted">
                  &ldquo;Worked on the checkout flow&rdquo;
                </p>
              </div>

              <div className="rounded-xl border border-good/25 bg-good/[0.04] p-4">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-good">
                  <Quote className="h-3 w-3" /> After
                </p>
                <p className="text-sm text-ink">
                  &ldquo;Rebuilt the checkout flow in React + TypeScript, cutting
                  cart abandonment 18% and lifting conversion 12% across 2M
                  monthly sessions&rdquo;
                </p>
              </div>
            </motion.div>

            <p className="mt-5 text-xs text-faint">
              Both reviews are in the demo account — log in and see them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
