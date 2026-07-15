import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AnalysisError, analyzeResume } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforce } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MIN_RESUME_CHARS = 200;

const bodySchema = z.object({
  resumeText: z.string().trim().min(MIN_RESUME_CHARS, "That resume looks too short to re-score."),
});

/**
 * Re-score an edited resume against the SAME job.
 *
 * This is the loop the product is built to prove: fix the things the review
 * flagged, re-run, and watch the number move — for real, not projected. It is
 * deliberately NOT counted against the monthly free limit: iterating a single
 * job is the core value, and charging a review to verify a number is the
 * credit-burn pattern the market punishes. The burst limiter still applies.
 *
 * The job title, company and job description are copied from the parent — you
 * are re-scoring the same target, so you cannot move the goalposts to inflate
 * the delta. Temperature is pinned to 0 and the model is recorded, so the diff
 * reflects the edit rather than sampling noise.
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

  const limited = await enforce(req, "analysis", user.id);
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  // Ownership enforced in the query. Re-score the root job spec, not a mutated
  // one — copy the target from the parent.
  const parent = await db.review.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      jobTitle: true,
      company: true,
      jobDescription: true,
    },
  });
  if (!parent) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const deep = user.plan === "PRO";

  let analysis;
  try {
    analysis = await analyzeResume({
      resumeText: parsed.data.resumeText,
      jobDescription: parent.jobDescription,
      jobTitle: parent.jobTitle,
      company: parent.company,
      deep,
      temperature: 0,
    });
  } catch (err) {
    if (err instanceof AnalysisError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[rescore] failed:", err);
    return NextResponse.json(
      { error: "The analysis service is unavailable right now. Try again in a minute." },
      { status: 502 }
    );
  }

  const review = await db.review.create({
    data: {
      userId: user.id,
      parentReviewId: parent.id,
      jobTitle: parent.jobTitle,
      company: parent.company,
      resumeFilename: null,
      resumeText: parsed.data.resumeText,
      jobDescription: parent.jobDescription,
      overallScore: analysis.result.overallScore,
      verdict: analysis.result.verdict,
      result: JSON.parse(JSON.stringify(analysis.result)),
      deep,
      model: analysis.model,
      promptVersion: analysis.promptVersion,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: review.id }, { status: 201 });
}
