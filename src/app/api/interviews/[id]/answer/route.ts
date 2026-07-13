import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AnalysisError } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  type InterviewContext,
  type Turn,
  deliverySchema,
  generateReport,
  nextQuestion,
  turnSchema,
} from "@/lib/interview";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  answer: z.string().trim().min(1, "Say something.").max(6000),
  /**
   * Measured in the browser from the real audio. Absent for typed answers.
   *
   * This is client-supplied and therefore untrusted, but it is only ever used
   * to coach the person who sent it — there is no privilege or payment
   * attached to it, so a user faking their own words-per-minute only cheats
   * themselves. Bounded by the schema so it can't be used to bloat the prompt.
   */
  delivery: deliverySchema.optional(),
});

/**
 * Submit an answer.
 *
 * Returns either the interviewer's next question, or — when the last question
 * has been answered — completes the interview and writes the scored report.
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

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid answer" },
      { status: 400 }
    );
  }

  // Ownership enforced in the query.
  const interview = await db.interview.findFirst({
    where: { id, userId: user.id },
  });
  if (!interview) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }
  if (interview.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "This interview is already finished." },
      { status: 409 }
    );
  }

  const transcript = z
    .array(turnSchema)
    .parse(interview.transcript as unknown);

  const lastRole = transcript.at(-1)?.role;

  let withAnswer: Turn[];
  if (lastRole === "interviewer") {
    // Normal: attach this answer to the pending question.
    const answerTurn: Turn = {
      role: "candidate",
      content: parsed.data.answer,
      // A typed answer reports zero duration; storing that would let the report
      // compute a nonsense words-per-minute, so drop it.
      delivery:
        parsed.data.delivery && parsed.data.delivery.durationSec > 0
          ? parsed.data.delivery
          : undefined,
      at: new Date().toISOString(),
    };
    withAnswer = [...transcript, answerTurn];
  } else if (lastRole === "candidate") {
    // Recovery: a previous next-question (or report) attempt failed AFTER the
    // answer was already saved, so the transcript ends on a candidate turn and
    // the interview is IN_PROGRESS with nothing pending. Without this, every
    // retry 409'd and the interview was permanently bricked. Don't append a
    // duplicate answer — just resume from what's saved and retry the AI step.
    withAnswer = transcript;
  } else {
    return NextResponse.json(
      { error: "There's no question waiting for an answer." },
      { status: 409 }
    );
  }

  const answered = withAnswer.filter((t) => t.role === "candidate").length;

  const ctx: InterviewContext = {
    jobTitle: interview.jobTitle,
    company: interview.company,
    resumeText: interview.resumeText,
    jobDescription: interview.jobDescription,
    totalQuestions: interview.totalQuestions,
    deep: interview.deep,
  };

  /* ---------- the interview is over: write the report ---------- */
  if (answered >= interview.totalQuestions) {
    try {
      const { result: report, model } = await generateReport(ctx, withAnswer);

      await db.interview.update({
        where: { id: interview.id },
        data: {
          transcript: withAnswer,
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
      // The answer is still worth keeping even if the report generation failed;
      // otherwise the candidate loses their last answer to a transient blip.
      await db.interview
        .update({
          where: { id: interview.id },
          data: { transcript: withAnswer, answered },
        })
        .catch(() => {});

      if (err instanceof AnalysisError) {
        return NextResponse.json({ error: err.message }, { status: 502 });
      }
      console.error("[interviews] report failed:", err);
      return NextResponse.json(
        { error: "Couldn't write the report. Try finishing again." },
        { status: 502 }
      );
    }
  }

  /* ---------- otherwise: ask the next question ---------- */
  try {
    const { result } = await nextQuestion(ctx, withAnswer);

    const questionTurn: Turn = {
      role: "interviewer",
      kind: result.kind,
      content: result.question,
      isFollowUp: result.isFollowUp,
      intent: result.intent,
      at: new Date().toISOString(),
    };

    await db.interview.update({
      where: { id: interview.id },
      data: {
        transcript: [...withAnswer, questionTurn],
        answered,
      },
    });

    return NextResponse.json({
      done: false,
      question: {
        content: questionTurn.content,
        kind: questionTurn.kind,
        isFollowUp: questionTurn.isFollowUp,
      },
      answered,
      totalQuestions: interview.totalQuestions,
    });
  } catch (err) {
    await db.interview
      .update({
        where: { id: interview.id },
        data: { transcript: withAnswer, answered },
      })
      .catch(() => {});

    if (err instanceof AnalysisError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[interviews] next question failed:", err);
    return NextResponse.json(
      { error: "The interviewer stalled. Try sending your answer again." },
      { status: 502 }
    );
  }
}
