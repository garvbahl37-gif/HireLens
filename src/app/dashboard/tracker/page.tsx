import type { Metadata } from "next";
import { TrackerBoard } from "@/components/tracker/TrackerBoard";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  type ApplicationCard,
  type ApplicationStatus,
} from "@/lib/applications";

export const metadata: Metadata = { title: "Applications" };

export default async function TrackerPage() {
  const user = await requireUser();

  const [apps, recentReviews] = await Promise.all([
    db.application.findMany({
      where: { userId: user.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    db.review.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, jobTitle: true, company: true, overallScore: true },
    }),
  ]);

  // Attach each card's linked review score without an N+1: one lookup map.
  const reviewIds = apps.map((a) => a.reviewId).filter((v): v is string => !!v);
  const scores = reviewIds.length
    ? await db.review.findMany({
        where: { id: { in: reviewIds }, userId: user.id },
        select: { id: true, overallScore: true },
      })
    : [];
  const scoreById = new Map(scores.map((r) => [r.id, r.overallScore]));

  const cards: ApplicationCard[] = apps.map((a) => ({
    id: a.id,
    company: a.company,
    role: a.role,
    status: a.status as ApplicationStatus,
    sourceUrl: a.sourceUrl,
    notes: a.notes,
    reviewId: a.reviewId,
    interviewId: a.interviewId,
    reviewScore: a.reviewId ? scoreById.get(a.reviewId) ?? null : null,
    sortOrder: a.sortOrder,
    appliedAt: a.appliedAt ? a.appliedAt.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
          <p className="mt-1 text-sm text-muted">
            Every job you&rsquo;re chasing, from wishlist to offer — linked to the
            review and interview you ran for it.
          </p>
        </div>
      </div>

      <TrackerBoard
        initial={cards}
        reviews={recentReviews.map((r) => ({
          id: r.id,
          label: r.company ? `${r.jobTitle} · ${r.company}` : r.jobTitle,
          score: r.overallScore,
        }))}
      />
    </div>
  );
}
