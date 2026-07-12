import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";
import { SidebarNav } from "@/components/SidebarNav";
import { getCurrentUser } from "@/lib/auth";
import { FREE_MONTHLY_LIMIT } from "@/lib/plans";
import { monthlyReviewCount } from "@/lib/usage";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const used = user.plan === "FREE" ? await monthlyReviewCount(user.id) : 0;

  return (
    <div className="flex flex-1">
      {/* ---------- sidebar (desktop) ---------- */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-edge bg-surface/60 p-5 md:flex">
        <Logo href="/dashboard" />
        <div className="mt-8 flex-1">
          <SidebarNav />
        </div>

        {/* plan box */}
        <div className="card mb-4 p-4">
          {user.plan === "PRO" ? (
            <>
              <p className="flex items-center gap-1.5 text-sm font-bold text-accent">
                <Sparkles className="h-4 w-4" /> Pro plan
              </p>
              <p className="mt-1 text-xs text-muted">
                Unlimited reviews, deep analysis unlocked.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold">Free plan</span>
                <span className="text-muted">
                  {Math.min(used, FREE_MONTHLY_LIMIT)}/{FREE_MONTHLY_LIMIT}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-edge">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent2"
                  style={{
                    width: `${Math.min(100, (used / FREE_MONTHLY_LIMIT) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                {Math.max(0, FREE_MONTHLY_LIMIT - used)} reviews left this
                month
              </p>
              <Link
                href="/dashboard/billing?intent=pro"
                className="btn btn-primary mt-3 w-full px-3 py-1.5 text-xs"
              >
                Upgrade to Pro
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-edge pt-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* ---------- mobile top bar + content ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-edge bg-surface/60 px-4 py-3 md:hidden">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-2 overflow-x-auto">
            <SidebarNav vertical={false} />
            <LogoutButton />
          </div>
        </div>
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
