import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isDemoBilling } from "@/lib/demo-billing";
import { getStripe, proPriceId } from "@/lib/stripe";

const bodySchema = z.object({
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.plan === "PRO") {
    return NextResponse.json(
      { error: "You're already on Pro." },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  // No Stripe account configured → hand off to the simulated checkout,
  // which pushes a checkout.session.completed event through the same
  // handler the live webhook uses. See src/lib/demo-billing.ts.
  if (isDemoBilling()) {
    return NextResponse.json({
      url: `/dashboard/billing/demo-checkout?interval=${parsed.data.interval}`,
      demo: true,
    });
  }

  try {
    const stripe = getStripe();

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await db.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: proPriceId(parsed.data.interval), quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?upgraded=1`,
      cancel_url: `${appUrl}/dashboard/billing?checkout=canceled`,
      metadata: { userId: user.id },
      subscription_data: { metadata: { userId: user.id } },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe] checkout failed:", err);
    return NextResponse.json(
      { error: "Couldn't start checkout. Is Stripe configured?" },
      { status: 502 }
    );
  }
}
