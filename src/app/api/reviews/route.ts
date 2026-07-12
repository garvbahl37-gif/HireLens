import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AnalysisError, aiModel, analyzeResume } from "@/lib/ai";
import { FREE_MONTHLY_LIMIT } from "@/lib/plans";
import { monthlyReviewCount } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 120; // Grok analysis of a long resume can take a while

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MIN_RESUME_CHARS = 200;
const MIN_JD_CHARS = 80;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  /* ---- plan gate (server-side, the only place that counts) ---- */
  if (user.plan === "FREE") {
    const used = await monthlyReviewCount(user.id);
    if (used >= FREE_MONTHLY_LIMIT) {
      return NextResponse.json(
        {
          error: `You've used all ${FREE_MONTHLY_LIMIT} free reviews this month. Upgrade to Pro for unlimited reviews.`,
          code: "LIMIT_REACHED",
        },
        { status: 402 }
      );
    }
  }

  /* ---- input ---- */
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const jobTitle = String(form.get("jobTitle") ?? "").trim();
  const company = String(form.get("company") ?? "").trim() || null;
  const jobDescription = String(form.get("jobDescription") ?? "").trim();
  const pastedResume = String(form.get("resumeText") ?? "").trim();
  const file = form.get("file");

  if (!jobTitle) {
    return NextResponse.json({ error: "Job title is required" }, { status: 400 });
  }
  if (jobDescription.length < MIN_JD_CHARS) {
    return NextResponse.json(
      { error: `Paste the full job description (at least ${MIN_JD_CHARS} characters).` },
      { status: 400 }
    );
  }

  let resumeText = pastedResume;
  let resumeFilename: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Resume file is too large (max 8 MB)." },
        { status: 400 }
      );
    }
    resumeFilename = file.name;
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      try {
        const buffer = await file.arrayBuffer();
        const { text } = await extractText(new Uint8Array(buffer), {
          mergePages: true,
        });
        resumeText = text.trim();
      } catch {
        return NextResponse.json(
          { error: "Couldn't read that PDF. Try re-exporting it or paste the text instead." },
          { status: 400 }
        );
      }
    } else if (
      file.type.startsWith("text/") ||
      file.name.toLowerCase().endsWith(".txt")
    ) {
      resumeText = (await file.text()).trim();
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF or paste the text." },
        { status: 400 }
      );
    }
  }

  if (resumeText.length < MIN_RESUME_CHARS) {
    return NextResponse.json(
      {
        error: `That resume looks too short to analyze (${resumeText.length} characters extracted). If it's a scanned/image PDF, paste the text instead.`,
      },
      { status: 400 }
    );
  }

  /* ---- analyze ---- */
  const deep = user.plan === "PRO";
  let analysis;
  try {
    analysis = await analyzeResume({
      resumeText,
      jobDescription,
      jobTitle,
      company,
      deep,
    });
  } catch (err) {
    if (err instanceof AnalysisError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[reviews] analysis failed:", err);
    return NextResponse.json(
      { error: "The analysis service is unavailable right now. Please try again in a minute." },
      { status: 502 }
    );
  }

  /* ---- persist ---- */
  const review = await db.review.create({
    data: {
      userId: user.id,
      jobTitle,
      company,
      resumeFilename,
      resumeText,
      jobDescription,
      overallScore: analysis.result.overallScore,
      verdict: analysis.result.verdict,
      result: JSON.parse(JSON.stringify(analysis.result)),
      deep,
      model: analysis.model === "mock" ? "mock" : aiModel(),
    },
  });

  return NextResponse.json({ id: review.id });
}
