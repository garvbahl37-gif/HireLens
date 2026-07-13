import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ReviewResult } from "@/components/ReviewResult";
import { analysisSchema } from "@/lib/ai";
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

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> All reviews
      </Link>
      <ReviewResult
        analysis={parsed.data}
        deep={review.deep}
        meta={{
          jobTitle: review.jobTitle,
          company: review.company,
          resumeFilename: review.resumeFilename,
          createdAt: review.createdAt,
        }}
      />
    </div>
  );
}
