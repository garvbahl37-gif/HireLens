"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { CreditCard, Loader2, Lock, ShieldAlert } from "lucide-react";
import { PRICING } from "@/lib/plans";

const EASE = [0.16, 1, 0.3, 1] as const;

export function DemoCheckout({ interval }: { interval: "monthly" | "yearly" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = PRICING[interval];

  async function pay() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/demo/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setPending(false);
        return;
      }
      // The plan is already PRO in the DB — the event handler did it.
      router.push("/dashboard/billing?upgraded=1");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="mx-auto max-w-md"
    >
      {/* honesty banner — this is a simulation, say so plainly */}
      <div className="card mb-4 flex gap-3.5 p-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/70">
          <ShieldAlert className="h-4 w-4 text-warn" />
        </span>
        <div className="text-sm">
          <p className="font-semibold text-ink">Simulated checkout</p>
          <p className="mt-1 leading-relaxed text-muted">
            No Stripe account is connected to this deployment, so this page
            stands in for Stripe Checkout. Nothing is charged and no card
            details are collected or sent anywhere. Completing it emits a{" "}
            <code className="rounded-md border border-white/80 bg-white/70 px-1.5 py-0.5 text-xs text-ink">
              checkout.session.completed
            </code>{" "}
            event through the same webhook handler the live Stripe integration
            uses.
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {/* order summary — the forest strip, as on the plan cards */}
        <div className="card-forest m-2 p-5">
          <p className="text-sm text-white/70">Subscribing to</p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <p className="text-lg font-medium tracking-tight">HireLens Pro</p>
            <p className="text-3xl font-light tabular-nums">
              ${price.amount}
              <span className="text-sm font-normal text-white/70">
                /{price.per}
              </span>
            </p>
          </div>
          <p className="mt-2 text-sm text-white/75">
            Unlimited reviews, line-by-line rewrites, ATS checklist, and
            interview prep.
          </p>
        </div>

        {/* inert card form — decorative, nothing is read from it */}
        <div className="space-y-4 p-6 pt-4">
          <div>
            <p className="label">Card number</p>
            <div className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/60 px-3 py-2.5">
              <CreditCard className="h-4 w-4 text-faint" />
              <span className="text-sm tabular-nums tracking-wider text-muted">
                4242 4242 4242 4242
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="label">Expiry</p>
              <div className="rounded-xl border border-white/80 bg-white/60 px-3 py-2.5 text-sm tabular-nums text-muted">
                12 / 34
              </div>
            </div>
            <div>
              <p className="label">CVC</p>
              <div className="rounded-xl border border-white/80 bg-white/60 px-3 py-2.5 text-sm tabular-nums text-muted">
                123
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-bad/30 bg-white/60 px-3 py-2 text-sm text-bad">
              {error}
            </p>
          )}

          <button
            onClick={pay}
            disabled={pending}
            className="btn btn-primary w-full py-3.5 text-base disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Processing…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" /> Pay ${price.amount}
              </>
            )}
          </button>

          <Link
            href="/dashboard/billing?checkout=canceled"
            className="block text-center text-sm text-muted transition-colors hover:text-ink"
          >
            Cancel and go back
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
