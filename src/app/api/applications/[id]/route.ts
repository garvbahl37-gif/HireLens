import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateApplicationSchema } from "@/lib/applications";

export const runtime = "nodejs";

/** Move a card between columns, reorder it, or edit its fields. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = updateApplicationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  // Ownership enforced in the where clause: updateMany touches nothing for
  // another user's id, so a forged id is a silent no-op rather than a leak.
  const existing = await db.application.findFirst({
    where: { id, userId: user.id },
    select: { status: true, appliedAt: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const b = parsed.data;
  const data: Record<string, unknown> = {};
  if (b.company !== undefined) data.company = b.company;
  if (b.role !== undefined) data.role = b.role;
  if (b.status !== undefined) data.status = b.status;
  if (b.sortOrder !== undefined) data.sortOrder = b.sortOrder;
  if (b.sourceUrl !== undefined) data.sourceUrl = b.sourceUrl || null;
  if (b.notes !== undefined) data.notes = b.notes || null;
  if (b.reviewId !== undefined) data.reviewId = b.reviewId;
  if (b.interviewId !== undefined) data.interviewId = b.interviewId;

  // Stamp the applied date the first time a card leaves Wishlist, so the board
  // can show "applied 3 days ago" without the user setting it by hand.
  if (
    b.status &&
    b.status !== "WISHLIST" &&
    existing.status === "WISHLIST" &&
    !existing.appliedAt
  ) {
    data.appliedAt = new Date();
  }

  await db.application.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

/** Remove a card. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const del = await db.application.deleteMany({ where: { id, userId: user.id } });
  if (del.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
