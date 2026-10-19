"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, AudioLines, FileText, Loader2, Lock, Sparkles } from "lucide-react";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { Monogram } from "@/components/dashboard/RecentReviews";
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
      <div className="card p-8 text-center sm:p-10">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white/60">
          <Lock className="h-5 w-5 text-accent" />
        </span>
        <h2 className="mt-4 text-lg font-medium tracking-tight">
          You&apos;ve used your free interview this month
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          Pro gives you unlimited interviews, nine questions instead of five,
          harder follow-ups, and a model answer for every question.
        </p>
        <Link href="/dashboard/billing?intent=pro" className="btn btn-primary mt-6">
          <Sparkles className="h-4 w-4" /> Upgrade to Pro
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* what they're about to walk into — the one forest strip on the page */}
      <div className="card-forest flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
            <AudioLines className="h-5 w-5 text-neon" />
          </span>
          <div>
            <p className="text-lg font-medium tracking-tight">
              {questions} questions · {isPro ? "Full loop" : "Screen"}
            </p>
            <p className="text-sm text-white/70">
              Adaptive — it follows up when an answer is thin.
            </p>
          </div>
        </div>
        {!isPro && (
          <Link
            href="/dashboard/billing?intent=pro"
            className="rounded-full bg-white/10 px-3.5 py-2 text-sm font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
          >
            Pro gets 9 questions + model answers
          </Link>
        )}
      </div>

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-medium tracking-tight">What the interviewer reads</h2>

        {/* source — segmented like the reference's tab strip */}
        {reviews.length > 0 && (
          <div
            role="group"
            aria-label="Interview source"
            className="mt-4 grid grid-cols-2 gap-1 rounded-2xl border border-white/80 bg-white/35 p-1"
          >
            {(["review", "manual"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  mode === m
                    ? "bg-white/85 text-ink shadow-[0_1px_2px_rgba(18,36,26,0.08)]"
                    : "text-muted hover:bg-white/40 hover:text-ink"
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
              className="mt-4"
            >
              <p className="text-sm text-muted">
                The interviewer will use the resume and job description from that
                review, and probe the gaps it found.
              </p>
              <ul className="mt-2 divide-y divide-ink/10">
                {reviews.map((r) => {
                  const picked = reviewId === r.id;
                  return (
                    <li key={r.id} className="py-1">
                      <button
                        onClick={() => setReviewId(r.id)}
                        aria-pressed={picked}
                        className={cn(
                          "-mx-2 flex w-[calc(100%+1rem)] items-center gap-3.5 rounded-xl px-2 py-2.5 text-left transition-colors",
                          picked
                            ? "bg-white/70 shadow-[0_1px_2px_rgba(18,36,26,0.06)]"
                            : "hover:bg-white/45"
                        )}
                      >
                        <Monogram name={r.company || r.jobTitle} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">
                            {r.company || r.jobTitle}
                          </span>
                          <span className="block truncate text-sm text-muted">
                            {r.company ? `${r.jobTitle}, ` : ""}
                            {r.date}
                          </span>
                        </span>
                        <ProgressRing score={r.overallScore} />
                        <span
                          aria-hidden
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            picked ? "border-pill bg-pill" : "border-ink/20 bg-white/50"
                          )}
                        >
                          {picked && <span className="h-1.5 w-1.5 rounded-full bg-neon" />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          ) : (
            <motion.div
              key="manual"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="mt-5 space-y-5"
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
                    Company <span className="font-normal text-faint">(optional)</span>
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
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-bad/30 bg-white/60 px-3 py-2 text-sm text-bad"
        >
          {error}
        </p>
      )}

      <button
        onClick={start}
        disabled={!ready || pending}
        className="btn btn-primary w-full py-3.5 text-base"
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
