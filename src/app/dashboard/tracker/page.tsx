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

  // A pipeline summary in the reference's "Job Analysis" header style: a few
  // light numbers with hairline dividers.
  const inPlay = cards.filter((c) =>
    ["APPLIED", "SCREEN", "ONSITE"].includes(c.status)
  ).length;
  const offers = cards.filter((c) => c.status === "OFFER").length;

  return (
    <div className="space-y-4">
      <section className="card flex flex-wrap items-center justify-between gap-x-8 gap-y-4 p-5 md:px-6">
        <div className="min-w-0 max-w-xl">
          <h2 className="text-lg font-medium tracking-tight">Your pipeline</h2>
          <p className="mt-1 text-sm text-muted">
            Every job you&rsquo;re chasing, from wishlist to offer — linked to the
            review and interview you ran for it. Drag a card to move it, or use
            its menu.
          </p>
        </div>
        <dl className="flex divide-x divide-ink/10">
          {[
            { label: "Tracking", value: cards.length },
            { label: "In play", value: inPlay },
            { label: "Offers", value: offers },
          ].map((s) => (
            <div key={s.label} className="px-5 first:pl-0 last:pr-0">
              <dt className="text-sm text-muted">{s.label}</dt>
              <dd className="mt-0.5 text-3xl font-light tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

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
