"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { FREE_FEATURES, PRO_FEATURES, PRICING } from "@/lib/plans";

export function PricingCards({
  authed,
  plan,
  demo = false,
}: {
  authed: boolean;
  plan: "FREE" | "PRO" | null;
  demo?: boolean;
}) {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const price = PRICING[interval];

  const proHref = !authed
    ? `/signup?intent=pro&interval=${interval}`
    : plan === "PRO"
      ? "/dashboard/billing"
      : `/dashboard/billing?intent=pro&interval=${interval}`;

  const freeHref = authed ? "/dashboard" : "/signup";

  return (
    <div className="mx-auto max-w-4xl">
      {/* interval toggle */}
      <div className="flex justify-center mb-10">
        <div className="glass inline-flex rounded-full p-1">
          {(["monthly", "yearly"] as const).map((i) => (
            <button
              key={i}
              onClick={() => setInterval(i)}
              className={cn(
                "rounded-full px-5 py-2.5 text-sm font-semibold transition-all sm:py-1.5",
                interval === i
                  ? "btn-neon px-5 py-2.5 sm:py-1.5"
                  : "text-muted hover:text-ink"
              )}
            >
              {i === "monthly" ? "Monthly" : "Yearly"}
              {i === "yearly" && (
                <span
                  className={cn(
                    "ml-1.5 text-xs",
                    interval === "yearly" ? "text-[#0b2a0e]/70" : "text-good"
                  )}
                >
                  −17%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Free */}
        <div className="glass flex flex-col rounded-[1.8rem] p-6 sm:p-8">
          <h3 className="font-display text-xl font-medium">Starter</h3>
          <p className="mt-1 text-sm text-muted">
            Kick the tires on a real review.
          </p>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="text-5xl font-light tracking-tight">$0</span>
            <span className="text-muted text-sm">forever</span>
          </div>
          <ul className="mt-6 space-y-3 text-sm flex-1">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5 text-muted" />
                <span className="text-muted">{f}</span>
              </li>
            ))}
          </ul>
          <Link href={freeHref} className="btn-stone mt-8 w-full">
            {authed ? "Go to dashboard" : "Start free"}
          </Link>
        </div>

        {/* Pro — the one forest card on the page */}
        <div className="card-forest relative flex flex-col rounded-[1.8rem] p-6 sm:p-8">
          <span className="absolute right-6 top-6 rounded-full border border-neon/40 bg-neon/15 px-3 py-1 text-xs font-semibold text-[#b9f7a6]">
            Most popular
          </span>
          <h3 className="font-display text-xl font-medium">Pro</h3>
          <p className="mt-1 text-sm text-white/70">
            Every application, fully optimized.
          </p>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="text-5xl font-light tracking-tight">${price.amount}</span>
            <span className="text-sm text-white/70">/{price.per}</span>
            {price.savings && (
              <span className="ml-2 rounded-full border border-neon/40 px-2.5 py-0.5 text-xs text-[#b9f7a6]">
                {price.savings}
              </span>
            )}
          </div>
          <ul className="mt-6 space-y-3 text-sm flex-1">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="h-4 w-4 shrink-0 mt-0.5 text-neon" />
                <span className="text-white/90">{f}</span>
              </li>
            ))}
          </ul>
          <Link href={proHref} className="btn-neon mt-8 w-full">
            {plan === "PRO" ? "Manage subscription" : "Upgrade to Pro"}
          </Link>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        {demo ? (
          <>
            Demo deployment — checkout is simulated and nothing is ever charged.
            The upgrade still runs through the real webhook handler.
          </>
        ) : (
          <>
            Payments run through Stripe in test mode — try card{" "}
            <code className="font-mono">4242 4242 4242 4242</code>, any future
            date, any CVC.
          </>
        )}
      </p>
    </div>
  );
}
