"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { AudioLines, CreditCard, FilePlus2, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/new", label: "Review", icon: FilePlus2, exact: false },
  {
    href: "/dashboard/interview",
    label: "Interview",
    icon: AudioLines,
    exact: false,
  },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, exact: false },
];

/**
 * Bottom tab bar, phone only.
 *
 * The previous mobile nav crammed four links plus a logout into a horizontal
 * scroll strip in the top bar: labels wrapped onto two lines and half the
 * destinations were pushed off-screen entirely. A bottom bar puts every
 * destination in the thumb's reach and can't overflow, because the tabs share
 * the width evenly.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-bg/90 backdrop-blur-2xl md:hidden"
      // sit above the iOS home indicator rather than under it
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex">
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
                "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors",
                active ? "text-accent" : "text-faint hover:text-muted"
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-tab"
                  className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-gradient-to-r from-accent to-accent2"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
              )}
              <tab.icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 2} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
