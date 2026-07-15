import { NextRequest, NextResponse } from "next/server";
import { AnalysisError, generateCoverLetter } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforce } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Generate a cover letter for a review's resume + job (Pro).
 *
 * Gated server-side: a free user gets a 402, never a generated letter. The
 * result is cached on the review so re-opening the page doesn't re-bill the
 * model; POSTing again regenerates.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (user.plan !== "PRO") {
    return NextResponse.json(
      {
        error: "Cover letters are a Pro feature. Upgrade to generate one.",
        code: "UPGRADE_REQUIRED",
      },
      { status: 402 }
    );
  }

  const limited = await enforce(req, "analysis", user.id);
  if (limited) return limited;

  const review = await db.review.findFirst({
    where: { id, userId: user.id },
    select: {
      resumeText: true,
      jobTitle: true,
      company: true,
      jobDescription: true,
    },
  });
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  let letter;
  try {
    letter = await generateCoverLetter({
      resumeText: review.resumeText,
      jobDescription: review.jobDescription,
      jobTitle: review.jobTitle,
      company: review.company,
    });
  } catch (err) {
    if (err instanceof AnalysisError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[cover-letter] failed:", err);
    return NextResponse.json(
      { error: "Couldn't write the cover letter. Try again in a minute." },
      { status: 502 }
    );
  }

  await db.review.update({
    where: { id },
    data: { coverLetter: JSON.parse(JSON.stringify(letter.result)) },
  });

  return NextResponse.json({ coverLetter: letter.result });
}
