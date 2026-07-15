import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { ReviewResult } from "@/components/ReviewResult";
import { RescorePanel } from "@/components/RescorePanel";
import { RescoreBanner } from "@/components/RescoreBanner";
import { CoverLetterPanel } from "@/components/CoverLetterPanel";
import { analysisSchema, coverLetterSchema } from "@/lib/ai";
import { rescoreDelta } from "@/lib/rescore";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  // Ownership enforced in the query — another user's id 404s.
  const review = await db.review.findFirst({
    where: { id, userId: user.id },
  });
  if (!review) notFound();

  const parsed = analysisSchema.safeParse(review.result);
  if (!parsed.success) notFound();

  // If this review is a re-score, pull its parent (ownership re-checked) so we
  // can show the honest before/after.
  let delta = null;
  if (review.parentReviewId) {
    const parent = await db.review.findFirst({
      where: { id: review.parentReviewId, userId: user.id },
      select: { result: true, model: true, promptVersion: true },
    });
    const parentParsed = parent && analysisSchema.safeParse(parent.result);
    if (parent && parentParsed && parentParsed.success) {
      delta = rescoreDelta(
        { result: parentParsed.data, model: parent.model, promptVersion: parent.promptVersion },
        { result: parsed.data, model: review.model, promptVersion: review.promptVersion }
      );
    }
  }

  const coverLetter = coverLetterSchema.safeParse(review.coverLetter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> All reviews
        </Link>
        <a
          href={`/api/reviews/${review.id}/pdf`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <Download className="h-4 w-4" /> Export PDF
        </a>
      </div>

      {delta && review.parentReviewId && (
        <RescoreBanner delta={delta} parentReviewId={review.parentReviewId} />
      )}

      <ReviewResult
        analysis={parsed.data}
        deep={review.deep}
        reviewId={review.id}
        meta={{
          jobTitle: review.jobTitle,
          company: review.company,
          resumeFilename: review.resumeFilename,
          createdAt: review.createdAt,
        }}
      />

      <CoverLetterPanel
        reviewId={review.id}
        isPro={user.plan === "PRO"}
        initial={coverLetter.success ? coverLetter.data : null}
      />

      <RescorePanel reviewId={review.id} resumeText={review.resumeText} />
    </div>
  );
}
