"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  Lightbulb,
  Lock,
  Quote,
  Sparkles,
  Target,
} from "lucide-react";
import { CommunicationPanel } from "@/components/interview/CommunicationPanel";
import { type Delivery, aggregate, fillerBand } from "@/lib/speech-metrics";
import { AnimatedScoreRing } from "@/components/dashboard/AnimatedScoreRing";
import { AnimatedScoreBar } from "@/components/AnimatedScoreBar";
import { Stagger } from "@/components/dashboard/Stagger";
import type { InterviewReport as Report } from "@/lib/interview";
import { cn } from "@/lib/cn";

/** The verdict is the headline. Colour it like a real panel would feel it. */
const VERDICT_STYLE: Record<string, string> = {
  "Strong hire": "border-good/50 text-good bg-good/10",
  Hire: "border-good/40 text-good bg-good/5",
  "Lean hire": "border-warn/40 text-warn bg-warn/5",
  "Lean no hire": "border-warn/50 text-warn bg-warn/10",
  "No hire": "border-bad/50 text-bad bg-bad/10",
};

export function InterviewReport({
  report,
  transcript,
  jobTitle,
  company,
  deep,
  askedAt,
}: {
  report: Report;
  transcript: { role: string; content: string; delivery?: Delivery }[];
  jobTitle: string;
  company: string | null;
  deep: boolean;
  askedAt: string;
}) {
  // Pair each scored answer with what the candidate actually said, and how.
  const answers = transcript.filter((t) => t.role === "candidate");
  const said = answers.map((t) => t.content);
  const deliveries = answers.map((t) => t.delivery);

  const spoken = deliveries.filter(Boolean) as Delivery[];
  const session = spoken.length > 0 ? aggregate(spoken) : null;

  return (
    <Stagger className="space-y-6">
      {/* ---------- verdict ---------- */}
      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, var(--color-accent), transparent)",
          }}
        />
        <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <AnimatedScoreRing score={report.overallScore} size={124} stroke={11} />

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              The panel&apos;s call
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-lg font-extrabold",
                  VERDICT_STYLE[report.verdict] ?? "border-edge text-ink"
                )}
              >
                {report.verdict}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {report.summary}
            </p>
            <p className="mt-3 text-xs text-faint">
              {jobTitle}
              {company ? ` · ${company}` : ""} · {report.answers.length}{" "}
              questions · {askedAt}
            </p>
          </div>
        </div>
      </div>

      {/* ---------- the one thing to fix ---------- */}
      <div className="card border-accent/40 p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
          <Target className="h-3.5 w-3.5" /> Fix this before the real one
        </p>
        <p className="mt-3 leading-relaxed">{report.focusNext}</p>
      </div>

      {/* ---------- how they came across ---------- */}
      {session && (
        <CommunicationPanel
          delivery={session}
          coaching={report.communication}
        />
      )}

      {/* ---------- strengths / red flags ---------- */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <CheckCircle2 className="h-4 w-4 text-good" /> What landed
          </h2>
          <ul className="space-y-2.5">
            {report.strengths.map((s) => (
              <li key={s} className="flex gap-2.5 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                <span className="text-muted">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 text-bad" /> Red flags
          </h2>
          {report.redFlags.length === 0 ? (
            <p className="text-sm text-muted">
              None. Nothing here would worry a panel.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {report.redFlags.map((f) => (
                <li key={f} className="flex gap-2.5 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />
                  <span className="text-muted">{f}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ---------- answer by answer ---------- */}
      <div>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">
          Answer by answer
        </h2>
        <div className="space-y-5">
          {report.answers.map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px 120px 0px" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="card p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-faint">
                    Question {i + 1}
                  </p>
                  <p className="mt-1.5 font-semibold leading-snug">
                    {a.question}
                  </p>
                </div>
                <span
                  className="shrink-0 text-2xl font-extrabold tabular-nums"
                  style={{
                    color:
                      a.score >= 75
                        ? "var(--color-good)"
                        : a.score >= 55
                          ? "var(--color-warn)"
                          : "var(--color-bad)",
                  }}
                >
                  {a.score}
                </span>
              </div>

              {/* what they actually said, and how they said it */}
              {said[i] && (
                <div className="mt-4 rounded-xl border border-edge bg-card2 p-3.5">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-faint">
                      <Quote className="h-3 w-3" /> You said
                    </p>
                    {deliveries[i] && (
                      <span className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-faint">
                        <span>{deliveries[i]!.durationSec}s</span>
                        <span>{deliveries[i]!.wpm} wpm</span>
                        {deliveries[i]!.fillerCount > 0 && (
                          <span
                            className={
                              fillerBand(deliveries[i]!.fillersPerMin) === "bad"
                                ? "text-bad"
                                : "text-warn"
                            }
                          >
                            {deliveries[i]!.fillerCount} filler
                            {deliveries[i]!.fillerCount === 1 ? "" : "s"}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-4 text-sm leading-relaxed text-muted">
                    {said[i]}
                  </p>
                </div>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:gap-x-8">
                <AnimatedScoreBar label="Structure (STAR)" score={a.structure} delay={0.1} />
                <AnimatedScoreBar label="Specificity" score={a.specificity} delay={0.16} />
                <AnimatedScoreBar label="Relevance" score={a.relevance} delay={0.22} />
                <AnimatedScoreBar label="Impact" score={a.impact} delay={0.28} />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-good/25 bg-good/[0.04] p-3.5">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-good">
                    Worked
                  </p>
                  <p className="text-sm leading-relaxed text-muted">
                    {a.whatWorked}
                  </p>
                </div>
                <div className="rounded-xl border border-bad/25 bg-bad/[0.04] p-3.5">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-bad">
                    Didn&apos;t
                  </p>
                  <p className="text-sm leading-relaxed text-muted">
                    {a.whatDidnt}
                  </p>
                </div>
              </div>

              {a.modelAnswer && (
                <div className="mt-3 rounded-xl border border-accent/30 bg-accent/[0.05] p-4">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                    <Lightbulb className="h-3 w-3" /> What a strong answer sounds
                    like
                  </p>
                  <p className="text-sm italic leading-relaxed">
                    &ldquo;{a.modelAnswer}&rdquo;
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* ---------- drills (Pro) ---------- */}
      {report.drillQuestions && report.drillQuestions.length > 0 && (
        <div className="card p-6 sm:p-8">
          <h2 className="mb-1 flex items-center gap-2 font-bold">
            <Dumbbell className="h-4 w-4 text-accent" /> Rehearse these
          </h2>
          <p className="mb-5 text-sm text-muted">
            The questions most likely to catch you out next time.
          </p>
          <ul className="space-y-2.5">
            {report.drillQuestions.map((q, i) => (
              <li key={q} className="flex gap-3 text-sm">
                <span className="font-mono text-xs text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------- Pro upsell ---------- */}
      {!deep && (
        <div className="card relative overflow-hidden border-accent/40 p-8 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, var(--color-accent), transparent)",
            }}
          />
          <Lock className="relative mx-auto h-6 w-6 text-accent" />
          <h2 className="relative mt-4 text-lg font-bold">
            Pro interviews go further
          </h2>
          <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            Nine questions instead of five, harder follow-ups, a{" "}
            <strong className="text-ink">model answer for every question</strong>{" "}
            written from your own background, and a drill list to rehearse.
          </p>
          <Link
            href="/dashboard/billing?intent=pro"
            className="btn btn-primary btn-sheen relative mt-6"
          >
            <Sparkles className="h-4 w-4" /> Unlock with Pro
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/interview/new" className="btn btn-primary">
          Run another interview <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/dashboard/interview" className="btn btn-ghost">
          All interviews
        </Link>
      </div>
    </Stagger>
  );
}
