import { NextRequest, NextResponse } from "next/server";
import { coverLetterSchema } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { coverLetterPdf } from "@/lib/pdf";

export const runtime = "nodejs";

/** Download the generated cover letter as a clean, sendable PDF. */
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
    select: { coverLetter: true, jobTitle: true, company: true },
  });
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const parsed = coverLetterSchema.safeParse(review.coverLetter);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "No cover letter yet — generate one first." },
      { status: 404 }
    );
  }

  const pdf = await coverLetterPdf(parsed.data, {
    jobTitle: review.jobTitle,
    company: review.company,
    candidate: user.name,
  });

  const slug = review.jobTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);
  return new NextResponse(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cover-letter-${slug}.pdf"`,
    },
  });
}
