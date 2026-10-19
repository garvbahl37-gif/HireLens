"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { ArrowRight } from "lucide-react";
import { scoreColor } from "@/components/ScoreRing";
import { EASE, Rise, ScrollWords } from "./motion";

/**
 * Where the reference shows customer testimonials, HireLens shows its one
 * real result: the same resume, scored before and after its own fix list.
 * Same layout — a glass panel greening toward the bottom, one large card on
 * the left and two quote cards on the right.
 */
export function Proof() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -80px 0px" });

  return (
    <section className="px-4 pt-32 sm:pt-40">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-display text-4xl font-medium leading-[1.1] text-ink sm:text-5xl">
          <ScrollWords lines={["We took our", "own advice"]} />
        </h2>

        <Rise y={70} className="mt-14">
          <div
            ref={ref}
            className="panel grid gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-[1.1fr_1fr]"
          >
            <div className="glass flex flex-col rounded-[1.5rem] p-6 sm:p-8">
              <p className="text-sm text-muted">Senior Frontend Engineer posting</p>
              <div className="my-8 flex items-center justify-center gap-4 sm:gap-8">
                <Ring score={62} label="Before" delay={0.1} inView={inView} />
                <motion.span
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.9, type: "spring", stiffness: 260, damping: 18 }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <ArrowRight className="h-5 w-5 text-accent" />
                  <span className="btn-neon px-2.5 py-0.5 text-xs">+30</span>
                </motion.span>
                <Ring score={92} label="After" delay={0.55} inView={inView} />
              </div>
              <p className="mt-auto leading-relaxed text-ink/80">
                Not a mockup. A real resume against a real posting scored 62.
                We applied HireLens&apos;s own fix list, changed nothing else, and
                ran it again.
              </p>
            </div>

            <div className="grid gap-3 sm:gap-4">
              <Quote
                label="Before, scored 62"
                text="“Worked on the checkout flow.”"
                note="A duty, not a result"
              />
              <Quote
                label="After, scored 92"
                text="“Rebuilt the checkout flow in React and TypeScript, cutting cart abandonment 18% and lifting conversion 12% across 2M monthly sessions.”"
                note="Both reviews are in the demo account"
                green
              />
            </div>
          </div>
        </Rise>
      </div>
    </section>
  );
}

function Quote({
  label,
  text,
  note,
  green = false,
}: {
  label: string;
  text: string;
  note: string;
  green?: boolean;
}) {
  return (
    <div className={`${green ? "glass-green" : "glass"} flex flex-col rounded-[1.5rem] p-6`}>
      <p className="leading-relaxed text-ink">{text}</p>
      <div className="mt-auto flex items-end justify-between gap-4 pt-6">
        <span>
          <span className="block text-sm font-semibold text-ink">{label}</span>
          <span className="block text-xs text-muted">{note}</span>
        </span>
      </div>
    </div>
  );
}

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
  // Sized in CSS via the viewBox so the pair plus the arrow fit a 390px card.
  const size = 132;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-24 w-24 sm:h-[124px] sm:w-[124px]">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-ink)" strokeOpacity={0.08} strokeWidth={stroke} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={scoreColor(score)}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            initial={{ strokeDashoffset: c }}
            animate={inView ? { strokeDashoffset: c * (1 - score / 100) } : {}}
            transition={{ duration: 1.3, delay, ease: EASE }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-3xl font-light tabular-nums text-ink sm:text-4xl">
          {score}
        </span>
      </div>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
