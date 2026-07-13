"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { CreditCard, LayoutDashboard, Plus, User } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/new", label: "New review", icon: Plus, exact: false },
  { href: "/dashboard/account", label: "Account", icon: User, exact: false },
  {
    href: "/dashboard/billing",
    label: "Billing",
    icon: CreditCard,
    exact: false,
  },
];

export function SidebarNav({ vertical = true }: { vertical?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={cn("gap-1", vertical ? "flex flex-col" : "flex")}>
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "text-ink" : "text-muted hover:text-ink"
            )}
          >
            {/* the pill slides between items */}
            {active && (
              <motion.span
                layoutId={vertical ? "sidebar-pill" : "topbar-pill"}
                className="absolute inset-0 rounded-xl border border-edge2 bg-card2"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            {/* accent rail on the active item */}
            {active && vertical && (
              <motion.span
                layoutId="sidebar-rail"
                className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-accent to-accent2"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}

            <span
              className={cn(
                "relative z-10 flex h-7 w-7 items-center justify-center rounded-lg border transition-colors",
                active
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-transparent text-faint group-hover:border-edge group-hover:bg-card group-hover:text-muted"
              )}
            >
              <item.icon className="h-4 w-4" />
            </span>
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
