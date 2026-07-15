"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, FileText, Loader2, Lock, Sparkles } from "lucide-react";
import { primeSpeech } from "@/lib/tts";
import { cn } from "@/lib/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

export type PastReview = {
  id: string;
  jobTitle: string;
  company: string | null;
  overallScore: number;
  date: string;
};

export function InterviewSetup({
  reviews,
  isPro,
  questions,
  limitHit,
  initialReviewId,
}: {
  reviews: PastReview[];
  isPro: boolean;
  questions: number;
  limitHit: boolean;
  /** Preselect a review — set when arriving from a review's "Defend these claims". */
  initialReviewId?: string;
}) {
  const router = useRouter();
  // Honour an incoming reviewId only if it's actually one of theirs; otherwise
  // fall back to the most recent, so a stale or forged id can't select nothing.
  const preselected =
    initialReviewId && reviews.some((r) => r.id === initialReviewId)
      ? initialReviewId
      : reviews[0]?.id ?? null;
  const [mode, setMode] = useState<"review" | "manual">(
    reviews.length > 0 ? "review" : "manual"
  );
  const [reviewId, setReviewId] = useState<string | null>(preselected);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready =
    mode === "review"
      ? !!reviewId
      : jobTitle.trim().length > 0 &&
        resumeText.trim().length >= 80 &&
        jobDescription.trim().length >= 40;

  async function start() {
    if (!ready || pending) return;

    // We are inside a real user gesture here, and the interview room is not:
    // it mounts after a router push, so its first utterance is blocked and the
    // opening question comes out silent. Unlocking the speech engine from this
    // click is what makes the interviewer audible from question one.
    primeSpeech();

    setPending(true);
    setError(null);

    const body =
      mode === "review"
        ? { reviewId }
        : {
            jobTitle: jobTitle.trim(),
            company: company.trim() || undefined,
            resumeText: resumeText.trim(),
            jobDescription: jobDescription.trim(),
          };

    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't start the interview.");
        setPending(false);
        return;
      }
      router.push(`/dashboard/interview/${data.id}`);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  if (limitHit) {
    return (
      <div className="card relative overflow-hidden border-accent/40 p-8 text-center">
        <Lock className="relative mx-auto h-6 w-6 text-accent" />
        <h2 className="relative mt-4 text-lg font-bold">
          You&apos;ve used your free interview this month
        </h2>
        <p className="relative mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          Pro gives you unlimited interviews, nine questions instead of five,
          harder follow-ups, and a model answer for every question.
        </p>
        <Link
          href="/dashboard/billing?intent=pro"
          className="btn btn-primary btn-sheen relative mt-6"
        >
          <Sparkles className="h-4 w-4" /> Upgrade to Pro
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* what they're about to walk into */}
      <div className="card flex flex-wrap items-center justify-between gap-4 border-accent/30 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 text-accent">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-sm font-bold">
              {questions} questions · {isPro ? "Full loop" : "Screen"}
            </p>
            <p className="text-xs text-muted">
              Adaptive — it follows up when an answer is thin.
            </p>
          </div>
        </div>
        {!isPro && (
          <Link
            href="/dashboard/billing?intent=pro"
            className="text-xs font-semibold text-accent hover:underline"
          >
            Pro gets 9 questions + model answers
          </Link>
        )}
      </div>

      {/* source */}
      {reviews.length > 0 && (
        <div className="flex gap-2">
          {(["review", "manual"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
                mode === m
                  ? "border-accent/50 bg-accent/10 text-accent"
                  : "border-edge text-muted hover:border-edge2 hover:text-ink"
              )}
            >
              {m === "review" ? "From a past review" : "Paste something new"}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {mode === "review" ? (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="space-y-3"
          >
            <p className="text-sm text-muted">
              The interviewer will use the resume and job description from that
              review, and probe the gaps it found.
            </p>
            {reviews.map((r) => (
              <button
                key={r.id}
                onClick={() => setReviewId(r.id)}
                className={cn(
                  "card flex w-full items-center gap-4 p-4 text-left transition-colors",
                  reviewId === r.id
                    ? "border-accent/50 bg-accent/[0.04]"
                    : "hover:border-edge2"
                )}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-bold"
                  style={{
                    borderColor:
                      r.overallScore >= 75
                        ? "color-mix(in srgb, var(--color-good) 40%, transparent)"
                        : r.overallScore >= 55
                          ? "color-mix(in srgb, var(--color-warn) 40%, transparent)"
                          : "color-mix(in srgb, var(--color-bad) 40%, transparent)",
                    color:
                      r.overallScore >= 75
                        ? "var(--color-good)"
                        : r.overallScore >= 55
                          ? "var(--color-warn)"
                          : "var(--color-bad)",
                  }}
                >
                  {r.overallScore}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {r.jobTitle}
                    {r.company && (
                      <span className="font-normal text-muted">
                        {" "}
                        · {r.company}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-faint">{r.date}</p>
                </div>
                <span
                  className={cn(
                    "h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                    reviewId === r.id
                      ? "border-accent bg-accent"
                      : "border-edge2"
                  )}
                />
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="card space-y-5 p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="jt">
                  Job title
                </label>
                <input
                  id="jt"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Senior Frontend Engineer"
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="co">
                  Company <span className="text-faint">(optional)</span>
                </label>
                <input
                  id="co"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Stripe"
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="jd">
                Job description
              </label>
              <textarea
                id="jd"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={5}
                placeholder="Paste the posting…"
                className="input resize-y"
              />
            </div>

            <div>
              <label className="label" htmlFor="cv">
                Your resume
              </label>
              <textarea
                id="cv"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={7}
                placeholder="Paste your resume text…"
                className="input resize-y"
              />
              <p className="mt-1.5 text-xs text-faint">
                The interviewer quotes your resume back at you, so paste the real
                thing.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-bad/30 bg-bad/5 px-3 py-2 text-sm text-bad"
        >
          {error}
        </p>
      )}

      <button
        onClick={start}
        disabled={!ready || pending}
        className="btn btn-primary btn-sheen w-full py-3 text-base"
      >
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            The interviewer is reading your resume…
          </>
        ) : (
          <>
            Start the interview <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {reviews.length === 0 && mode === "manual" && (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-faint">
          <FileText className="h-3.5 w-3.5" />
          Tip: run a resume review first and the interview can launch straight
          from it.
        </p>
      )}
    </div>
  );
}
