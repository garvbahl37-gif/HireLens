import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, AudioLines, Play, Plus, Sparkles } from "lucide-react";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { Monogram } from "@/components/dashboard/RecentReviews";
import { Stagger } from "@/components/dashboard/Stagger";
import { requireUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
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

  const scored = interviews
    .map((iv) => iv.overallScore)
    .filter((s): s is number => s !== null);
  const average =
    scored.length > 0
      ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
      : null;
  const best = scored.length > 0 ? Math.max(...scored) : null;

  const allowance = isPro
    ? "Unlimited on Pro."
    : `${remaining} of ${FREE_INTERVIEWS_PER_MONTH} free interview${FREE_INTERVIEWS_PER_MONTH === 1 ? "" : "s"} left this month.`;

  if (interviews.length === 0) {
    return (
      <Stagger>
        <div className="card mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-16 text-center">
          <div className="orb h-[84px] w-[84px]" aria-hidden />
          <h2 className="mt-8 text-[1.4rem] font-medium tracking-tight">
            The interview you&apos;re about to fail
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            It reads your resume, reads the job, and asks the questions your gaps
            invite — quoting your own bullets back at you. Then it scores you and
            makes the call a real panel would.
          </p>
          <Link href="/dashboard/interview/new" className="btn btn-primary mt-7">
            Start my first interview <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-xs text-faint">
            Practise against a hiring manager who has actually read your resume.{" "}
            {allowance}
          </p>
        </div>
      </Stagger>
    );
  }

  return (
    <Stagger className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
      {/* ---------- every session, in the reference's request-list style ---------- */}
      <section className="card p-5 md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <h2 className="text-lg font-medium tracking-tight">Your sessions</h2>
            <p className="mt-0.5 text-sm text-muted">
              {interviews.length} interview{interviews.length === 1 ? "" : "s"}.{" "}
              {allowance}
            </p>
          </div>
          <Link
            href="/dashboard/interview/new"
            className="text-sm font-medium text-accent hover:underline"
          >
            New interview
          </Link>
        </div>

        <ul className="mt-3 divide-y divide-ink/10">
          {interviews.map((iv) => {
            const inProgress = iv.status === "IN_PROGRESS";
            const href = inProgress
              ? `/dashboard/interview/${iv.id}`
              : `/dashboard/interview/${iv.id}/report`;
            const date = iv.createdAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const status = inProgress
              ? `In progress, ${iv.answered}/${iv.totalQuestions} answered`
              : iv.verdict;
            const statusColor = inProgress
              ? "text-accent"
              : (VERDICT_COLOR[iv.verdict ?? ""] ?? "text-muted");

            return (
              <li key={iv.id}>
                <Link
                  href={href}
                  className="group -mx-2 flex items-center gap-3.5 rounded-xl px-2 py-3.5 transition-colors hover:bg-white/45"
                >
                  <Monogram name={iv.company || iv.jobTitle} />

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold">
                        {iv.company || iv.jobTitle}
                      </span>
                      {iv.deep && (
                        <span className="chip shrink-0 gap-1 px-2 py-0.5 text-[11px] text-accent">
                          <Sparkles className="h-3 w-3" /> Pro
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-sm text-muted">
                      {iv.company ? `${iv.jobTitle}, ` : ""}
                      {date}
                    </span>
                    {status && (
                      <span className={cn("mt-0.5 block truncate text-sm md:hidden", statusColor)}>
                        {status}
                      </span>
                    )}
                  </span>

                  {status && (
                    <span
                      className={cn(
                        "hidden w-44 shrink-0 truncate text-right text-sm md:block",
                        statusColor
                      )}
                    >
                      {status}
                    </span>
                  )}

                  <span className="flex w-16 shrink-0 justify-end">
                    {inProgress ? (
                      <span className="flex items-center gap-1.5 text-sm font-medium text-accent">
                        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-pill text-white">
                          <Play className="h-2.5 w-2.5 fill-current" />
                        </span>
                        Resume
                      </span>
                    ) : (
                      <ProgressRing score={iv.overallScore ?? 0} />
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------- the numbers + the next session ---------- */}
      <aside className="flex flex-col gap-4">
        <div className="card grid grid-cols-3 divide-x divide-ink/10 px-2 py-5">
          {[
            { label: "Sessions", value: interviews.length },
            { label: "Average", value: average ?? "—" },
            { label: "Best", value: best ?? "—" },
          ].map((s) => (
            <div key={s.label} className="px-3 text-center">
              <p className="text-sm text-muted">{s.label}</p>
              <p className="mt-1 text-3xl font-light tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="card-forest p-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
            <AudioLines className="h-5 w-5 text-neon" />
          </span>
          <h2 className="mt-4 text-lg font-medium tracking-tight">Rehearse the next one</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-white/75">
            A hiring manager who has read your resume, knows the job, and will
            probe the gaps between them. Out loud, timed, then scored.
          </p>
          <Link
            href="/dashboard/interview/new"
            className="btn mt-5 bg-white text-ink shadow-[0_8px_20px_-10px_rgba(0,0,0,0.35)] hover:bg-white/90"
          >
            <Plus className="h-4 w-4" /> New interview
          </Link>
        </div>
      </aside>
    </Stagger>
  );
}
