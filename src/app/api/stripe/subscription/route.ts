import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

const bodySchema = z.object({
  action: z.enum(["cancel", "resume"]),
});

/**
 * Cancel at period end (keeps access until the paid period runs out)
 * or resume a pending cancellation. The webhook confirms the change,
 * but we mirror it immediately so the UI reflects it without waiting.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "No active subscription" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const cancelAtPeriodEnd = parsed.data.action === "cancel";

  try {
    await getStripe().subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });
  } catch (err) {
    console.error("[stripe] subscription update failed:", err);
    return NextResponse.json(
      { error: "Couldn't update the subscription. Try again." },
      { status: 502 }
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: { cancelAtPeriodEnd },
  });

  return NextResponse.json({ ok: true, cancelAtPeriodEnd });
}
