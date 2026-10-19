import { PageTransition } from "@/components/PageTransition";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { SidebarShell } from "@/components/dashboard/SidebarShell";
import {
  DashboardHeader,
  type SearchEntry,
} from "@/components/dashboard/DashboardHeader";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { FREE_MONTHLY_LIMIT } from "@/lib/plans";
import { monthlyReviewCount } from "@/lib/usage";

function initials(name: string) {
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
  const [used, reviews, interviews] = await Promise.all([
    user.plan === "FREE" ? monthlyReviewCount(user.id) : Promise.resolve(0),
    db.review.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, jobTitle: true, company: true, overallScore: true },
    }),
    db.interview.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, jobTitle: true, company: true, overallScore: true },
    }),
  ]);

  const entries: SearchEntry[] = [
    ...reviews.map((r) => ({
      kind: "review" as const,
      id: r.id,
      title: r.jobTitle,
      company: r.company,
      score: r.overallScore,
    })),
    ...interviews.map((i) => ({
      kind: "interview" as const,
      id: i.id,
      title: i.jobTitle,
      company: i.company,
      score: i.overallScore,
    })),
  ];

  return (
    // The forest frame. The rail and the canopy panel sit inside it; the page
    // scrolls as a whole so sticky elements and scroll restoration behave.
    <div className="flex flex-1 bg-forest md:gap-3 md:p-3">
      <SidebarShell
        user={{
          name: user.name,
          email: user.email,
          plan: user.plan,
          used,
          limit: FREE_MONTHLY_LIMIT,
        }}
      />

      {/* overflow-clip (not hidden) rounds the panel without becoming a scroll
          container, so position:sticky inside pages still tracks the window */}
      <div className="canopy flex min-h-dvh min-w-0 flex-1 flex-col overflow-clip md:min-h-[calc(100dvh-1.5rem)] md:rounded-[26px]">
        <DashboardHeader
          firstName={user.name.split(" ")[0] || user.name}
          initials={initials(user.name)}
          plan={user.plan}
          remaining={Math.max(0, FREE_MONTHLY_LIMIT - used)}
          limit={FREE_MONTHLY_LIMIT}
          entries={entries}
        />

        {/* pb-28 on mobile so the floating tab bar never covers page content */}
        <main className="flex w-full flex-1 flex-col px-4 pb-28 md:px-6 md:pb-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
