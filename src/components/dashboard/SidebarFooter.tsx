"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Infinity as InfinityIcon, Sparkles, Zap } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { useCollapsed } from "@/components/dashboard/SidebarShell";

const EASE = [0.16, 1, 0.3, 1] as const;

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function SidebarFooter({
  name,
  email,
  plan,
  used,
  limit,
}: {
  name: string;
  email: string;
  plan: "FREE" | "PRO";
  used: number;
  limit: number;
}) {
  const collapsed = useCollapsed();

  const remaining = Math.max(0, limit - used);
  const pct = Math.min(100, (used / limit) * 100);
  const exhausted = remaining === 0;

  /* ---------- collapsed: just the essentials, as icons ---------- */
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-3">
        {plan === "FREE" ? (
          <Link
            href="/dashboard/billing?intent=pro"
            title={`${remaining} of ${limit} reviews left — upgrade to Pro`}
            className="group relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent2 text-[#180f0a] shadow-[0_0_20px_-6px_var(--color-accent)]"
          >
            <Zap className="h-4 w-4" />
            <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-lg border border-edge2 bg-bg px-2.5 py-1.5 text-xs font-semibold text-ink shadow-xl group-hover:block">
              {remaining} of {limit} left · Upgrade
            </span>
          </Link>
        ) : (
          <span
            title="Pro plan"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 text-accent"
          >
            <Sparkles className="h-4 w-4" />
          </span>
        )}

        <span
          title={`${name} · ${email}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2 text-xs font-bold text-[#180f0a]"
        >
          {initials(name)}
        </span>

        <LogoutButton compact />
      </div>
    );
  }

  /* ---------- expanded ---------- */
  return (
    <AnimatePresence initial={false}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        {plan === "PRO" ? (
          <div className="relative mb-3 overflow-hidden rounded-2xl border border-accent/30 bg-card p-4">
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
              <InfinityIcon className="h-3.5 w-3.5" /> Unlimited reviews
            </p>
          </div>
        ) : (
          <div className="relative mb-3 overflow-hidden rounded-2xl border border-edge bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Free plan</p>
              <p className="font-mono text-xs text-muted">
                {Math.min(used, limit)}
                <span className="text-faint">/{limit}</span>
              </p>
            </div>
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
                transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
              />
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-muted">
              {exhausted ? (
                <span className="text-bad">
                  All {limit} reviews used this month.
                </span>
              ) : (
                <>
                  <span className="font-semibold text-ink">{remaining}</span>{" "}
                  review{remaining === 1 ? "" : "s"} left this month
                </>
              )}
            </p>
            <Link
              href="/dashboard/billing?intent=pro"
              className="btn btn-primary btn-sheen mt-3 w-full px-3 py-2 text-xs"
            >
              <Zap className="h-3.5 w-3.5" /> Upgrade to Pro
            </Link>
          </div>
        )}

        {/* LogoutButton is a sibling of the link, not inside it — a <button>
            nested in an <a> is invalid, and the click would also navigate. */}
        <div className="group flex items-center gap-3 rounded-2xl border border-edge bg-card/60 p-3 transition-colors hover:border-edge2">
          <Link
            href="/dashboard/account"
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2 text-xs font-bold text-[#180f0a]">
              {initials(name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-faint">{email}</p>
            </div>
          </Link>
          <LogoutButton compact />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
