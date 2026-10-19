import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  LayoutList,
  ListChecks,
  MessageSquareText,
  PenLine,
  Pilcrow,
  ScanSearch,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import type { Analysis } from "@/lib/ai";
import { DIMENSION_LABELS } from "@/lib/ai";
import { scoreColor, scoreGrade } from "@/components/ScoreRing";
import { AnimatedScoreGauge } from "@/components/dashboard/AnimatedScoreRing";
import { Morph } from "@/components/Morph";
import { ScoreTile } from "@/components/AnimatedScoreBar";
import { ClaimsCard } from "@/components/ClaimsCard";
import { Monogram } from "@/components/dashboard/RecentReviews";
import { Stagger } from "@/components/dashboard/Stagger";
import { cn } from "@/lib/cn";

type DimensionKey = keyof typeof DIMENSION_LABELS;

const DIMENSION_ICONS: Record<DimensionKey, ReactNode> = {
  jobMatch: <Target className="h-4 w-4" />,
  atsReadiness: <ScanSearch className="h-4 w-4" />,
  impact: <TrendingUp className="h-4 w-4" />,
  clarity: <Pilcrow className="h-4 w-4" />,
  formatting: <LayoutList className="h-4 w-4" />,
};

const SEVERITY_STYLES: Record<string, string> = {
  high: "text-bad border-bad/30 bg-bad/10",
  medium: "text-warn border-warn/30 bg-warn/10",
  low: "text-muted border-white/80 bg-white/60",
};

const SEVERITY_LABEL: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const GRADE_COLORS: Record<string, string> = {
  A: "text-good border-good/40",
  B: "text-good border-good/25",
  C: "text-warn border-warn/40",
  D: "text-bad border-bad/25",
  F: "text-bad border-bad/40",
};

/** Inner panel inside a card: glass on glass. */
const PANE = "rounded-2xl border border-white/80 bg-white/50";

/**
 * The review, laid out like the reference's profile "Overview": a profile card
 * on the left (the role, its grade, the keyword chips, and the semicircle
 * score gauge), and on the right one forest strip that carries the headline
 * numbers and the page's actions, then the verdict with the five dimensions as
 * glass stat tiles, then everything to act on.
 *
 * `actions` renders inside the forest strip (track / export); `children`
 * render at the foot of the main column (cover letter, re-score).
 */
export function ReviewResult({
  analysis,
  deep,
  meta,
  reviewId,
  actions,
  children,
}: {
  analysis: Analysis;
  deep: boolean;
  meta: {
    jobTitle: string;
    company: string | null;
    resumeFilename: string | null;
    createdAt: Date;
  };
  /** Lets the claims card launch an interview aimed back at this review. */
  reviewId?: string;
  /** Page actions, shown in the forest strip at the top of the main column. */
  actions?: ReactNode;
  /** Extra panels appended to the main column. */
  children?: ReactNode;
}) {
  const score = analysis.overallScore;
  const keys = Object.keys(DIMENSION_LABELS) as DimensionKey[];
  const matched = analysis.matchedKeywords.length;
  const missing = analysis.missingKeywords.length;
  const keywordTotal = matched + missing;
  const highFixes = analysis.improvements.filter((i) => i.severity === "high").length;
  const reviewed = meta.createdAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[372px_minmax(0,1fr)]">
      {/* ================= profile column ================= */}
      <Stagger className="space-y-5">
        <section className="card flex flex-col p-5 sm:p-6">
          <div className="flex items-center gap-4">
            {/* the avatar and title glide here from the overview's review row */}
            <Morph name={reviewId && `review-avatar-${reviewId}`}>
              <span className="shrink-0 [&>span]:h-14 [&>span]:w-14 [&>span]:text-lg">
                <Monogram name={meta.company || meta.jobTitle} />
              </span>
            </Morph>
            <Morph name={reviewId && `review-title-${reviewId}`}>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold leading-tight tracking-tight">
                  {meta.jobTitle}
                </h1>
                {meta.company && (
                  <p className="mt-0.5 truncate text-sm text-muted">{meta.company}</p>
                )}
              </div>
            </Morph>
          </div>

          <p className="mt-6 text-sm text-muted">Grade</p>
          <p className="mt-2">
            <span className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-white/60 px-3 py-1.5 text-sm font-semibold text-accent">
              <Trophy className="h-4 w-4" />
              {scoreGrade(score)}
            </span>
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-ink/10 pt-5">
            <div>
              <dt className="text-sm text-muted">Reviewed</dt>
              <dd className="mt-1 text-sm font-semibold">{reviewed}</dd>
            </div>
            {meta.resumeFilename && (
              <div className="min-w-0">
                <dt className="text-sm text-muted">Resume</dt>
                <dd
                  className="mt-1 truncate text-sm font-semibold"
                  title={meta.resumeFilename}
                >
                  {meta.resumeFilename}
                </dd>
              </div>
            )}
          </dl>

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-ink/10 pt-5">
            <div>
              <dt className="text-sm text-muted">Keywords hit</dt>
              <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold tabular-nums">
                <CheckCircle2 className="h-4 w-4 text-good" />
                {matched} of {keywordTotal}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Fixes to make</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums">
                {analysis.improvements.length}
                {highFixes > 0 && (
                  <span className="font-normal text-muted"> · {highFixes} high</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-ink/10 pt-5">
            <h2 className="text-sm text-muted">
              Matched keywords <span className="tabular-nums">({matched})</span>
            </h2>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {analysis.matchedKeywords.map((k) => (
                <span key={k} className="chip border-good/25 bg-white/60 text-good">
                  {k}
                </span>
              ))}
              {matched === 0 && (
                <p className="text-sm text-muted">
                  None — that&apos;s the first problem to fix.
                </p>
              )}
            </div>

            <h2 className="mt-5 text-sm text-muted">
              Missing keywords <span className="tabular-nums">({missing})</span>
            </h2>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {analysis.missingKeywords.map((k) => (
                <span key={k} className="chip border-bad/25 bg-white/60 text-bad">
                  {k}
                </span>
              ))}
              {missing === 0 && (
                <p className="text-sm text-muted">Nothing important missing. Nice.</p>
              )}
            </div>
          </div>

          {/* the gauge closes the card on desktop, as in the reference; on a
              phone it leads, so the score is the first thing you see */}
          <AnimatedScoreGauge
            score={score}
            caption="Overall score"
            className="order-first mb-6 border-b border-ink/10 pb-5 lg:order-none lg:mb-0 lg:mt-6 lg:border-b-0 lg:border-t lg:pb-0 lg:pt-6"
          />
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-medium tracking-tight">What&apos;s working</h2>
          <ul className="mt-4 space-y-3">
            {analysis.strengths.map((s) => (
              <li key={s} className="flex gap-2.5 text-sm leading-relaxed">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>
      </Stagger>

      {/* ================= main column ================= */}
      <Stagger className="min-w-0 space-y-5">
        {/* ---------- the forest strip: headline numbers + actions ----------
            Sized off its own width (container queries), since the column it
            sits in changes width at every breakpoint: actions go beside the
            numbers only when they fit, and the keyword count shows when
            there's room for it. */}
        <div className="@container">
          <section className="card-forest flex flex-col gap-5 p-5 sm:px-6 @[40rem]:flex-row @[40rem]:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-x-6">
              <div className="shrink-0">
                <p className="text-sm text-white/70">{scoreGrade(score)}</p>
                <p className="mt-1 flex items-center gap-2 text-lg font-medium tabular-nums">
                  <MiniRing score={score} />
                  {score} overall
                </p>
              </div>
              <div className="shrink-0 border-l border-white/15 pl-6">
                <p className="text-sm text-white/70">Job match</p>
                <p className="mt-1 text-lg font-medium tabular-nums">
                  {analysis.dimensions.jobMatch.score}
                  <span className="text-sm font-normal text-white/60">/100</span>
                </p>
              </div>
              <div className="hidden shrink-0 border-l border-white/15 pl-6 @[34rem]:block @[40rem]:hidden @[52rem]:block">
                <p className="text-sm text-white/70">Keywords</p>
                <p className="mt-1 text-lg font-medium tabular-nums">
                  {matched}
                  <span className="text-sm font-normal text-white/60"> of {keywordTotal}</span>
                </p>
              </div>
            </div>
            {actions && (
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            )}
          </section>
        </div>

        {/* ---------- verdict + the five dimensions ---------- */}
        <section className="card p-5 sm:p-6">
          <h2 className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
            {analysis.verdict}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{analysis.summary}</p>

          <div className="mt-6 flex items-baseline justify-between gap-4">
            <h3 className="text-lg font-medium tracking-tight">Score breakdown</h3>
            <p className="text-sm text-faint">Each out of 100</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
            {keys.map((key, i) => (
              <ScoreTile
                key={key}
                label={DIMENSION_LABELS[key]}
                score={analysis.dimensions[key].score}
                icon={DIMENSION_ICONS[key]}
                delay={0.25 + i * 0.08}
              />
            ))}
          </div>

          <ul className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-2">
            {keys.map((key) => {
              const d = analysis.dimensions[key];
              return (
                <li key={key} className="flex gap-3 text-sm leading-relaxed">
                  <span
                    aria-hidden
                    className="mt-[0.45rem] h-2 w-2 shrink-0 rounded-full"
                    style={{ background: scoreColor(d.score) }}
                  />
                  <div className="min-w-0">
                    <p className="font-medium">
                      {DIMENSION_LABELS[key]}{" "}
                      <span className="font-normal tabular-nums text-faint">
                        · {d.score}
                      </span>
                    </p>
                    <p className="text-muted">{d.note}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---------- claims: the resume→interview hinge ---------- */}
        {analysis.claims && analysis.claims.length > 0 && (
          <ClaimsCard claims={analysis.claims} reviewId={reviewId} />
        )}

        {/* ---------- the fix list ---------- */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-medium tracking-tight">Fix these, in order</h2>
            <p className="text-sm text-faint">Highest impact first</p>
          </div>
          <ol className="mt-4 space-y-2.5">
            {analysis.improvements.map((imp, i) => (
              <li key={imp.issue} className={cn(PANE, "flex gap-3.5 p-4")}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pill text-xs font-semibold tabular-nums text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 text-sm leading-relaxed">
                  <p className="font-semibold">
                    {imp.issue}{" "}
                    <span
                      className={cn(
                        "chip ml-1 gap-1 px-2 py-0.5 align-middle text-xs",
                        SEVERITY_STYLES[imp.severity]
                      )}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {SEVERITY_LABEL[imp.severity] ?? imp.severity}
                    </span>
                  </p>
                  <p className="mt-1 text-muted">{imp.fix}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- section feedback ---------- */}
        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-medium tracking-tight">Section by section</h2>
          <div className="mt-4 grid gap-2.5 md:grid-cols-2">
            {analysis.sectionFeedback.map((s) => (
              <div key={s.section} className={cn(PANE, "flex items-start gap-3.5 p-4")}>
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white/80 text-base font-semibold",
                    GRADE_COLORS[s.grade] ?? "border-white/80 text-muted"
                  )}
                  aria-label={`Grade ${s.grade}`}
                >
                  {s.grade}
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{s.section}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">
                    {s.feedback}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- deep analysis (Pro) ---------- */}
        {deep ? (
          <>
            {analysis.rewrites && analysis.rewrites.length > 0 && (
              <section className="card p-5 sm:p-6">
                <CardTitle icon={<PenLine className="h-4 w-4" />}>
                  Line-by-line rewrites
                </CardTitle>
                <p className="mt-1 text-sm text-muted">
                  Your weakest bullets, rewritten for this role.
                </p>
                <div className="mt-5 space-y-2.5">
                  {analysis.rewrites.map((r) => (
                    <div key={r.original} className={cn(PANE, "p-4 sm:p-5")}>
                      <p className="text-sm text-bad line-through decoration-bad/50">
                        {r.original}
                      </p>
                      <p className="mt-2.5 text-sm font-medium text-good">
                        {r.improved}
                      </p>
                      <p className="mt-2.5 text-xs leading-relaxed text-muted">
                        {r.why}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {analysis.atsOptimizations && analysis.atsOptimizations.length > 0 && (
              <section className="card p-5 sm:p-6">
                <CardTitle icon={<ListChecks className="h-4 w-4" />}>
                  ATS optimization checklist
                </CardTitle>
                <ul className="mt-4 space-y-3">
                  {analysis.atsOptimizations.map((tip, i) => (
                    <li key={tip} className="flex gap-3 text-sm leading-relaxed">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/70 text-[11px] font-semibold tabular-nums text-accent">
                        {i + 1}
                      </span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {analysis.interviewQuestions &&
              analysis.interviewQuestions.length > 0 && (
                <section className="card p-5 sm:p-6">
                  <CardTitle icon={<MessageSquareText className="h-4 w-4" />}>
                    Questions your gaps will trigger
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted">
                    Prepare these answers before the phone screen.
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {analysis.interviewQuestions.map((q) => (
                      <li
                        key={q}
                        className={cn(PANE, "p-4 text-sm leading-relaxed")}
                      >
                        {q}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
          </>
        ) : (
          <section className="card flex flex-col items-center p-6 text-center sm:p-8">
            <div className="orb h-14 w-14" aria-hidden />
            <h2 className="mt-5 text-lg font-medium tracking-tight">
              The deep analysis is waiting
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              Pro reviews add <strong className="font-semibold text-ink">line-by-line rewrites</strong>{" "}
              of your weakest bullets, an{" "}
              <strong className="font-semibold text-ink">ATS optimization checklist</strong>, and
              the <strong className="font-semibold text-ink">interview questions</strong> your
              gaps will trigger.
            </p>
            <Link href="/dashboard/billing?intent=pro" className="btn btn-primary mt-6">
              <Sparkles className="h-4 w-4" /> Unlock with Pro
            </Link>
          </section>
        )}

        {children && <div className="space-y-5">{children}</div>}
      </Stagger>
    </div>
  );
}

/** Card heading with its icon in a small glass disc. */
function CardTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-lg font-medium tracking-tight">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/70 text-accent">
        {icon}
      </span>
      {children}
    </h2>
  );
}

/** The small neon ring in the forest strip: the score as a sliver of light. */
function MiniRing({ score }: { score: number }) {
  const r = 8;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <svg viewBox="0 0 22 22" className="h-[22px] w-[22px] shrink-0" aria-hidden>
      <circle cx="11" cy="11" r={r} fill="none" stroke="rgb(255 255 255 / 0.2)" strokeWidth="2.5" />
      <circle
        cx="11"
        cy="11"
        r={r}
        fill="none"
        stroke="var(--color-neon)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped / 100)}
        transform="rotate(-90 11 11)"
        style={{ filter: "drop-shadow(0 0 3px rgb(69 230 36 / 0.7))" }}
      />
    </svg>
  );
}
