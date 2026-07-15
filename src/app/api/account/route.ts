import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { endSession, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isDemoBilling } from "@/lib/demo-billing";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().trim().min(1, "Name can't be empty").max(80),
});

/** Rename the account. */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid name" },
      { status: 400 }
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name },
  });

  return NextResponse.json({ ok: true, name: parsed.data.name });
}

const deleteSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

/**
 * Delete the account and everything in it. Reviews cascade (see the schema's
 * onDelete: Cascade), and the session cookie is cleared here — otherwise the
 * browser would keep a token whose user no longer exists.
 */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your password to confirm." },
      { status: 400 }
    );
  }

  // Deleting an account is irreversible — re-authenticate first.
  const fresh = await db.user.findUnique({ where: { id: user.id } });
  if (!fresh) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  const ok = await bcrypt.compare(parsed.data.password, fresh.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "That password is wrong." }, { status: 403 });
  }

  // Cancel the subscription BEFORE dropping the row.
  //
  // Deleting the user removed our only record of stripeSubscriptionId while
  // the subscription itself kept renewing at Stripe — so a user who deleted
  // their account went on being charged every month, and we no longer had the
  // id needed to stop it. Deleting your account is the loudest possible
  // "cancel", and it has to actually cancel.
  //
  // It runs first, and a failure aborts the delete: leaving a billable
  // subscription with no owner is strictly worse than a delete the user can
  // retry. Demo billing has no real subscription to cancel, so it's skipped.
  if (fresh.stripeSubscriptionId && !isDemoBilling()) {
    try {
      await getStripe().subscriptions.cancel(fresh.stripeSubscriptionId);
    } catch (err) {
      // Already-cancelled is a success for our purposes; anything else is not.
      const code = (err as { code?: string })?.code;
      if (code !== "resource_missing") {
        console.error("[account] could not cancel subscription before delete:", err);
        return NextResponse.json(
          {
            error:
              "We couldn't cancel your subscription, so we haven't deleted the account — you would have kept being billed. Try again, or cancel from Billing first.",
          },
          { status: 502 }
        );
      }
    }
  }

  await db.user.delete({ where: { id: user.id } });
  await endSession();

  return NextResponse.json({ ok: true });
}
