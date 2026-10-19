import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { ReviewResult } from "@/components/ReviewResult";
import { RescorePanel } from "@/components/RescorePanel";
import { RescoreBanner } from "@/components/RescoreBanner";
import { CoverLetterPanel } from "@/components/CoverLetterPanel";
import { TrackJobButton } from "@/components/TrackJobButton";
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

  // The header above already carries the back arrow, so the page opens
  // straight onto the review. Track and export live in the forest strip.
  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
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
        actions={
          <>
            <TrackJobButton
              reviewId={review.id}
              company={review.company}
              jobTitle={review.jobTitle}
            />
            <a
              href={`/api/reviews/${review.id}/pdf`}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_0_22px_-4px_rgba(69,230,36,0.55)] transition-[filter] hover:brightness-110 focus-visible:outline-white"
            >
              <Download className="h-4 w-4" /> Export PDF
            </a>
          </>
        }
      >
        <CoverLetterPanel
          reviewId={review.id}
          isPro={user.plan === "PRO"}
          initial={coverLetter.success ? coverLetter.data : null}
        />

        <RescorePanel reviewId={review.id} resumeText={review.resumeText} />
      </ReviewResult>
    </div>
  );
}
