"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CreditCard,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  User,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { SIDEBAR_COOKIE } from "@/lib/ui";

const EASE = [0.16, 1, 0.3, 1] as const;

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/new", label: "New review", icon: Plus, exact: false },
  { href: "/dashboard/account", label: "Account", icon: User, exact: false },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, exact: false },
];

/* ------------------------------------------------------------------ */

const CollapsedCtx = createContext(false);
export const useCollapsed = () => useContext(CollapsedCtx);

/**
 * The desktop rail. Collapses to icons, and remembers the choice — a sidebar
 * that springs back open on every navigation is worse than none.
 */
export function SidebarShell({
  defaultCollapsed = false,
  children,
  footer,
}: {
  defaultCollapsed?: boolean;
  children: ReactNode; // the plan panel + user block
  footer?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  return (
    <CollapsedCtx.Provider value={collapsed}>
      <div className="sticky top-0 hidden h-screen shrink-0 p-3 md:block">
        <motion.aside
          // initial={false}: render straight at the server-known width, so a
          // collapsed rail doesn't animate shut on every navigation.
          initial={false}
          animate={{ width: collapsed ? 84 : 268 }}
          transition={{ duration: 0.42, ease: EASE }}
          className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-edge2/70 bg-surface/60 p-4 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-2xl"
        >
          {/* ambient washes */}
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
            className="pointer-events-none absolute inset-x-8 top-0 h-px"
            style={{
              background:
                "linear-gradient(to right, transparent, color-mix(in srgb, var(--color-accent) 55%, transparent), transparent)",
            }}
          />

          {/* logo + collapse toggle */}
          <div className="relative flex items-center justify-between gap-2">
            <Link
              href="/dashboard"
              className="flex min-w-0 items-center gap-2.5"
              aria-label="HireLens"
            >
              <LogoGlyph />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="overflow-hidden whitespace-nowrap text-lg font-bold tracking-tight"
                  >
                    Hire<span className="text-gradient">Lens</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </div>

          <button
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-edge bg-card/80 text-faint transition-colors hover:border-accent/40 hover:text-accent"
            style={collapsed ? { right: "50%", transform: "translateX(50%)", top: "3.6rem" } : undefined}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5" />
            )}
          </button>

          {/* nav */}
          <div className={cn("relative flex-1", collapsed ? "mt-14" : "mt-8")}>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-faint"
                >
                  Workspace
                </motion.p>
              )}
            </AnimatePresence>
            <Nav collapsed={collapsed} />
          </div>

          <div className="relative">{children}</div>
          {footer}
        </motion.aside>
      </div>
    </CollapsedCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */

function Nav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={cn(
              "group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-colors",
              collapsed ? "justify-center px-0" : "gap-3 px-3",
              active ? "text-ink" : "text-muted hover:text-ink"
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-pill"
                className="absolute inset-0 rounded-xl border border-edge2 bg-card2"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}

            <span
              className={cn(
                "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors",
                active
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-transparent text-faint group-hover:border-edge group-hover:bg-card group-hover:text-muted"
              )}
            >
              <item.icon className="h-4 w-4" />
            </span>

            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.22, ease: EASE }}
                  className="relative z-10 overflow-hidden whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>

            {/* tooltip when collapsed */}
            {collapsed && (
              <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-lg border border-edge2 bg-bg px-2.5 py-1.5 text-xs font-semibold shadow-xl group-hover:block">
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function LogoGlyph() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="h-8 w-8 shrink-0" aria-hidden>
      <defs>
        <linearGradient id="sb-rim" x1="6" y1="4" x2="30" y2="34">
          <stop offset="0%" stopColor="#ffb877" />
          <stop offset="28%" stopColor="#f2622e" />
          <stop offset="100%" stopColor="#e04a1c" />
        </linearGradient>
        <clipPath id="sb-clip">
          <circle cx="17" cy="17" r="11.5" />
        </clipPath>
      </defs>
      <path d="M26.5 26.5 L35 35" stroke="url(#sb-rim)" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="17" cy="17" r="11.5" fill="var(--color-card2)" />
      <g clipPath="url(#sb-clip)">
        {[
          { x: 12, h: 5 },
          { x: 15.6, h: 8.5 },
          { x: 19.2, h: 12 },
        ].map((b) => (
          <rect
            key={b.x}
            x={b.x}
            y={23 - b.h}
            width="2.4"
            height={b.h}
            rx="1.2"
            fill="url(#sb-rim)"
          />
        ))}
      </g>
      <circle cx="17" cy="17" r="11.5" stroke="url(#sb-rim)" strokeWidth="2.8" />
    </svg>
  );
}
