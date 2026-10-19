"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { AudioLines, BriefcaseBusiness, FilePlus2, House } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/dashboard", label: "Overview", icon: House, exact: true },
  { href: "/dashboard/new", label: "Review", icon: FilePlus2, exact: false },
  { href: "/dashboard/interview", label: "Interview", icon: AudioLines, exact: false },
  { href: "/dashboard/tracker", label: "Applications", icon: BriefcaseBusiness, exact: false },
];

/**
 * Bottom tab bar, phone only — the forest rail, turned sideways. Every
 * destination sits in the thumb's reach and the tabs share the width evenly,
 * so it can't overflow.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard"
      className="fixed inset-x-3 bottom-3 z-40 rounded-[22px] border border-white/10 bg-forest/95 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.6)] backdrop-blur-xl md:hidden"
      // sit above the iOS home indicator rather than under it
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex p-1.5">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition-colors",
                active ? "text-white" : "text-white/60 hover:text-white/90"
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-tab"
                  className="absolute inset-0 rounded-2xl bg-white/12"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
              )}
              <tab.icon
                className={cn("relative h-[18px] w-[18px]", active && "text-neon")}
                strokeWidth={active ? 2.3 : 1.9}
              />
              <span className="relative">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
