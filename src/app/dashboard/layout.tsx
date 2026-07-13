import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";
import { SidebarNav } from "@/components/SidebarNav";
import { PlanPanel } from "@/components/dashboard/PlanPanel";
import { requireUser } from "@/lib/auth";
import { FREE_MONTHLY_LIMIT } from "@/lib/plans";
import { monthlyReviewCount } from "@/lib/usage";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const used = user.plan === "FREE" ? await monthlyReviewCount(user.id) : 0;

  return (
    <div className="flex flex-1">
      {/* ---------- sidebar (desktop): a floating, rounded glass panel ---------- */}
      <div className="sticky top-0 hidden h-screen shrink-0 p-3 md:block">
        <aside className="relative flex h-full w-[268px] flex-col overflow-hidden rounded-[28px] border border-edge2/70 bg-surface/60 p-5 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
          {/* ambient wash so the panel reads as lit glass, not a flat block */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-20 -top-28 h-72 w-72 rounded-full opacity-[0.22] blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, var(--color-accent), transparent)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full opacity-[0.14] blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, var(--color-accent2), transparent)",
            }}
          />
          {/* specular hairline along the top edge */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-8 top-0 h-px"
            style={{
              background:
                "linear-gradient(to right, transparent, color-mix(in srgb, var(--color-accent) 55%, transparent), transparent)",
            }}
          />

          <div className="relative">
            <Logo href="/dashboard" />
          </div>

          <div className="relative mt-8 flex-1">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-faint">
              Workspace
            </p>
            <SidebarNav />
          </div>

          <div className="relative">
            <PlanPanel plan={user.plan} used={used} limit={FREE_MONTHLY_LIMIT} />

            {/* user block */}
            <div className="flex items-center gap-3 rounded-2xl border border-edge bg-card/60 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2 text-xs font-bold text-white">
                {initials(user.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-faint">{user.email}</p>
              </div>
              <LogoutButton compact />
            </div>
          </div>
        </aside>
      </div>

      {/* ---------- mobile top bar + content ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-edge bg-bg/80 px-4 py-3 backdrop-blur-xl md:hidden">
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
