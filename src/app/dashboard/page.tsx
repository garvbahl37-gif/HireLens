import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DIMENSION_LABELS, type Analysis } from "@/lib/ai";
import { StatTile } from "@/components/dashboard/StatTile";
import { Spotlight, type SpotlightData } from "@/components/dashboard/Spotlight";
import { ScoreTrend, type TrendPoint } from "@/components/dashboard/ScoreTrend";
import { HistoryList, type HistoryItem } from "@/components/dashboard/HistoryList";
import { KeywordGaps } from "@/components/dashboard/KeywordGaps";
import { EmptyState } from "@/components/dashboard/EmptyState";

export const metadata: Metadata = { title: "Dashboard" };

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default async function DashboardPage() {
  const user = await requireUser();

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
      result: true,
    },
  });

  const count = reviews.length;
  const avg =
    count > 0
      ? Math.round(reviews.reduce((s, r) => s + r.overallScore, 0) / count)
      : null;
  const best = count > 0 ? Math.max(...reviews.map((r) => r.overallScore)) : null;

  // change between the two most recent reviews (newest first)
  const delta =
    count >= 2 ? reviews[0].overallScore - reviews[1].overallScore : null;

  const latest = reviews[0];
  const latestKeywords = latest
    ? {
        missing:
          (latest.result as unknown as Analysis).missingKeywords ?? [],
        matched:
          (latest.result as unknown as Analysis).matchedKeywords ?? [],
      }
    : { missing: [], matched: [] };
  const latestGaps = latest ? latestKeywords.missing.length : null;
  const spotlight: SpotlightData | null = latest
    ? (() => {
        const a = latest.result as unknown as Analysis;
        const worst = [...(a.improvements ?? [])].sort(
          (x, y) => sev(y.severity) - sev(x.severity)
        )[0];
        return {
          id: latest.id,
          jobTitle: latest.jobTitle,
          company: latest.company,
          overallScore: latest.overallScore,
          verdict: latest.verdict,
          date: fmtDate(latest.createdAt),
          dimensions: (
            Object.keys(DIMENSION_LABELS) as (keyof Analysis["dimensions"])[]
          ).map((k) => ({
            label: DIMENSION_LABELS[k],
            score: a.dimensions[k].score,
          })),
          topFix: worst ? { issue: worst.issue, fix: worst.fix } : null,
        };
      })()
    : null;

  // oldest → newest for the trend
  const trend: TrendPoint[] = [...reviews]
    .reverse()
    .map((r) => ({
      id: r.id,
      score: r.overallScore,
      label: r.jobTitle,
      date: fmtDate(r.createdAt),
    }));

  const history: HistoryItem[] = reviews.map((r) => ({
    id: r.id,
    jobTitle: r.jobTitle,
    company: r.company,
    overallScore: r.overallScore,
    verdict: r.verdict,
    deep: r.deep,
    date: fmtDate(r.createdAt),
  }));

  return (
    <div className="relative space-y-8">
      {/* ambient canvas, matching the marketing site */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(100% 50% at 70% -10%, rgba(242,98,46,0.09), transparent 60%), radial-gradient(70% 50% at 0% 90%, rgba(255,154,79,0.06), transparent 55%)",
        }}
      />

      {/* ---------- header ---------- */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Hey {user.name.split(" ")[0]},
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {count === 0
              ? "Let's find out where your resume actually stands."
              : count === 1
                ? "One review in. Run another to start tracking your trend."
                : `${count} reviews tracked · averaging ${avg}/100.`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {user.plan === "PRO" && (
            <span className="chip gap-1.5 border-accent/30 text-accent">
              <Sparkles className="h-3.5 w-3.5" /> Pro
            </span>
          )}
          <Link href="/dashboard/new" className="btn btn-primary btn-sheen">
            <Plus className="h-4 w-4" /> New review
          </Link>
        </div>
      </header>

      {count === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* ---------- KPI row ---------- */}
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            <StatTile icon="file" label="reviews run" value={count} index={0} />
            <StatTile
              icon="trend"
              label="average score"
              value={avg}
              delta={delta}
              index={1}
            />
            <StatTile icon="trophy" label="best score" value={best} index={2} />
            <StatTile
              icon="target"
              label="keyword gaps (latest)"
              value={latestGaps}
              index={3}
            />
          </div>

          {/* ---------- spotlight + right rail ---------- */}
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            {spotlight && <Spotlight data={spotlight} />}

            <div className="flex flex-col gap-5">
              {trend.length >= 2 ? (
                <div className="card p-6">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-sm font-bold">Score trend</h2>
                    <p className="text-xs text-faint">oldest → newest</p>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Every review you&apos;ve run, scored out of 100.
                  </p>
                  <div className="mt-3">
                    <ScoreTrend points={trend} />
                  </div>
                </div>
              ) : (
                <div className="card flex flex-col items-center justify-center p-6 text-center">
                  <p className="text-sm font-bold">Score trend</p>
                  <p className="mt-2 max-w-[220px] text-xs leading-relaxed text-muted">
                    Run one more review and your score history charts here, so
                    you can watch the resume climb.
                  </p>
                  <Link href="/dashboard/new" className="btn btn-ghost mt-5 text-xs">
                    Run another review
                  </Link>
                </div>
              )}

              <KeywordGaps
                missing={latestKeywords.missing}
                matched={latestKeywords.matched}
              />
            </div>
          </div>

          {/* ---------- history ---------- */}
          <section>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">
              Review history
            </h2>
            <HistoryList items={history} />
          </section>
        </>
      )}
    </div>
  );
}

function sev(s: "high" | "medium" | "low"): number {
  return s === "high" ? 3 : s === "medium" ? 2 : 1;
}
