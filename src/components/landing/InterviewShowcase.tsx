"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import {
  AudioLines,
  Gauge,
  MessageSquareText,
  Mic,
  Sparkles,
  Target,
} from "lucide-react";
import { InterviewerOrb } from "@/components/interview/InterviewerOrb";
import { cn } from "@/lib/cn";
import { EASE, ScrollWords } from "./motion";

const POINTS = [
  {
    icon: MessageSquareText,
    t: "Adaptive, not a script",
    d: "It quotes your own bullets back and digs into the weak ones.",
  },
  {
    icon: AudioLines,
    t: "Delivery, measured",
    d: "Real pace, filler words and hesitation, from your actual voice.",
  },
  {
    icon: Target,
    t: "A hire or no-hire call",
    d: "The verdict a real panel would reach, with the one thing to fix.",
  },
];

const METRICS = [
  { icon: Gauge, label: "Pace", value: 108, unit: "wpm", tone: "text-warn" },
  { icon: MessageSquareText, label: "Fillers", value: 6, unit: "/min", tone: "text-bad" },
  { icon: AudioLines, label: "Delivery", value: 41, unit: "/100", tone: "text-bad" },
];

/* The interview plays out in beats once the card scrolls into view:
   1 the interviewer asks, 2 you answer, 3 delivery is measured, 4 the call. */
const BEATS_MS = [350, 1700, 3000, 4100];

/**
 * The mock interview, live on the landing page: the reference's fanned glass
 * stack, with the front card playing a real exchange — the interviewer probes
 * a gap on the résumé, the candidate hedges, delivery is measured from the
 * voice, and the panel makes its call.
 */
export function InterviewShowcase({
  authed,
  freeInterviews,
}: {
  authed: boolean;
  freeInterviews: number;
}) {
  const reduce = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cardRef, { once: true, margin: "-20% 0px" });
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const timers = BEATS_MS.map((ms, i) =>
      setTimeout(() => setBeat(i + 1), reduce ? 0 : ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [inView, reduce]);

  const orbState = beat === 1 ? "speaking" : beat === 3 ? "thinking" : "idle";
  const status =
    beat <= 1 ? "Speaking…" : beat === 2 ? "Listening…" : beat === 3 ? "Scoring your answer…" : "Panel's call is in";

  const fan = (rotate: number, x: number) =>
    reduce
      ? { style: { rotate, x } }
      : {
          initial: { rotate: 0, x: 0 },
          whileInView: { rotate, x },
          viewport: { once: true, margin: "-15% 0px" },
          transition: { duration: 1.1, delay: 0.15, ease: EASE },
        };

  const show = (at: number) => ({
    initial: false as const,
    animate: beat >= at ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 12, filter: "blur(6px)" },
    transition: { duration: 0.55, ease: EASE },
  });

  return (
    <section id="interview" className="scroll-mt-24 px-3 pt-32 sm:px-4 sm:pt-40">
      <div className="panel overflow-hidden px-5 pb-14 pt-20 sm:px-10 sm:pt-24">
        <div className="light-streaks" />

        <h2 className="relative text-center font-display text-4xl font-medium leading-[1.1] text-ink sm:text-5xl">
          <ScrollWords lines={["Rehearse against", "a real interviewer"]} />
        </h2>

        {/* minmax(0,…) tracks: a bare one-column grid sizes to its widest child's
            min-content, which pushed the card past the panel on phones */}
        <div className="relative mx-auto mt-14 grid max-w-5xl grid-cols-[minmax(0,1fr)] items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {/* ---- the pitch ---- */}
          <div>
            <p className="max-w-md text-lg leading-relaxed text-ink/80">
              A hiring manager who has read your résumé, knows the job, and
              probes the gaps between them, out loud. It follows up when an
              answer is thin, then scores what you said and how you said it.
            </p>
            <ul className="mt-8 space-y-4">
              {POINTS.map((p) => (
                <li key={p.t} className="flex gap-3.5">
                  <span className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-accent">
                    <p.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span>
                    <span className="block font-semibold text-ink">{p.t}</span>
                    <span className="block text-sm text-muted">{p.d}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href={authed ? "/dashboard/interview/new" : "/signup"} className="btn-neon">
                <Mic className="h-4 w-4" /> Start a mock interview
              </Link>
              <span className="text-sm text-muted">
                {freeInterviews === 1 ? "One" : freeInterviews} free a month
              </span>
            </div>
          </div>

          {/* ---- the fanned stack, with the live interview in front ---- */}
          <div className="relative mx-auto w-full max-w-[29rem]">
            <motion.div aria-hidden {...fan(-6, -30)} className="glass absolute inset-0 origin-bottom rounded-[1.8rem] opacity-80" />
            <motion.div aria-hidden {...fan(6, 30)} className="glass absolute inset-0 origin-bottom rounded-[1.8rem] opacity-80" />

            <motion.div
              ref={cardRef}
              initial={reduce ? false : { y: 60, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 1, ease: EASE }}
              className="glass relative rounded-[1.8rem] p-5 sm:p-6"
            >
              {/* session bar */}
              <div className="flex min-w-0 items-center gap-3 border-b border-ink/10 pb-4">
                <InterviewerOrb state={orbState} size={42} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    Senior Frontend Engineer, Stripe
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-accent" aria-live="polite">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent2" />
                    {status}
                  </p>
                </div>
                <span className="ml-auto flex shrink-0 items-center gap-1" aria-label="Question 3 of 5">
                  {[1, 1, 1, 0, 0].map((on, i) => (
                    <span key={i} className={cn("h-1.5 rounded-full", on ? "w-[18px] bg-accent2" : "w-2 bg-ink/15")} />
                  ))}
                </span>
              </div>

              {/* the exchange */}
              <div className="mt-5 space-y-3.5">
                <motion.div {...show(1)} className="flex gap-2.5">
                  <InterviewerOrb state="idle" size={26} />
                  <div>
                    <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-white/60 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                      <Sparkles className="h-3 w-3" /> Gap probe
                    </span>
                    <p className="rounded-2xl rounded-tl-md border border-white/80 bg-white/70 px-3.5 py-2.5 text-sm leading-relaxed text-ink">
                      The role needs deep TypeScript, but I don&apos;t see it on
                      your résumé. Where does that stand?
                    </p>
                  </div>
                </motion.div>
                <motion.div {...show(2)} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-pill px-3.5 py-2.5 text-sm leading-relaxed text-white">
                    Um, I haven&apos;t used it much professionally, but I, you
                    know, I think I could pick it up pretty quickly.
                  </p>
                </motion.div>
              </div>

              {/* measured delivery */}
              <motion.div {...show(3)} className="mt-5 grid grid-cols-3 gap-2.5">
                {METRICS.map((m) => (
                  <div key={m.label} className="rounded-2xl border border-white/80 bg-white/55 p-3">
                    <m.icon className="h-3.5 w-3.5 text-faint" />
                    <p className={cn("mt-1.5 text-xl font-light tabular-nums", m.tone)}>
                      <Ticker to={m.value} run={beat >= 3} />
                      <span className="ml-0.5 text-[10px] font-medium text-faint">{m.unit}</span>
                    </p>
                    <p className="text-xs text-muted">{m.label}</p>
                  </div>
                ))}
              </motion.div>

              {/* the panel's call */}
              <motion.div {...show(4)} className="card-forest mt-4 p-4">
                <p className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-[#b9f7a6]">
                    <Target className="h-3.5 w-3.5" /> Fix first
                  </span>
                  <span className="rounded-full border border-white/25 px-2 py-0.5 text-white/85">
                    Lean no hire
                  </span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/85">
                  You deflected on TypeScript instead of naming a plan.
                  &ldquo;I&apos;d spend a weekend porting a side project&rdquo;
                  beats &ldquo;I could pick it up.&rdquo;
                </p>
              </motion.div>

              {/* floating badge */}
              <span className="glass absolute -top-3 right-5 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-ink">
                <Mic className="h-3.5 w-3.5 text-accent" /> Real voice
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Counts up to `to` once `run` turns true. */
function Ticker({ to, run }: { to: number; run: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    const c = animate(0, to, { duration: 1.2, ease: EASE, onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [run, to]);
  return <>{n}</>;
}
