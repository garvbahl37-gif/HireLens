"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  Crosshair,
  Dumbbell,
  Hash,
  Lightbulb,
  ListOrdered,
  Lock,
  Quote,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CommunicationPanel } from "@/components/interview/CommunicationPanel";
import { type Delivery, aggregate, fillerBand } from "@/lib/speech-metrics";
import { AnimatedScoreBar } from "@/components/AnimatedScoreBar";
import { Monogram } from "@/components/dashboard/RecentReviews";
import { scoreColor } from "@/components/ScoreRing";
import {
  KIND_LABELS,
  type ClaimVerdict,
  type InterviewReport as Report,
  type QuestionKind,
} from "@/lib/interview";
import { cn } from "@/lib/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

/** The verdict is the headline. Colour it like a real panel would feel it. */
const VERDICT_STYLE: Record<string, string> = {
  "Strong hire": "border-good/40 text-good bg-white/60",
  Hire: "border-good/35 text-good bg-white/60",
  "Lean hire": "border-warn/35 text-warn bg-white/60",
  "Lean no hire": "border-warn/40 text-warn bg-white/60",
  "No hire": "border-bad/40 text-bad bg-white/60",
};

/**
 * How a probed claim held up. The labels describe EVIDENCE, never truth —
 * "no evidence yet" is a gap to close before the real interview, not a charge
 * that the candidate lied. That distinction is the whole feature.
 */
const CLAIM_VERDICT_META: Record<
  ClaimVerdict,
  { label: string; chip: string; dot: string }
> = {
  GROUNDED: {
    label: "Backed it up",
    chip: "border-good/35 text-good",
    dot: "bg-good",
  },
  THIN: {
    label: "Partly backed",
    chip: "border-warn/35 text-warn",
    dot: "bg-warn",
  },
  UNPROVEN: {
    label: "No evidence yet",
    chip: "border-bad/35 text-bad",
    dot: "bg-bad",
  },
};

/* ------------------------------------------------------------------ */

/**
 * The overall score as the reference's half-moon gauge: a tick rail around the
 * outside, a thick arc filled to the score, the number in the middle. The arc
 * takes its colour from scoreColor() and always ships with the number.
 */
function ScoreGauge({ score, label }: { score: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const W = 240;
  const cx = W / 2;
  const cy = 122;
  const r = 86;
  const TICKS = 46;
  const color = scoreColor(clamped);
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <div className="relative mx-auto w-full max-w-[260px]" role="img" aria-label={`${label}: ${clamped} out of 100`}>
      <svg viewBox={`0 0 ${W} 136`} className="w-full" aria-hidden>
        {Array.from({ length: TICKS }).map((_, i) => {
          const t = i / (TICKS - 1);
          const a = Math.PI - t * Math.PI;
          const r1 = r + 18;
          const r2 = r + (i % 5 === 0 ? 27 : 24);
          // Rounded so the server and the browser print identical attributes
          // (raw trig differs in the last digits and trips hydration).
          const pt = (n: number) => Math.round(n * 100) / 100;
          return (
            <line
              key={i}
              x1={pt(cx + r1 * Math.cos(a))}
              y1={pt(cy - r1 * Math.sin(a))}
              x2={pt(cx + r2 * Math.cos(a))}
              y2={pt(cy - r2 * Math.sin(a))}
              stroke="var(--color-ink)"
              strokeOpacity={t * 100 <= clamped ? 0.45 : 0.13}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
          );
        })}
        <path d={arc} fill="none" stroke="rgb(255 255 255 / 0.6)" strokeWidth={24} strokeLinecap="round" />
        <motion.path
          d={arc}
          fill="none"
          stroke={color}
          strokeWidth={24}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(0.001, clamped / 100) }}
          transition={{ duration: 1.2, delay: 0.2, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <p className="text-[2.1rem] font-light leading-none tabular-nums">{clamped}</p>
        <p className="mt-1.5 text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

/**
 * One rubric dimension as a frosted tile whose hatched fill rises to the score
 * — the reference's Type / Deadline / Rate / Method tiles, read as a bar chart.
 */
function DimensionTile({
  icon: Icon,
  label,
  score,
  index,
}: {
  icon: LucideIcon;
  label: string;
  score: number;
  index: number;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div className="relative flex h-44 flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/30 sm:h-52">
      <div className="relative z-10 flex items-center gap-2 p-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-muted">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm text-muted">{label}</span>
      </div>
      <motion.div
        className="absolute inset-x-0 bottom-0 flex items-end border-t-2 p-3"
        style={{
          borderTopColor: scoreColor(clamped),
          background:
            "repeating-linear-gradient(135deg, rgb(255 255 255 / 0.62) 0 7px, rgb(255 255 255 / 0.38) 7px 14px)",
        }}
        initial={{ height: "0%" }}
        animate={{ height: `${Math.max(24, clamped * 0.72)}%` }}
        transition={{ duration: 0.9, delay: 0.25 + index * 0.08, ease: EASE }}
      >
        <span className="text-3xl font-light leading-none tabular-nums">{clamped}</span>
      </motion.div>
    </div>
  );
}

const avg = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;

export function InterviewReport({
  report,
  transcript,
  jobTitle,
  company,
  deep,
  askedAt,
  panel,
}: {
  report: Report;
  transcript: {
    role: string;
    content: string;
    delivery?: Delivery;
    kind?: QuestionKind;
  }[];
  jobTitle: string;
  company: string | null;
  deep: boolean;
  askedAt: string;
  /** The panel card, slotted into the main column after the drills. */
  panel?: ReactNode;
}) {
  // Pair each scored answer with what the candidate actually said, and how.
  const answers = transcript.filter((t) => t.role === "candidate");
  const said = answers.map((t) => t.content);
  const deliveries = answers.map((t) => t.delivery);

  const spoken = deliveries.filter(Boolean) as Delivery[];
  const session = spoken.length > 0 ? aggregate(spoken) : null;

  // The claims that were put under the microscope, in the order they were
  // pressed. This is the artifact the whole resume→interview loop exists to
  // produce: which of your own resume lines you could defend out loud.
  const audited = report.answers
    .map((a, i) => ({ ...a, i }))
    .filter(
      (a): a is typeof a & { claimText: string; claimVerdict: ClaimVerdict } =>
        !!a.claimText && !!a.claimVerdict
    );
  const held = audited.filter((a) => a.claimVerdict === "GROUNDED").length;

  // The kinds of question asked, in order of first appearance — the profile
  // column's "covered" chips.
  const kinds = [
    ...new Set(
      transcript
        .filter((t) => t.role === "interviewer" && t.kind)
        .map((t) => t.kind as QuestionKind)
    ),
  ];

  const dims = [
    { icon: ListOrdered, label: "Structure", score: avg(report.answers.map((a) => a.structure)) },
    { icon: Hash, label: "Specificity", score: avg(report.answers.map((a) => a.specificity)) },
    { icon: Compass, label: "Relevance", score: avg(report.answers.map((a) => a.relevance)) },
    { icon: TrendingUp, label: "Impact", score: avg(report.answers.map((a) => a.impact)) },
  ];

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
      {/* ---------- profile column: who, the call, what was covered ---------- */}
      <motion.aside
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="card flex flex-col p-6 lg:sticky lg:top-4"
      >
        <div className="flex items-center gap-3.5">
          <Monogram name={company || jobTitle} />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-medium tracking-tight">
              {company || jobTitle}
            </h2>
            <p className="truncate text-sm text-muted">
              {company ? jobTitle : "Mock interview"}
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm text-muted">The panel&apos;s call</p>
        <span
          className={cn(
            "mt-2 inline-flex w-fit items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold",
            VERDICT_STYLE[report.verdict] ?? "border-white/80 bg-white/60 text-ink"
          )}
        >
          <Scale className="h-4 w-4" />
          {report.verdict}
        </span>

        <p className="mt-5 text-sm text-muted">Interviewed</p>
        <p className="mt-1 font-semibold">{askedAt}</p>

        <div className="mt-5 grid grid-cols-2 gap-4 border-y border-ink/10 py-4">
          <div>
            <p className="text-sm text-muted">Questions</p>
            <p className="mt-1 font-semibold tabular-nums">
              {report.answers.length}{" "}
              <span className="font-normal text-muted">· {deep ? "Full loop" : "Screen"}</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">
              {audited.length > 0 ? "Claims held" : "Delivery"}
            </p>
            <p className="mt-1 font-semibold tabular-nums">
              {audited.length > 0
                ? `${held} of ${audited.length}`
                : session
                  ? `${session.wpm} wpm`
                  : "Typed"}
            </p>
          </div>
        </div>

        {kinds.length > 0 && (
          <>
            <p className="mt-5 text-sm text-muted">Covered</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {kinds.map((k) => (
                <span key={k} className="chip text-ink/80">
                  {KIND_LABELS[k]}
                </span>
              ))}
            </div>
          </>
        )}

        <div className="mt-7">
          <ScoreGauge score={report.overallScore} label="Overall score" />
        </div>
      </motion.aside>

      {/* ---------- the read-out ---------- */}
      {/* A plain column (not <Stagger>): several sections are conditional, and
          Stagger would wrap each skipped one in an empty div that still takes
          a gap. One fade-up for the column instead. */}
      <div className="fade-up flex min-w-0 flex-col gap-4">
        {/* the one emphasised strip: the call, the number, the next move */}
        <div className="card-forest flex flex-wrap items-center gap-x-6 gap-y-4 p-5 sm:px-6">
          <div>
            <p className="text-sm text-white/70">Overall, out of 100</p>
            <p className="mt-1 flex items-center gap-2.5 text-lg font-medium">
              <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90" aria-hidden>
                <circle cx="10" cy="10" r="8" fill="none" stroke="rgb(255 255 255 / 0.2)" strokeWidth="2.5" />
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke="var(--color-neon)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 8}
                  strokeDashoffset={2 * Math.PI * 8 * (1 - report.overallScore / 100)}
                />
              </svg>
              <span className="tabular-nums">{report.overallScore}</span>
              <span className="text-white/60">·</span>
              <span>{report.verdict}</span>
            </p>
          </div>
          <span className="hidden h-10 w-px bg-white/15 sm:block" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm text-white/70">Asked</p>
            <p className="mt-1 text-lg font-medium tabular-nums">
              {report.answers.length} question{report.answers.length === 1 ? "" : "s"}
            </p>
          </div>
          <Link
            href="/dashboard/interview/new"
            className="btn ml-auto bg-white text-ink shadow-[0_8px_20px_-10px_rgba(0,0,0,0.35)] hover:bg-white/90"
          >
            Run another <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* ---------- how you answered ---------- */}
        <section className="card p-6 sm:p-7">
          <h2 className="text-xl font-medium tracking-tight">How you answered</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{report.summary}</p>

          <h3 className="mt-6 flex items-center gap-2 font-semibold">
            <Target className="h-4 w-4 text-accent" /> Fix this before the real one
          </h3>
          <p className="mt-1.5 leading-relaxed text-ink/85">{report.focusNext}</p>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {dims.map((d, i) => (
              <DimensionTile key={d.label} index={i} {...d} />
            ))}
          </div>
          <p className="mt-3 text-xs text-faint">
            Each dimension averaged across your answers, out of 100.
          </p>
        </section>

        {/* ---------- claim audit: the resume→interview loop, closed ---------- */}
        {audited.length > 0 && (
          <section className="card overflow-hidden p-0">
            <div className="p-6 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-1.5 text-sm text-muted">
                    <Crosshair className="h-3.5 w-3.5 text-accent" /> Defensibility
                  </p>
                  <h2 className="mt-1 text-lg font-medium tracking-tight">
                    Your resume, under oath
                  </h2>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">
                    We took the claims off your resume and made you defend them
                    out loud. This is about what&rsquo;s on the page, not your
                    honesty — &ldquo;no evidence yet&rdquo; means the proof a
                    recruiter wants isn&rsquo;t there to give.
                  </p>
                </div>
                {/* The tally as a fraction, big — the number is the headline. */}
                <div className="shrink-0 text-right">
                  <p className="text-4xl font-light tabular-nums leading-none">
                    {held}
                    <span className="text-xl text-faint">/{audited.length}</span>
                  </p>
                  <p className="mt-1.5 text-sm text-muted">held up</p>
                </div>
              </div>

              {/* Segmented strength meter — verdict distribution as temperature. */}
              <div className="mt-5 flex h-2 gap-1 overflow-hidden rounded-full">
                {audited.map((a) => (
                  <span
                    key={a.i}
                    title={CLAIM_VERDICT_META[a.claimVerdict].label}
                    className={cn(
                      "h-full flex-1 rounded-full",
                      CLAIM_VERDICT_META[a.claimVerdict].dot
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Ledger: each claim a line item with a status rail keyed to its verdict. */}
            <ul className="border-t border-ink/10">
              {audited.map((a, idx) => {
                const meta = CLAIM_VERDICT_META[a.claimVerdict];
                return (
                  <li
                    key={a.i}
                    className={cn(
                      "flex gap-4 p-5 sm:px-7",
                      idx > 0 && "border-t border-ink/10"
                    )}
                  >
                    {/* the rail: colour = how well the claim held up */}
                    <span
                      className={cn("mt-0.5 w-1 shrink-0 rounded-full", meta.dot)}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="flex gap-2 text-sm font-medium leading-relaxed text-ink">
                          <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" />
                          <span>{a.claimText}</span>
                        </p>
                        <span className={cn("chip shrink-0 gap-1.5 px-2.5 py-0.5 text-xs", meta.chip)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                          {meta.label}
                        </span>
                      </div>
                      {a.claimVerdict !== "GROUNDED" && a.whatDidnt && (
                        <p className="mt-2 pl-[1.375rem] text-xs leading-relaxed text-muted">
                          {a.whatDidnt}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {audited.some((a) => a.claimVerdict !== "GROUNDED") && (
              <p className="border-t border-ink/10 bg-white/30 px-6 py-4 text-xs leading-relaxed text-muted sm:px-7">
                The lines you couldn&rsquo;t back up are the ones to strengthen or
                cut before the real interview — a recruiter will ask exactly what
                we just did.
              </p>
            )}
          </section>
        )}

        {/* ---------- how they came across ---------- */}
        {session && (
          <CommunicationPanel delivery={session} coaching={report.communication} />
        )}

        {/* ---------- strengths / red flags ---------- */}
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-medium tracking-tight">
              <CheckCircle2 className="h-4 w-4 text-good" /> What landed
            </h2>
            <ul className="space-y-2.5">
              {report.strengths.map((s) => (
                <li key={s} className="flex gap-2.5 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                  <span className="text-ink/80">{s}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-medium tracking-tight">
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
                    <span className="text-ink/80">{f}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ---------- answer by answer ---------- */}
        <div>
          <h2 className="mb-3 mt-2 px-1 text-lg font-medium tracking-tight">
            Answer by answer
          </h2>
          <div className="space-y-4">
            {report.answers.map((a, i) => (
              <motion.section
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "0px 0px 120px 0px" }}
                transition={{ duration: 0.5, ease: EASE }}
                className="card p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-muted">Question {i + 1}</p>
                      {a.claimText && a.claimVerdict && (
                        <span
                          className={cn(
                            "chip gap-1.5 px-2.5 py-0.5 text-xs",
                            CLAIM_VERDICT_META[a.claimVerdict].chip
                          )}
                        >
                          <Crosshair className="h-3 w-3" />
                          Claim check · {CLAIM_VERDICT_META[a.claimVerdict].label}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 font-medium leading-snug">{a.question}</p>
                  </div>
                  <span className="flex shrink-0 flex-col items-end">
                    <span
                      className="text-3xl font-light leading-none tabular-nums"
                      style={{ color: scoreColor(a.score) }}
                    >
                      {a.score}
                    </span>
                    <span className="mt-1 text-xs text-faint">of 100</span>
                  </span>
                </div>

                {/* what they actually said, and how they said it */}
                {said[i] && (
                  <div className="mt-4 rounded-2xl border border-white/80 bg-white/50 p-4">
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                        <Quote className="h-3 w-3" /> You said
                      </p>
                      {deliveries[i] && (
                        <span className="flex flex-wrap items-center gap-2 text-xs tabular-nums text-faint">
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
                    <p className="line-clamp-4 text-sm leading-relaxed text-ink/80">
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
                  <div className="rounded-2xl border border-white/80 bg-white/50 p-4">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-good">
                      <span className="h-1.5 w-1.5 rounded-full bg-good" /> Worked
                    </p>
                    <p className="text-sm leading-relaxed text-ink/80">{a.whatWorked}</p>
                  </div>
                  <div className="rounded-2xl border border-white/80 bg-white/50 p-4">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-bad">
                      <span className="h-1.5 w-1.5 rounded-full bg-bad" /> Didn&apos;t
                    </p>
                    <p className="text-sm leading-relaxed text-ink/80">{a.whatDidnt}</p>
                  </div>
                </div>

                {a.modelAnswer && (
                  <div className="mt-3 rounded-2xl border border-accent2/30 bg-white/60 p-4">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-accent">
                      <Lightbulb className="h-3.5 w-3.5" /> What a strong answer sounds like
                    </p>
                    <p className="text-sm italic leading-relaxed">
                      &ldquo;{a.modelAnswer}&rdquo;
                    </p>
                  </div>
                )}
              </motion.section>
            ))}
          </div>
        </div>

        {/* ---------- drills (Pro) ---------- */}
        {report.drillQuestions && report.drillQuestions.length > 0 && (
          <section className="card p-6 sm:p-7">
            <h2 className="flex items-center gap-2 text-lg font-medium tracking-tight">
              <Dumbbell className="h-4 w-4 text-accent" /> Rehearse these
            </h2>
            <p className="mb-4 mt-1 text-sm text-muted">
              The questions most likely to catch you out next time.
            </p>
            <ul className="space-y-2">
              {report.drillQuestions.map((q, i) => (
                <li
                  key={q}
                  className="flex items-start gap-3 rounded-xl border border-white/80 bg-white/45 px-3.5 py-2.5 text-sm"
                >
                  <span className="mt-px text-xs tabular-nums text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ---------- Pro upsell ---------- */}
        {!deep && (
          <section className="card p-8 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/60">
              <Lock className="h-5 w-5 text-accent" />
            </span>
            <h2 className="mt-4 text-lg font-medium tracking-tight">
              Pro interviews go further
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              Nine questions instead of five, harder follow-ups, a{" "}
              <strong className="font-semibold text-ink">model answer for every question</strong>{" "}
              written from your own background, and a drill list to rehearse.
            </p>
            <Link href="/dashboard/billing?intent=pro" className="btn btn-primary mt-6">
              <Sparkles className="h-4 w-4" /> Unlock with Pro
            </Link>
          </section>
        )}

        {panel}

        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/interview/new" className="btn btn-primary">
            Run another interview <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/dashboard/interview" className="btn btn-ghost">
            All interviews
          </Link>
        </div>
      </div>
    </div>
  );
}
