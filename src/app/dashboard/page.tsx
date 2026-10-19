import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DIMENSION_LABELS, type Analysis } from "@/lib/ai";
import { Spotlight, type SpotlightData } from "@/components/dashboard/Spotlight";
import { ScoreAnalysis, type TrendPoint } from "@/components/dashboard/ScoreAnalysis";
import {
  AssistantPanel,
  type AssistantNote,
  type Suggestion,
} from "@/components/dashboard/AssistantPanel";
import { RecentReviews } from "@/components/dashboard/RecentReviews";
import {
  InterviewWeek,
  type PracticeSession,
} from "@/components/dashboard/InterviewWeek";
import { HistoryList, type HistoryItem } from "@/components/dashboard/HistoryList";
import { KeywordGaps } from "@/components/dashboard/KeywordGaps";

export const metadata: Metadata = { title: "Dashboard" };

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const fmtTick = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default async function DashboardPage() {
  const user = await requireUser();

  const [reviews, interviews] = await Promise.all([
    db.review.findMany({
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
    }),
    db.interview.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        jobTitle: true,
        company: true,
        status: true,
        answered: true,
        totalQuestions: true,
        overallScore: true,
        createdAt: true,
      },
    }),
  ]);

  const count = reviews.length;
  const avg =
    count > 0
      ? Math.round(reviews.reduce((s, r) => s + r.overallScore, 0) / count)
      : null;
  const best = count > 0 ? Math.max(...reviews.map((r) => r.overallScore)) : null;

  const latest = reviews[0];
  const latestAnalysis = latest ? (latest.result as unknown as Analysis) : null;
  const worstFix = latestAnalysis
    ? [...(latestAnalysis.improvements ?? [])].sort(
        (x, y) => sev(y.severity) - sev(x.severity)
      )[0]
    : undefined;

  const spotlight: SpotlightData | null =
    latest && latestAnalysis
      ? {
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
            score: latestAnalysis.dimensions[k].score,
          })),
          topFix: worstFix ? { issue: worstFix.issue, fix: worstFix.fix } : null,
        }
      : null;

  // oldest → newest for the chart
  const trend: TrendPoint[] = [...reviews].reverse().map((r) => {
    const a = r.result as unknown as Analysis;
    return {
      id: r.id,
      score: r.overallScore,
      match: a?.dimensions?.jobMatch?.score ?? null,
      label: r.jobTitle,
      company: r.company,
      tick: fmtTick(r.createdAt),
      date: fmtDate(r.createdAt),
    };
  });

  const history: HistoryItem[] = reviews.map((r) => ({
    id: r.id,
    jobTitle: r.jobTitle,
    company: r.company,
    overallScore: r.overallScore,
    verdict: r.verdict,
    deep: r.deep,
    date: fmtDate(r.createdAt),
  }));

  const sessions: PracticeSession[] = interviews.map((i) => ({
    id: i.id,
    jobTitle: i.jobTitle,
    company: i.company,
    status: i.status,
    answered: i.answered,
    total: i.totalQuestions,
    score: i.overallScore,
    at: i.createdAt.toISOString(),
  }));

  /* ---- assistant: next steps picked from the user's own data ---- */
  const live = interviews.find((i) => i.status === "IN_PROGRESS");
  const lastDone = interviews.find((i) => i.status === "COMPLETED");
  const suggestions: Suggestion[] = [
    live && {
      label: `Pick up your ${live.jobTitle} interview?`,
      href: `/dashboard/interview/${live.id}`,
    },
    latest && {
      label: `Rehearse the interview for ${latest.company || latest.jobTitle}?`,
      href: `/dashboard/interview/new?reviewId=${latest.id}`,
    },
    {
      label: count === 0 ? "Score your resume against a job?" : "Score your resume against a new job?",
      href: "/dashboard/new",
    },
    lastDone && {
      label: `See how your ${lastDone.jobTitle} interview went?`,
      href: `/dashboard/interview/${lastDone.id}/report`,
    },
    { label: "Track a new application?", href: "/dashboard/tracker" },
  ]
    .filter((s): s is Suggestion => Boolean(s))
    .slice(0, 4);

  const note: AssistantNote | null =
    latest && worstFix
      ? {
          body: `Your last review scored ${latest.overallScore}. The fix that moves it most: ${worstFix.issue}`,
          href: `/dashboard/reviews/${latest.id}`,
          cta: "Open the review",
        }
      : count === 0
        ? {
            body: "Paste a job description below and I'll open a review with it filled in. You add the resume.",
            href: "/dashboard/new",
            cta: "Or start from scratch",
          }
        : null;

  return (
    <div className="space-y-4">
      {/* One grid for every card, so all gutters and edges line up: the chart
          spans two columns, the assistant spans the first two rows of the
          third, and the latest-review row reuses the same columns.
          minmax(0,…) tracks keep long titles from pushing a column wider than
          the screen on phones. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.95fr)]">
        <div className="materialize flex min-w-0 md:col-span-2" style={delay(0)}>
          <ScoreAnalysis points={trend} count={count} avg={avg} best={best} />
        </div>

        <div
          className="materialize flex min-w-0 md:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1"
          style={delay(140)}
        >
          <AssistantPanel suggestions={suggestions} note={note} />
        </div>

        <div className="materialize flex min-w-0" style={delay(260)}>
          <RecentReviews
          total={count}
          items={reviews.slice(0, 4).map((r) => ({
            id: r.id,
            jobTitle: r.jobTitle,
            company: r.company,
            overallScore: r.overallScore,
            date: fmtDate(r.createdAt),
          }))}
          />
        </div>
        <div className="materialize flex min-w-0" style={delay(360)}>
          <InterviewWeek sessions={sessions} />
        </div>

        {spotlight && latestAnalysis && (
          <>
            <div className="materialize flex min-w-0 md:col-span-2" style={delay(460)}>
              <Spotlight data={spotlight} />
            </div>
            <div className="materialize flex min-w-0 md:col-span-2 lg:col-span-1" style={delay(540)}>
              <KeywordGaps
                missing={latestAnalysis.missingKeywords ?? []}
                matched={latestAnalysis.matchedKeywords ?? []}
              />
            </div>
          </>
        )}
      </div>

      {count > 4 && (
        <section id="history" className="scroll-mt-6 pt-4">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">All reviews</h2>
          <HistoryList items={history} />
        </section>
      )}
    </div>
  );
}

/** Stagger for the cards materialising in, as on the reference's load. */
function delay(ms: number) {
  return { "--d": `${ms}ms` } as React.CSSProperties;
}

function sev(s: "high" | "medium" | "low"): number {
  return s === "high" ? 3 : s === "medium" ? 2 : 1;
}
