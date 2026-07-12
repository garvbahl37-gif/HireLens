import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

/** Stripe Billing Portal — invoices, payment method, cancellation. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user.stripeCustomerId) {
    return NextResponse.json({ error: "No billing profile yet" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/dashboard/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe] portal failed:", err);
    return NextResponse.json(
      {
        error:
          "The billing portal isn't configured for this Stripe account yet (Dashboard → Settings → Billing → Customer portal).",
      },
      { status: 502 }
    );
  }
}
