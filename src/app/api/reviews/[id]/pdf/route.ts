import { NextRequest, NextResponse } from "next/server";
import { analysisSchema } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviewSummaryPdf } from "@/lib/pdf";

export const runtime = "nodejs";

/** Download the review as a clean, printable PDF. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const review = await db.review.findFirst({
    where: { id, userId: user.id },
    select: { result: true, jobTitle: true, company: true },
  });
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const parsed = analysisSchema.safeParse(review.result);
  if (!parsed.success) {
    return NextResponse.json({ error: "This review can't be exported." }, { status: 422 });
  }

  const pdf = await reviewSummaryPdf(parsed.data, {
    jobTitle: review.jobTitle,
    company: review.company,
  });

  const slug = review.jobTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);
  return new NextResponse(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="hirelens-review-${slug}.pdf"`,
    },
  });
}
