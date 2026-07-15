import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCurrentUser, startSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

/** Change password. Requires the current one — a stolen session must not be
 *  enough to lock the real owner out of their account. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const fresh = await db.user.findUnique({ where: { id: user.id } });
  if (!fresh) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, fresh.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "Your current password is wrong." },
      { status: 403 }
    );
  }

  // Bumping tokenVersion invalidates every session token minted before now.
  // Rotating the hash alone did not do this: the 30-day JWT in the attacker's
  // browser kept working, so the password change failed at the one job it is
  // most often performed to do.
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.newPassword, 12),
      tokenVersion: { increment: 1 },
    },
    select: { id: true, tokenVersion: true },
  });

  // ...including this one, so re-issue it. The person who just proved they know
  // the current password is the one user who should NOT be logged out.
  await startSession(updated.id, updated.tokenVersion);

  return NextResponse.json({ ok: true });
}
