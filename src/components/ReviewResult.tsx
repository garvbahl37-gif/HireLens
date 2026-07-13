import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  Lock,
  MessageSquareText,
  PenLine,
  Sparkles,
} from "lucide-react";
import type { Analysis } from "@/lib/ai";
import { DIMENSION_LABELS } from "@/lib/ai";
import { scoreGrade } from "@/components/ScoreRing";
import { AnimatedScoreRing } from "@/components/dashboard/AnimatedScoreRing";
import { AnimatedScoreBar } from "@/components/AnimatedScoreBar";
import { Stagger } from "@/components/dashboard/Stagger";
import { cn } from "@/lib/cn";

const SEVERITY_STYLES: Record<string, string> = {
  high: "text-bad border-bad/40 bg-bad/10",
  medium: "text-warn border-warn/40 bg-warn/10",
  low: "text-muted border-edge bg-card2",
};

const GRADE_COLORS: Record<string, string> = {
  A: "text-good border-good/40",
  B: "text-good/80 border-good/30",
  C: "text-warn border-warn/40",
  D: "text-bad/80 border-bad/30",
  F: "text-bad border-bad/40",
};

export function ReviewResult({
  analysis,
  deep,
  meta,
}: {
  analysis: Analysis;
  deep: boolean;
  meta: {
    jobTitle: string;
    company: string | null;
    resumeFilename: string | null;
    createdAt: Date;
  };
}) {
  return (
    <Stagger className="space-y-6">
      {/* ---------- header ---------- */}
      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, var(--color-accent), transparent)",
          }}
        />
        <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <AnimatedScoreRing score={analysis.overallScore} size={124} stroke={11} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              {scoreGrade(analysis.overallScore)}
            </p>
            <h1 className="mt-1 text-xl font-bold leading-snug sm:text-2xl">
              {analysis.verdict}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {analysis.summary}
            </p>
            <p className="mt-3 text-xs text-faint">
              {meta.jobTitle}
              {meta.company ? ` · ${meta.company}` : ""}
              {meta.resumeFilename ? ` · ${meta.resumeFilename}` : ""} ·{" "}
              {meta.createdAt.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* ---------- dimensions ---------- */}
      <div className="card p-6 sm:p-8">
        <h2 className="mb-6 font-bold">Score breakdown</h2>
        <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          {(
            Object.keys(DIMENSION_LABELS) as Array<
              keyof typeof DIMENSION_LABELS
            >
          ).map((key, i) => (
            <AnimatedScoreBar
              key={key}
              label={DIMENSION_LABELS[key]}
              score={analysis.dimensions[key].score}
              note={analysis.dimensions[key].note}
              delay={0.25 + i * 0.09}
            />
          ))}
        </div>
      </div>

      {/* ---------- keywords ---------- */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 font-bold">
            Matched keywords{" "}
            <span className="text-sm font-normal text-muted">
              ({analysis.matchedKeywords.length})
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {analysis.matchedKeywords.map((k) => (
              <span key={k} className="chip border-good/30 text-good">
                {k}
              </span>
            ))}
            {analysis.matchedKeywords.length === 0 && (
              <p className="text-sm text-muted">
                None — that&apos;s the first problem to fix.
              </p>
            )}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="mb-4 font-bold">
            Missing keywords{" "}
            <span className="text-sm font-normal text-muted">
              ({analysis.missingKeywords.length})
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {analysis.missingKeywords.map((k) => (
              <span key={k} className="chip border-bad/30 text-bad">
                {k}
              </span>
            ))}
            {analysis.missingKeywords.length === 0 && (
              <p className="text-sm text-muted">
                Nothing important missing. Nice.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ---------- strengths & improvements ---------- */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 font-bold">What&apos;s working</h2>
          <ul className="space-y-3">
            {analysis.strengths.map((s) => (
              <li key={s} className="flex gap-2.5 text-sm leading-relaxed">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="mb-4 font-bold">Fix these, in order</h2>
          <ul className="space-y-4">
            {analysis.improvements.map((imp) => (
              <li key={imp.issue} className="text-sm leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      imp.severity === "high"
                        ? "text-bad"
                        : imp.severity === "medium"
                          ? "text-warn"
                          : "text-muted"
                    )}
                  />
                  <div>
                    <p className="font-semibold">
                      {imp.issue}{" "}
                      <span
                        className={cn(
                          "chip ml-1 px-2 py-0 text-[10px] uppercase",
                          SEVERITY_STYLES[imp.severity]
                        )}
                      >
                        {imp.severity}
                      </span>
                    </p>
                    <p className="mt-1 text-muted">{imp.fix}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---------- section feedback ---------- */}
      <div className="card p-6 sm:p-8">
        <h2 className="mb-5 font-bold">Section-by-section</h2>
        <div className="space-y-4">
          {analysis.sectionFeedback.map((s) => (
            <div key={s.section} className="flex items-start gap-4">
              <span
                className={cn(
                  "chip h-9 w-9 shrink-0 justify-center p-0 text-base font-extrabold",
                  GRADE_COLORS[s.grade] ?? "text-muted"
                )}
              >
                {s.grade}
              </span>
              <div>
                <p className="font-semibold">{s.section}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">
                  {s.feedback}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- deep analysis (Pro) ---------- */}
      {deep ? (
        <>
          {analysis.rewrites && analysis.rewrites.length > 0 && (
            <div className="card p-6 sm:p-8">
              <h2 className="mb-1 flex items-center gap-2 font-bold">
                <PenLine className="h-4 w-4 text-accent" /> Line-by-line
                rewrites
              </h2>
              <p className="mb-6 text-sm text-muted">
                Your weakest bullets, rewritten for this role.
              </p>
              <div className="space-y-5">
                {analysis.rewrites.map((r) => (
                  <div
                    key={r.original}
                    className="rounded-xl border border-edge bg-surface p-5"
                  >
                    <p className="text-sm text-bad/90 line-through decoration-bad/50">
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
            </div>
          )}

          {analysis.atsOptimizations && analysis.atsOptimizations.length > 0 && (
            <div className="card p-6 sm:p-8">
              <h2 className="mb-5 flex items-center gap-2 font-bold">
                <ListChecks className="h-4 w-4 text-accent" /> ATS optimization
                checklist
              </h2>
              <ul className="space-y-3">
                {analysis.atsOptimizations.map((tip, i) => (
                  <li key={tip} className="flex gap-3 text-sm leading-relaxed">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-card2 text-[11px] font-bold text-accent">
                      {i + 1}
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.interviewQuestions &&
            analysis.interviewQuestions.length > 0 && (
              <div className="card p-6 sm:p-8">
                <h2 className="mb-1 flex items-center gap-2 font-bold">
                  <MessageSquareText className="h-4 w-4 text-accent" />
                  Questions your gaps will trigger
                </h2>
                <p className="mb-5 text-sm text-muted">
                  Prepare these answers before the phone screen.
                </p>
                <ul className="space-y-3">
                  {analysis.interviewQuestions.map((q) => (
                    <li
                      key={q}
                      className="rounded-xl border border-edge bg-surface p-4 text-sm leading-relaxed"
                    >
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </>
      ) : (
        <div className="card relative overflow-hidden border-accent/40 p-8 text-center">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              background:
                "radial-gradient(60% 120% at 50% 0%, var(--color-accent), transparent)",
            }}
          />
          <Lock className="mx-auto h-7 w-7 text-accent" />
          <h2 className="mt-4 text-lg font-bold">
            The deep analysis is waiting
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            Pro reviews add <strong>line-by-line rewrites</strong> of your
            weakest bullets, an <strong>ATS optimization checklist</strong>,
            and the <strong>interview questions</strong> your gaps will
            trigger.
          </p>
          <Link
            href="/dashboard/billing?intent=pro"
            className="btn btn-primary relative mt-6"
          >
            <Sparkles className="h-4 w-4" /> Unlock with Pro
          </Link>
        </div>
      )}
    </Stagger>
  );
}
