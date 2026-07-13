import type { Metadata } from "next";
import {
  InterviewSetup,
  type PastReview,
} from "@/components/interview/InterviewSetup";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  FREE_INTERVIEWS_PER_MONTH,
  INTERVIEW_QUESTIONS_FREE,
  INTERVIEW_QUESTIONS_PRO,
} from "@/lib/plans";
import { monthlyInterviewCount } from "@/lib/usage";

export const metadata: Metadata = { title: "New mock interview" };

export default async function NewInterviewPage() {
  const user = await requireUser();
  const isPro = user.plan === "PRO";

  const [used, reviews] = await Promise.all([
    isPro ? Promise.resolve(0) : monthlyInterviewCount(user.id),
    db.review.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        jobTitle: true,
        company: true,
        overallScore: true,
        createdAt: true,
      },
    }),
  ]);

  const past: PastReview[] = reviews.map((r) => ({
    id: r.id,
    jobTitle: r.jobTitle,
    company: r.company,
    overallScore: r.overallScore,
    date: r.createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mock interview</h1>
        <p className="mt-1 text-sm text-muted">
          A hiring manager who has read your resume, knows the job, and will
          probe the gaps between them.
        </p>
      </div>

      <InterviewSetup
        reviews={past}
        isPro={isPro}
        questions={isPro ? INTERVIEW_QUESTIONS_PRO : INTERVIEW_QUESTIONS_FREE}
        limitHit={!isPro && used >= FREE_INTERVIEWS_PER_MONTH}
      />
    </div>
  );
}
