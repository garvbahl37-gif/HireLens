import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { startSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforce } from "@/lib/ratelimit";
import { consumeResetToken } from "@/lib/reset-token";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

/** Finish a password reset: spend the token, set the password, log them in. */
export async function POST(req: NextRequest) {
  // Same bucket as login: a reset token is 32 random bytes and cannot be
  // guessed, but there is no reason to let anyone try at speed.
  const limited = await enforce(req, "login");
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const consumed = await consumeResetToken(parsed.data.token);
  if (!consumed) {
    return NextResponse.json(
      { error: "That reset link is invalid, expired, or already used. Request a new one." },
      { status: 400 }
    );
  }

  // Bumping tokenVersion is the point of the whole exercise: someone resetting
  // their password may well be doing it BECAUSE a session was stolen. Every
  // token minted before this instant stops working.
  const user = await db.user.update({
    where: { id: consumed.userId },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      tokenVersion: { increment: 1 },
    },
    select: { id: true, tokenVersion: true },
  });

  await startSession(user.id, user.tokenVersion);

  return NextResponse.json({ ok: true });
}
