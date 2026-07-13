import { cookies } from "next/headers";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";
import { PageTransition } from "@/components/PageTransition";
import { SidebarNav } from "@/components/SidebarNav";
import { SidebarShell } from "@/components/dashboard/SidebarShell";
import { requireUser } from "@/lib/auth";
import { FREE_MONTHLY_LIMIT } from "@/lib/plans";
import { monthlyReviewCount } from "@/lib/usage";
import { SIDEBAR_COOKIE } from "@/lib/ui";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const used = user.plan === "FREE" ? await monthlyReviewCount(user.id) : 0;

  // Read the collapse preference server-side so the rail paints at the right
  // width immediately — no flash of an expanded sidebar snapping shut.
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";

  return (
    <div className="flex flex-1">
      {/* ---------- sidebar (desktop, collapsible) ---------- */}
      <SidebarShell
        defaultCollapsed={collapsed}
        user={{
          name: user.name,
          email: user.email,
          plan: user.plan,
          used,
          limit: FREE_MONTHLY_LIMIT,
        }}
      />

      {/* ---------- mobile top bar + content ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-edge bg-bg/80 px-4 py-3 backdrop-blur-xl md:hidden">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-2 overflow-x-auto">
            <SidebarNav vertical={false} />
            <LogoutButton compact />
          </div>
        </div>
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 lg:px-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
