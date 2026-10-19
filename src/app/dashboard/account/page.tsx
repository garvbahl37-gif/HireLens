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
  PrimaryResumeForm,
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
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      {/* ---------- identity: the reference's profile column ---------- */}
      <aside className="card fade-up flex flex-col p-6 lg:sticky lg:top-4">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-canopy2 to-canopy text-xl font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_0_0_4px_rgba(255,255,255,0.7)]"
          >
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-medium tracking-tight">{user.name}</h2>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{user.email}</span>
            </p>
          </div>
        </div>

        <p className="mt-6 text-sm text-muted">Plan</p>
        <div className="mt-2">
          {isPro ? (
            <span className="chip gap-1.5 border-accent/30 px-3 py-1 text-sm text-accent">
              <Sparkles className="h-3.5 w-3.5" /> Pro plan
            </span>
          ) : (
            <span className="chip px-3 py-1 text-sm">Free plan</span>
          )}
        </div>

        <p className="mt-5 text-sm text-muted">Member since</p>
        <p className="mt-1 flex items-center gap-1.5 font-semibold">
          <CalendarDays className="h-4 w-4 text-muted" /> {joined}
        </p>

        {/* ---------- lifetime stats ---------- */}
        <div className="mt-6 grid grid-cols-3 divide-x divide-ink/10 border-t border-ink/10 pt-5">
          {[
            { icon: FileText, label: "Reviews", value: count },
            { icon: TrendingUp, label: "Average", value: avg ?? "—" },
            { icon: Trophy, label: "Best", value: best ?? "—" },
          ].map((s) => (
            <div key={s.label} className="px-3 first:pl-0 last:pr-0">
              <p className="flex items-center gap-1 text-sm text-muted">
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </p>
              <p className="mt-1 text-3xl font-light tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
      </aside>

      <Stagger className="flex min-w-0 flex-col gap-4">
        {/* ---------- plan + usage ---------- */}
        {isPro ? (
          <div className="card-forest p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm text-white/70">
                  <span className="h-2 w-2 rounded-full bg-neon shadow-[0_0_8px_rgba(69,230,36,0.8)]" />
                  Plan &amp; usage
                </p>
                <h2 className="mt-1 text-xl font-medium tracking-tight">Pro</h2>
                <p className="mt-1 text-sm text-white/75">
                  Unlimited reviews, with the full deep analysis on every one.
                </p>
              </div>
              <Link
                href="/dashboard/billing"
                className="btn bg-white text-ink shadow-[0_8px_20px_-10px_rgba(0,0,0,0.35)] hover:bg-white/90"
              >
                Manage billing <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <span className="text-white/70">Reviews this month</span>
                <span className="tabular-nums text-white/85">{used} · unlimited</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-neon shadow-[0_0_10px_rgba(69,230,36,0.6)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted">Plan &amp; usage</p>
                <h2 className="mt-1 text-xl font-medium tracking-tight">Starter (Free)</h2>
                <p className="mt-1 text-sm text-muted">
                  {remaining} of {FREE_MONTHLY_LIMIT} reviews left this month.
                </p>
              </div>
              <Link href="/dashboard/billing" className="btn btn-primary">
                Manage billing <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <span className="text-muted">Monthly quota</span>
                <span className="tabular-nums text-muted">
                  {Math.min(used, FREE_MONTHLY_LIMIT)}/{FREE_MONTHLY_LIMIT}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background:
                      remaining === 0
                        ? "var(--color-bad)"
                        : "linear-gradient(to right, var(--color-accent), var(--color-accent2))",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ---------- profile settings ---------- */}
        <section className="card space-y-7 p-6 sm:p-7">
          <h2 className="text-lg font-medium tracking-tight">Profile</h2>
          <NameForm initialName={user.name} />
          <div className="h-px bg-ink/10" />
          <PrimaryResumeForm
            initialName={user.primaryResumeName}
            hasResume={!!user.primaryResumeText}
          />
          <div className="h-px bg-ink/10" />
          <PasswordForm />
        </section>

        {/* ---------- danger zone ---------- */}
        <DeleteAccount reviewCount={count} />
      </Stagger>
    </div>
  );
}
