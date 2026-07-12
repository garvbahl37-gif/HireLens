import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, FileText, Plus, TrendingUp, Trophy } from "lucide-react";
import { ScoreRing, scoreGrade } from "@/components/ScoreRing";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;

  const reviews = await db.review.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      jobTitle: true,
      company: true,
      overallScore: true,
      verdict: true,
      createdAt: true,
      deep: true,
    },
  });

  const avg =
    reviews.length > 0
      ? Math.round(
          reviews.reduce((sum, r) => sum + r.overallScore, 0) / reviews.length
        )
      : null;
  const best =
    reviews.length > 0 ? Math.max(...reviews.map((r) => r.overallScore)) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hey {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-muted">
            {reviews.length === 0
              ? "Run your first review to see where your resume stands."
              : "Here's how your resume is trending."}
          </p>
        </div>
        <Link href="/dashboard/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> New review
        </Link>
      </div>

      {/* stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-4 p-5">
          <FileText className="h-8 w-8 text-accent" />
          <div>
            <p className="text-2xl font-extrabold">{reviews.length}</p>
            <p className="text-xs text-muted">
              review{reviews.length === 1 ? "" : "s"} total
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <TrendingUp className="h-8 w-8 text-accent" />
          <div>
            <p className="text-2xl font-extrabold">{avg ?? "—"}</p>
            <p className="text-xs text-muted">average score</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <Trophy className="h-8 w-8 text-accent" />
          <div>
            <p className="text-2xl font-extrabold">{best ?? "—"}</p>
            <p className="text-xs text-muted">best score</p>
          </div>
        </div>
      </div>

      {/* history */}
      {reviews.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <FileText className="h-10 w-10 text-faint" />
          <h2 className="mt-4 text-lg font-bold">No reviews yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Upload your resume and the job description you&apos;re targeting —
            you&apos;ll get a scored, prioritized fix list in under a minute.
          </p>
          <Link href="/dashboard/new" className="btn btn-primary mt-6">
            Run my first review <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">
            Review history
          </h2>
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/dashboard/reviews/${r.id}`}
                  className="card flex items-center gap-5 p-4 transition-colors hover:border-accent/60"
                >
                  <ScoreRing score={r.overallScore} size={56} stroke={5} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {r.jobTitle}
                      {r.company && (
                        <span className="text-muted"> · {r.company}</span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {r.verdict}
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-xs font-semibold">
                      {scoreGrade(r.overallScore)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {r.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {r.deep && " · deep"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
