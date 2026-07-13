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
      {/* ---------- sidebar (desktop) ---------- */}
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col overflow-hidden border-r border-edge bg-surface/50 p-5 backdrop-blur-xl md:flex">
        {/* ambient wash so the rail reads as a lit panel, not a flat block */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full opacity-[0.18] blur-3xl"
          style={{
            background:
              "radial-gradient(closest-side, var(--color-accent), transparent)",
          }}
        />
        {/* hairline highlight down the right edge */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-px"
          style={{
            background:
              "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--color-accent) 35%, transparent), transparent)",
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
          <PlanPanel
            plan={user.plan}
            used={used}
            limit={FREE_MONTHLY_LIMIT}
          />

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
