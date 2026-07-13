"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Infinity as InfinityIcon, Sparkles, Zap } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

export function PlanPanel({
  plan,
  used,
  limit,
}: {
  plan: "FREE" | "PRO";
  used: number;
  limit: number;
}) {
  if (plan === "PRO") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
        className="relative mb-4 overflow-hidden rounded-2xl border border-accent/30 bg-card p-4"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full opacity-30 blur-2xl"
          style={{
            background:
              "radial-gradient(closest-side, var(--color-accent), transparent)",
          }}
        />
        <p className="relative flex items-center gap-1.5 text-sm font-bold text-accent">
          <Sparkles className="h-4 w-4" /> Pro plan
        </p>
        <p className="relative mt-1.5 flex items-center gap-1.5 text-xs text-muted">
          <InfinityIcon className="h-3.5 w-3.5" /> Unlimited reviews · deep
          analysis on
        </p>
      </motion.div>
    );
  }

  const remaining = Math.max(0, limit - used);
  const pct = Math.min(100, (used / limit) * 100);
  const exhausted = remaining === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
      className="relative mb-4 overflow-hidden rounded-2xl border border-edge bg-card p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Free plan</p>
        <p className="font-mono text-xs text-muted">
          {Math.min(used, limit)}
          <span className="text-faint">/{limit}</span>
        </p>
      </div>

      {/* usage meter */}
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-edge">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: exhausted
              ? "var(--color-bad)"
              : "linear-gradient(to right, var(--color-accent), var(--color-accent2))",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
        />
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-muted">
        {exhausted ? (
          <span className="text-bad">
            You&apos;ve used all {limit} reviews this month.
          </span>
        ) : (
          <>
            <span className="font-semibold text-ink">{remaining}</span> review
            {remaining === 1 ? "" : "s"} left this month
          </>
        )}
      </p>

      <Link
        href="/dashboard/billing?intent=pro"
        className="btn btn-primary btn-sheen mt-3 w-full px-3 py-2 text-xs"
      >
        <Zap className="h-3.5 w-3.5" /> Upgrade to Pro
      </Link>
    </motion.div>
  );
}
