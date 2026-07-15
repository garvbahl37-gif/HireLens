import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  MessagesSquare,
  PlayCircle,
  Plus,
  Sparkles,
} from "lucide-react";
import { ScoreRing } from "@/components/ScoreRing";
import { Stagger } from "@/components/dashboard/Stagger";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { FREE_INTERVIEWS_PER_MONTH } from "@/lib/plans";
import { monthlyInterviewCount } from "@/lib/usage";

export const metadata: Metadata = { title: "Mock interviews" };

const VERDICT_COLOR: Record<string, string> = {
  "Strong hire": "text-good",
  Hire: "text-good",
  "Lean hire": "text-warn",
  "Lean no hire": "text-warn",
  "No hire": "text-bad",
};

export default async function InterviewsPage() {
  const user = await requireUser();
  const isPro = user.plan === "PRO";

  const [interviews, used] = await Promise.all([
    db.interview.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        jobTitle: true,
        company: true,
        status: true,
        overallScore: true,
        verdict: true,
        answered: true,
        totalQuestions: true,
        deep: true,
        createdAt: true,
      },
    }),
    isPro ? Promise.resolve(0) : monthlyInterviewCount(user.id),
  ]);

  const remaining = Math.max(0, FREE_INTERVIEWS_PER_MONTH - used);

  return (
    <Stagger className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Mock interviews
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {interviews.length === 0
              ? "Practise against a hiring manager who has actually read your resume."
              : isPro
                ? `${interviews.length} interview${interviews.length === 1 ? "" : "s"} · unlimited on Pro.`
                : `${remaining} of ${FREE_INTERVIEWS_PER_MONTH} free interview${FREE_INTERVIEWS_PER_MONTH === 1 ? "" : "s"} left this month.`}
          </p>
        </div>
        <Link href="/dashboard/interview/new" className="btn btn-primary btn-sheen">
          <Plus className="h-4 w-4" /> New interview
        </Link>
      </header>

      {interviews.length === 0 ? (
        <div className="card relative flex flex-col items-center overflow-hidden px-6 py-20 text-center">
          <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-edge2 bg-card2 shadow-[0_0_40px_-8px_var(--color-accent)]">
            <MessagesSquare className="h-7 w-7 text-accent" />
          </span>
          <h2 className="relative mt-6 text-xl font-bold tracking-tight">
            The interview you&apos;re about to fail
          </h2>
          <p className="relative mt-2 max-w-md text-sm leading-relaxed text-muted">
            It reads your resume, reads the job, and asks the questions your gaps
            invite — quoting your own bullets back at you. Then it scores you and
            makes the call a real panel would.
          </p>
          <Link
            href="/dashboard/interview/new"
            className="btn btn-primary btn-sheen relative mt-7"
          >
            Start my first interview <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {interviews.map((iv) => {
            const inProgress = iv.status === "IN_PROGRESS";
            const href = inProgress
              ? `/dashboard/interview/${iv.id}`
              : `/dashboard/interview/${iv.id}/report`;

            return (
              <li key={iv.id}>
                <Link
                  href={href}
                  className="card group flex items-center gap-5 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-edge2"
                >
                  {inProgress ? (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent">
                      <PlayCircle className="h-6 w-6" />
                    </span>
                  ) : (
                    <ScoreRing score={iv.overallScore ?? 0} size={56} stroke={5} />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-semibold">
                      <span className="truncate">
                        {iv.jobTitle}
                        {iv.company && (
                          <span className="font-normal text-muted">
                            {" "}
                            · {iv.company}
                          </span>
                        )}
                      </span>
                      {iv.deep && (
                        <span className="chip shrink-0 gap-1 border-accent/30 text-accent">
                          <Sparkles className="h-3 w-3" /> Pro
                        </span>
                      )}
                    </p>
                    <p className="mt-1 truncate text-sm">
                      {inProgress ? (
                        <span className="text-accent">
                          In progress — {iv.answered}/{iv.totalQuestions}{" "}
                          answered. Resume it.
                        </span>
                      ) : (
                        <span
                          className={
                            VERDICT_COLOR[iv.verdict ?? ""] ?? "text-muted"
                          }
                        >
                          {iv.verdict}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-xs text-faint">
                      {iv.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-faint transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Stagger>
  );
}
