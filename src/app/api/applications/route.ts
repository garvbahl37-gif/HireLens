import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createApplicationSchema } from "@/lib/applications";
import { enforce } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** Add a job to the tracker. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = await enforce(req, "analysis", user.id);
  if (limited) return limited;

  const parsed = createApplicationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const b = parsed.data;
  const status = b.status ?? "WISHLIST";

  // If linking a review, confirm it's the user's — a forged id must not attach
  // someone else's review to a card.
  if (b.reviewId) {
    const owned = await db.review.findFirst({
      where: { id: b.reviewId, userId: user.id },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
  }

  // New card goes to the top of its column.
  const min = await db.application.aggregate({
    where: { userId: user.id, status },
    _min: { sortOrder: true },
  });
  const sortOrder = (min._min.sortOrder ?? 0) - 1;

  const app = await db.application.create({
    data: {
      userId: user.id,
      company: b.company,
      role: b.role,
      status,
      jobDescription: b.jobDescription || null,
      sourceUrl: b.sourceUrl || null,
      notes: b.notes || null,
      reviewId: b.reviewId || null,
      interviewId: b.interviewId || null,
      sortOrder,
      appliedAt: status === "WISHLIST" ? null : new Date(),
    },
    select: { id: true },
  });

  return NextResponse.json({ id: app.id }, { status: 201 });
}
