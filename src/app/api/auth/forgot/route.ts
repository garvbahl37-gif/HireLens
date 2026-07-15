import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resetEmail, sendEmail } from "@/lib/email";
import { enforce } from "@/lib/ratelimit";
import { issueResetToken } from "@/lib/reset-token";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

function appUrl(req: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    req.nextUrl.origin
  ).replace(/\/$/, "");
}

/**
 * Start a password reset.
 *
 * ALWAYS returns the same 200 and the same body, whether or not the address has
 * an account. Anything else — a 404, a different message, a materially different
 * response time — turns this endpoint into a free account-enumeration oracle,
 * which is precisely the thing that makes a leaked email list valuable.
 *
 * The rate limit is not optional here either: an unbounded endpoint that sends
 * mail to an address of the caller's choosing is a spam cannon pointed at a
 * stranger, with our sending domain on it.
 */
export async function POST(req: NextRequest) {
  const limited = await enforce(req, "forgot");
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));

  // Even a malformed address gets the generic success. A 400 on "no account"
  // vs a 200 on "sent" is the oracle, restated.
  const ok = NextResponse.json({
    ok: true,
    message:
      "If that email has an account, a reset link is on its way. Check your inbox.",
  });

  if (!parsed.success) return ok;

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, name: true, email: true },
  });
  if (!user) return ok;

  try {
    const token = await issueResetToken(user.id);
    const url = `${appUrl(req)}/reset?token=${encodeURIComponent(token)}`;
    await sendEmail({ to: user.email, ...resetEmail({ name: user.name, url }) });
  } catch (err) {
    // Swallowed deliberately. A send failure must not become a signal that the
    // account exists; it is logged for us and invisible to the caller.
    console.error("[forgot] could not send reset email:", err);
  }

  return ok;
}
