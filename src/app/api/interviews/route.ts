import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AnalysisError, analysisSchema } from "@/lib/ai";
import type { Claim } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  type InterviewContext,
  type Turn,
  nextQuestion,
} from "@/lib/interview";
import {
  FREE_INTERVIEWS_PER_MONTH,
  INTERVIEW_QUESTIONS_FREE,
  INTERVIEW_QUESTIONS_PRO,
  currentMonthStart,
} from "@/lib/plans";
import { monthlyInterviewCount } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z
  .object({
    /** Launch from an existing review — the resume and JD come from it. */
    reviewId: z.string().optional(),
    /** …or supply them directly. */
    jobTitle: z.string().trim().min(1).max(120).optional(),
    company: z.string().trim().max(120).optional(),
    resumeText: z.string().trim().min(80).optional(),
    jobDescription: z.string().trim().min(40).optional(),
  })
  .refine(
    (b) =>
      !!b.reviewId ||
      (!!b.jobTitle && !!b.resumeText && !!b.jobDescription),
    { message: "Provide a reviewId, or a job title, resume and job description." }
  );

/** Start a mock interview and return its opening question. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const isPro = user.plan === "PRO";

  // Fast pre-check: reject an obviously-over-limit user before doing any AI
  // work. This is an optimisation, NOT the gate — the real gate is the
  // serializable count-and-create below, because this plain count is a
  // check-then-act that concurrent starts could all pass at once.
  if (!isPro) {
    const used = await monthlyInterviewCount(user.id);
    if (used >= FREE_INTERVIEWS_PER_MONTH) {
      return NextResponse.json(
        {
          error: `You've used your ${FREE_INTERVIEWS_PER_MONTH} free mock interview this month. Upgrade to Pro for unlimited.`,
          code: "LIMIT_REACHED",
        },
        { status: 402 }
      );
    }
  }

  /* ---- resolve the context ---- */
  let jobTitle: string;
  let company: string | null;
  let resumeText: string;
  let jobDescription: string;
  // The claims to attack, drawn from the launching review's analysis. Snapshotted
  // onto the interview row so a later edit to the review can't mutate a run in
  // flight. Empty for manual (pasted-text) interviews — nothing was analysed.
  let claims: Claim[] = [];
  const b = parsed.data;

  if (b.reviewId) {
    // Ownership enforced in the query: another user's review id 404s.
    const review = await db.review.findFirst({
      where: { id: b.reviewId, userId: user.id },
      select: {
        jobTitle: true,
        company: true,
        resumeText: true,
        jobDescription: true,
        result: true,
      },
    });
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    jobTitle = review.jobTitle;
    company = review.company;
    resumeText = review.resumeText;
    jobDescription = review.jobDescription;
    // The result JSON is trusted (we wrote it) but old rows predate claims, so
    // parse defensively and just carry an empty list when they're absent.
    const analysis = analysisSchema.safeParse(review.result);
    if (analysis.success && analysis.data.claims) {
      claims = analysis.data.claims;
    }
  } else {
    jobTitle = b.jobTitle!;
    company = b.company?.trim() ? b.company : null;
    resumeText = b.resumeText!;
    jobDescription = b.jobDescription!;
  }

  const totalQuestions = isPro
    ? INTERVIEW_QUESTIONS_PRO
    : INTERVIEW_QUESTIONS_FREE;

  const ctx: InterviewContext = {
    jobTitle,
    company,
    resumeText,
    jobDescription,
    totalQuestions,
    deep: isPro,
    claims,
  };

  try {
    const { result, model } = await nextQuestion(ctx, []);

    const opening: Turn = {
      role: "interviewer",
      kind: result.kind,
      content: result.question,
      isFollowUp: false,
      intent: result.intent,
      at: new Date().toISOString(),
    };

    // Atomic reservation: count and create in one serializable transaction so
    // concurrent starts can't all slip past the free limit. Returns null when
    // the transaction sees the user is already at the cap.
    const created = await db.$transaction(
      async (tx) => {
        if (!isPro) {
          const used = await tx.interview.count({
            where: { userId: user.id, createdAt: { gte: currentMonthStart() } },
          });
          if (used >= FREE_INTERVIEWS_PER_MONTH) return null;
        }
        return tx.interview.create({
          data: {
            userId: user.id,
            reviewId: b.reviewId ?? null,
            jobTitle,
            company,
            resumeText,
            jobDescription,
            claims: claims.length > 0 ? claims : undefined,
            transcript: [opening],
            totalQuestions,
            deep: isPro,
            model,
          },
          select: { id: true },
        });
      },
      { isolationLevel: "Serializable" }
    );

    if (!created) {
      return NextResponse.json(
        {
          error: `You've used your ${FREE_INTERVIEWS_PER_MONTH} free mock interview this month. Upgrade to Pro for unlimited.`,
          code: "LIMIT_REACHED",
        },
        { status: 402 }
      );
    }

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof AnalysisError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    // A serializable write-conflict (Prisma P2034) means a concurrent start
    // won the race for the last free slot. That's the limit doing its job, not
    // an error — report it as such rather than a 502.
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2034"
    ) {
      return NextResponse.json(
        {
          error: `You've used your ${FREE_INTERVIEWS_PER_MONTH} free mock interview this month. Upgrade to Pro for unlimited.`,
          code: "LIMIT_REACHED",
        },
        { status: 402 }
      );
    }
    console.error("[interviews] start failed:", err);
    return NextResponse.json(
      { error: "Couldn't start the interview. Please try again." },
      { status: 502 }
    );
  }
}
