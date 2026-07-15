import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AnalysisError } from "@/lib/ai";
import type { Claim } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  type InterviewContext,
  generateReport,
  turnSchema,
} from "@/lib/interview";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Score whatever has been answered so far and close the interview.
 *
 * Two callers:
 *  - the candidate ending early ("I've had enough, score me on these four"),
 *  - and the recovery path: if report generation failed on the final answer,
 *    the transcript is saved but the interview is still IN_PROGRESS with no
 *    question pending. Without this route that state is a dead end — the
 *    answer endpoint would reject it because no question is waiting.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const interview = await db.interview.findFirst({
    where: { id, userId: user.id },
  });
  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }
  if (interview.status === "COMPLETED") {
    return NextResponse.json({ done: true, alreadyDone: true });
  }

  const transcript = z
    .array(turnSchema)
    .parse(interview.transcript as unknown);

  // Drop a trailing unanswered question — it shouldn't be scored.
  const scored =
    transcript.at(-1)?.role === "interviewer"
      ? transcript.slice(0, -1)
      : transcript;

  const answered = scored.filter((t) => t.role === "candidate").length;
  if (answered === 0) {
    return NextResponse.json(
      { error: "Answer at least one question first." },
      { status: 400 }
    );
  }

  const ctx: InterviewContext = {
    jobTitle: interview.jobTitle,
    company: interview.company,
    resumeText: interview.resumeText,
    jobDescription: interview.jobDescription,
    // Score against what was actually asked, not what was planned.
    totalQuestions: answered,
    deep: interview.deep,
    // The per-answer claim verdicts are read from the transcript's probesClaim
    // stamps, so an early finish still audits the claims that were pressed.
    claims: (interview.claims as Claim[] | null) ?? [],
  };

  try {
    const { result: report, model } = await generateReport(ctx, scored);

    await db.interview.update({
      where: { id: interview.id },
      data: {
        transcript: scored,
        answered,
        status: "COMPLETED",
        report,
        overallScore: report.overallScore,
        verdict: report.verdict,
        model,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ done: true });
  } catch (err) {
    if (err instanceof AnalysisError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[interviews] finish failed:", err);
    return NextResponse.json(
      { error: "Couldn't write the report. Please try again." },
      { status: 502 }
    );
  }
}
