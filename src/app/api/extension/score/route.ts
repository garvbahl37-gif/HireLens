import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AnalysisError, quickFit } from "@/lib/ai";
import { getCurrentUser, getUserFromBearer } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforce } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * One-click "how well does my resume fit this job" for the Chrome extension.
 *
 * Auth: the extension presents the session token as a bearer header (a
 * cross-origin cookie wouldn't be sent); a same-origin caller can still use the
 * cookie. Scoring runs against the user's PRIMARY resume, falling back to their
 * most recent review's resume so it works the moment they've done one review.
 * Nothing is persisted and it does not count against the monthly review quota —
 * it's a teaser that drives them into the full product.
 */

const bodySchema = z.object({
  jobDescription: z.string().trim().min(40, "Couldn't read the job description from this page."),
  jobTitle: z.string().trim().max(200).optional(),
  company: z.string().trim().max(200).optional(),
});

/** Echo a chrome-extension (or localhost, for dev) origin so credentials work. */
function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed =
    origin.startsWith("chrome-extension://") ||
    origin.startsWith("moz-extension://") ||
    /^https?:\/\/localhost(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req);
  const json = (body: unknown, status = 200) =>
    NextResponse.json(body, { status, headers: cors });

  const user = (await getUserFromBearer(req)) ?? (await getCurrentUser());
  if (!user) {
    return json({ error: "Not signed in", code: "AUTH" }, 401);
  }

  const limited = await enforce(req, "analysis", user.id);
  if (limited) {
    // Re-wrap with CORS headers so the extension can read the 429.
    return json({ error: "Too many checks — give it a minute.", code: "RATE_LIMITED" }, 429);
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, 400);
  }

  // Resolve the resume to score against: the explicit primary, else the most
  // recent review's resume.
  let resumeText = user.primaryResumeText?.trim() || "";
  if (!resumeText) {
    const latest = await db.review.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { resumeText: true },
    });
    resumeText = latest?.resumeText?.trim() || "";
  }
  if (resumeText.length < 100) {
    return json(
      {
        error: "No resume on file yet. Set your primary resume in HireLens first.",
        code: "NO_RESUME",
      },
      409
    );
  }

  try {
    const { result } = await quickFit({
      resumeText,
      jobDescription: parsed.data.jobDescription,
      jobTitle: parsed.data.jobTitle,
      company: parsed.data.company,
    });
    return json({ fit: result });
  } catch (err) {
    if (err instanceof AnalysisError) {
      return json({ error: err.message }, 502);
    }
    console.error("[extension/score] failed:", err);
    return json({ error: "Couldn't score this job right now. Try again." }, 502);
  }
}
