"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import {
  AudioLines,
  Gauge,
  MessageSquareText,
  Mic,
  Sparkles,
  Target,
} from "lucide-react";
import { InterviewerOrb } from "@/components/interview/InterviewerOrb";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Landing showcase for the mock interview: a live-looking interview card —
 * the orb speaking, the candidate's answer, measured delivery, and the panel's
 * call — next to the pitch. Built to feel like a frame from the real product.
 */
export function InterviewShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -100px 0px" });

  return (
    <div ref={ref} className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
      {/* ---- pitch ---- */}
      <div>
        <span className="chip gap-2 border-accent/40 text-accent">
          <Mic className="h-3.5 w-3.5" /> Voice mock interview
        </span>
        <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          The résumé gets you the interview.{" "}
          <span className="text-gradient">Practise the interview.</span>
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          A hiring manager who has read your résumé, knows the job, and probes
          the gaps between them — out loud. It follows up when an answer is thin,
          then scores what you said <em>and</em> how you said it.
        </p>

        <ul className="mt-6 space-y-3">
          {[
            {
              icon: MessageSquareText,
              t: "Adaptive, not a script",
              d: "It quotes your own bullets back and digs into the weak ones.",
            },
            {
              icon: AudioLines,
              t: "Delivery, measured",
              d: "Real pace, filler words and hesitation — from your actual voice.",
            },
            {
              icon: Target,
              t: "A hire / no-hire verdict",
              d: "The call a real panel would make, with the one thing to fix.",
            },
          ].map((f) => (
            <li key={f.t} className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-edge bg-card2 text-accent">
                <f.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{f.t}</p>
                <p className="text-sm text-muted">{f.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ---- the interview card ---- */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative"
      >
        <div className="card relative overflow-hidden p-5 shadow-2xl sm:p-6">
          {/* session bar */}
          <div className="flex items-center gap-3 border-b border-edge pb-4">
            <InterviewerOrb state="speaking" size={42} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                Senior Frontend Engineer · Stripe
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Speaking…
              </p>
            </div>
            <div className="ml-auto hidden items-center gap-1 sm:flex">
              {[1, 1, 1, 0, 0].map((on, i) => (
                <span
                  key={i}
                  className="h-1.5 rounded-full"
                  style={{
                    width: on ? 18 : 8,
                    background: on ? "var(--color-accent)" : "var(--color-edge2)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* exchange */}
          <div className="mt-5 space-y-4">
            <div className="flex gap-2.5">
              <InterviewerOrb state="idle" size={26} />
              <div>
                <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/5 px-2.5 py-0.5 text-[10px] font-semibold text-accent">
                  <Sparkles className="h-2.5 w-2.5" /> Gap probe
                </span>
                <p className="rounded-2xl rounded-tl-md border border-edge2/60 bg-card2/80 px-3.5 py-2.5 text-sm">
                  The role needs deep TypeScript, but I don&apos;t see it on your
                  résumé. Where does that stand?
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl rounded-tr-md bg-gradient-to-br from-accent to-accent2 px-3.5 py-2.5 text-sm font-medium text-[#180f0a]">
                Um, I haven&apos;t used it much professionally, but I, you know, I
                think I could pick it up pretty quickly.
              </p>
            </div>
          </div>

          {/* measured delivery */}
          <div className="mt-5 grid grid-cols-3 gap-2.5 border-t border-edge pt-4">
            {[
              { icon: Gauge, label: "pace", value: "108", unit: "wpm", band: "warn" },
              { icon: MessageSquareText, label: "fillers", value: "6", unit: "/min", band: "bad" },
              { icon: AudioLines, label: "delivery", value: "41", unit: "/100", band: "bad" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-edge bg-card2 p-2.5">
                <m.icon className="h-3 w-3 text-faint" />
                <p
                  className="mt-1 text-lg font-extrabold tabular-nums"
                  style={{
                    color:
                      m.band === "bad"
                        ? "var(--color-bad)"
                        : "var(--color-warn)",
                  }}
                >
                  {m.value}
                  <span className="ml-0.5 text-[10px] font-medium text-faint">
                    {m.unit}
                  </span>
                </p>
                <p className="text-[10px] text-muted">{m.label}</p>
              </div>
            ))}
          </div>

          {/* verdict */}
          <div className="mt-4 rounded-xl border border-warn/25 bg-warn/[0.05] p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-warn">
              <Target className="h-3.5 w-3.5" /> Fix first
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              You deflected on TypeScript instead of naming a plan. &ldquo;I&apos;d
              spend a weekend porting a side project&rdquo; beats &ldquo;I could
              pick it up.&rdquo;
            </p>
          </div>

          {/* floating badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.6, type: "spring", stiffness: 240, damping: 16 }}
            className="absolute right-3 -top-3 flex items-center gap-1.5 rounded-full border border-accent/40 bg-card px-3 py-1.5 text-xs font-bold shadow-xl sm:-right-3"
          >
            <Mic className="h-3.5 w-3.5 text-accent" />
            Real voice
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
