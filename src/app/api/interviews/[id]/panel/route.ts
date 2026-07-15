import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AnalysisError } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  type InterviewContext,
  convenePanel,
  turnSchema,
} from "@/lib/interview";
import { enforce } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Convene a hiring panel over a finished interview (Pro).
 *
 * On-demand and cached: the deliberation is four model calls, so it never runs
 * on the answer path (which has its own 60s budget), and once convened it is
 * stored on the interview row and returned from there.
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
        error: "The panel is a Pro feature. Upgrade to convene one.",
        code: "UPGRADE_REQUIRED",
      },
      { status: 402 }
    );
  }

  const limited = await enforce(req, "analysis", user.id);
  if (limited) return limited;

  const interview = await db.interview.findFirst({
    where: { id, userId: user.id },
  });
  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }
  if (interview.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Finish the interview before convening the panel." },
      { status: 409 }
    );
  }

  const transcript = z.array(turnSchema).parse(interview.transcript as unknown);
  // Score only what was actually answered — drop a trailing unanswered question.
  const scored =
    transcript.at(-1)?.role === "interviewer"
      ? transcript.slice(0, -1)
      : transcript;

  const ctx: InterviewContext = {
    jobTitle: interview.jobTitle,
    company: interview.company,
    resumeText: interview.resumeText,
    jobDescription: interview.jobDescription,
    totalQuestions: interview.totalQuestions,
    deep: interview.deep,
  };

  let panel;
  try {
    panel = await convenePanel(ctx, scored);
  } catch (err) {
    if (err instanceof AnalysisError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[panel] failed:", err);
    return NextResponse.json(
      { error: "The panel couldn't convene right now. Try again." },
      { status: 502 }
    );
  }

  await db.interview.update({
    where: { id },
    data: { panel: JSON.parse(JSON.stringify(panel.result)) },
  });

  return NextResponse.json({ panel: panel.result });
}
