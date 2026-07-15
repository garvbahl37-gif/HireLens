import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  Mail,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  DeleteAccount,
  NameForm,
  PasswordForm,
} from "@/components/dashboard/AccountForms";
import { Stagger } from "@/components/dashboard/Stagger";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { FREE_MONTHLY_LIMIT } from "@/lib/plans";
import { monthlyReviewCount } from "@/lib/usage";

export const metadata: Metadata = { title: "Account" };

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AccountPage() {
  const user = await requireUser();

  const [used, reviews] = await Promise.all([
    monthlyReviewCount(user.id),
    db.review.findMany({
      where: { userId: user.id },
      select: { overallScore: true },
    }),
  ]);

  const count = reviews.length;
  const avg =
    count > 0
      ? Math.round(reviews.reduce((s, r) => s + r.overallScore, 0) / count)
      : null;
  const best = count > 0 ? Math.max(...reviews.map((r) => r.overallScore)) : null;

  const isPro = user.plan === "PRO";
  const remaining = Math.max(0, FREE_MONTHLY_LIMIT - used);
  const pct = isPro ? 100 : Math.min(100, (used / FREE_MONTHLY_LIMIT) * 100);

  const joined = user.createdAt.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Stagger className="space-y-6">
      {/* ---------- identity header ---------- */}
      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* avatar with a conic ring */}
          <div className="relative shrink-0">
            <div
              aria-hidden
              className="absolute -inset-1 rounded-full opacity-70 blur-md"
              style={{
                background:
                  "conic-gradient(from 180deg, var(--color-accent), var(--color-accent2), var(--color-accent))",
              }}
            />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2 text-2xl font-extrabold text-[#180f0a]">
              {initials(user.name)}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {user.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {user.email}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Joined {joined}
              </span>
            </div>
            <div className="mt-3">
              {isPro ? (
                <span className="chip gap-1.5 border-accent/40 text-accent">
                  <Sparkles className="h-3.5 w-3.5" /> Pro plan
                </span>
              ) : (
                <span className="chip">Free plan</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- lifetime stats ---------- */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: FileText, label: "reviews run", value: count },
          { icon: TrendingUp, label: "average score", value: avg ?? "—" },
          { icon: Trophy, label: "best score", value: best ?? "—" },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <s.icon className="h-4 w-4 text-accent" />
            <p className="mt-3 text-2xl font-extrabold tabular-nums">
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ---------- plan + usage ---------- */}
      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-bold">Plan &amp; usage</h2>
            <p className="mt-1 text-sm text-muted">
              {isPro
                ? "Unlimited reviews, with the full deep analysis on every one."
                : `${remaining} of ${FREE_MONTHLY_LIMIT} reviews left this month.`}
            </p>
          </div>
          <Link href="/dashboard/billing" className="btn btn-ghost">
            Manage billing <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between text-xs">
            <span className="font-semibold text-muted">
              {isPro ? "Reviews this month" : "Monthly quota"}
            </span>
            <span className="font-mono text-faint">
              {isPro ? `${used} · unlimited` : `${Math.min(used, FREE_MONTHLY_LIMIT)}/${FREE_MONTHLY_LIMIT}`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-edge">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background:
                  !isPro && remaining === 0
                    ? "var(--color-bad)"
                    : "linear-gradient(to right, var(--color-accent), var(--color-accent2))",
              }}
            />
          </div>
        </div>
      </div>

      {/* ---------- profile settings ---------- */}
      <div className="card space-y-7 p-6 sm:p-8">
        <h2 className="font-bold">Profile</h2>
        <NameForm initialName={user.name} />
        <div className="h-px bg-edge" />
        <PasswordForm />
      </div>

      {/* ---------- danger zone ---------- */}
      <DeleteAccount reviewCount={count} />
    </Stagger>
  );
}
