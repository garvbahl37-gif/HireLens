import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DemoCheckout } from "@/components/DemoCheckout";
import { requireUser } from "@/lib/auth";
import { isDemoBilling } from "@/lib/demo-billing";

export const metadata: Metadata = { title: "Checkout (demo)" };

export default async function DemoCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ interval?: string }>;
}) {
  const user = await requireUser();

  // If a real Stripe account is configured, this page must not exist.
  if (!isDemoBilling()) redirect("/dashboard/billing");
  if (user.plan === "PRO") redirect("/dashboard/billing");

  const params = await searchParams;
  const interval = params.interval === "yearly" ? "yearly" : "monthly";

  return (
    <div className="py-4">
      <DemoCheckout interval={interval} />
    </div>
  );
}
