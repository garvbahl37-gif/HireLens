"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import {
  CreditCard,
  Infinity as InfinityIcon,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { cn } from "@/lib/cn";
import { SIDEBAR_COOKIE } from "@/lib/ui";

const EASE = [0.16, 1, 0.3, 1] as const;

const EXPANDED = 268;
const COLLAPSED = 84;

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/new", label: "New review", icon: Plus, exact: false },
  { href: "/dashboard/account", label: "Account", icon: User, exact: false },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, exact: false },
];

export type SidebarUser = {
  name: string;
  email: string;
  plan: "FREE" | "PRO";
  used: number;
  limit: number;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * The rail renders BOTH layouts as absolutely-positioned, fixed-width layers
 * and cross-fades between them while the container's width animates.
 *
 * The obvious approach — swapping the DOM on a `collapsed` boolean — looks
 * broken: the content teleports to its new layout on frame one while the
 * container is still sliding, and every intermediate width re-wraps the text
 * (labels get clipped mid-word, icons jump). Giving each layer the width it
 * was designed for means neither ever reflows; they simply fade past each
 * other as the container moves.
 */
export function SidebarShell({
  user,
  defaultCollapsed = false,
}: {
  user: SidebarUser;
  defaultCollapsed?: boolean;
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
    <div className="sticky top-0 hidden h-screen shrink-0 p-3 md:block">
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? COLLAPSED : EXPANDED }}
        transition={{ duration: 0.42, ease: EASE }}
        className="relative h-full overflow-hidden rounded-[28px] border border-edge2/70 bg-surface/60 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-2xl"
      >
        {/*
          A radial blob anchored off the top-left corner gets sliced by
          overflow-hidden against the 28px radius, which reads as a smudge
          rather than a glow. Light the panel from the top edge instead: an
          even, full-width falloff has no edge to clip against.
        */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-48"
          style={{
            background:
              "linear-gradient(to bottom, color-mix(in srgb, var(--color-accent) 9%, transparent), transparent 85%)",
          }}
        />
        {/* specular hairline, faded well before the corners */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, color-mix(in srgb, var(--color-accent) 40%, transparent), transparent)",
          }}
        />

        {/* ---- expanded layer ---- */}
        <motion.div
          initial={false}
          animate={{ opacity: collapsed ? 0 : 1 }}
          transition={{
            duration: collapsed ? 0.14 : 0.28,
            delay: collapsed ? 0 : 0.14,
            ease: "linear",
          }}
          style={{ width: EXPANDED }}
          // inert, not just pointer-events:none — the hidden layer stays mounted,
          // so without this its links remain keyboard-focusable and a Tab through
          // a collapsed sidebar would land on controls the user cannot see.
          inert={collapsed}
          className="absolute inset-y-0 left-0 flex flex-col p-4"
        >
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <LogoGlyph />
              <span className="whitespace-nowrap text-lg font-bold tracking-tight">
                Hire<span className="text-gradient">Lens</span>
              </span>
            </Link>
            <ToggleButton collapsed={false} onClick={toggle} />
          </div>

          <div className="mt-8 flex-1">
            <p className="mb-2 whitespace-nowrap px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-faint">
              Workspace
            </p>
            <Nav collapsed={false} />
          </div>

          <PlanBlock user={user} />

          <div className="flex items-center gap-3 rounded-2xl border border-edge bg-card/60 p-3">
            <Link
              href="/dashboard/account"
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <Avatar name={user.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-faint">{user.email}</p>
              </div>
            </Link>
            <LogoutButton compact />
          </div>
        </motion.div>

        {/* ---- collapsed layer ---- */}
        <motion.div
          initial={false}
          animate={{ opacity: collapsed ? 1 : 0 }}
          transition={{
            duration: collapsed ? 0.28 : 0.14,
            delay: collapsed ? 0.14 : 0,
            ease: "linear",
          }}
          style={{ width: COLLAPSED }}
          inert={!collapsed}
          className="absolute inset-y-0 left-0 flex flex-col items-center p-4"
        >
          <Link href="/dashboard" aria-label="HireLens">
            <LogoGlyph />
          </Link>

          <div className="mt-3">
            <ToggleButton collapsed onClick={toggle} />
          </div>

          <div className="mt-6 w-full flex-1">
            <Nav collapsed />
          </div>

          <div className="flex flex-col items-center gap-3">
            {user.plan === "FREE" ? (
              <Link
                href="/dashboard/billing?intent=pro"
                title={`${Math.max(0, user.limit - user.used)} of ${user.limit} reviews left — upgrade`}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent2 text-[#180f0a] shadow-[0_0_20px_-6px_var(--color-accent)]"
              >
                <Zap className="h-4 w-4" />
              </Link>
            ) : (
              <span
                title="Pro plan"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 text-accent"
              >
                <Sparkles className="h-4 w-4" />
              </span>
            )}
            <Link href="/dashboard/account" title={`${user.name} · ${user.email}`}>
              <Avatar name={user.name} />
            </Link>
            <LogoutButton compact />
          </div>
        </motion.div>
      </motion.aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ToggleButton({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-edge bg-card/80 text-faint transition-colors hover:border-accent/40 hover:text-accent"
    >
      {collapsed ? (
        <PanelLeftOpen className="h-3.5 w-3.5" />
      ) : (
        <PanelLeftClose className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent2 text-xs font-bold text-[#180f0a]">
      {initials(name)}
    </span>
  );
}

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
              collapsed ? "justify-center" : "gap-3 px-3",
              active ? "text-ink" : "text-muted hover:text-ink"
            )}
          >
            {active && (
              // layoutId is scoped per layer, so the two rails don't fight
              // over one shared pill while both are mounted.
              <motion.span
                layoutId={collapsed ? "pill-collapsed" : "pill-expanded"}
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

            {!collapsed && (
              <span className="relative z-10 whitespace-nowrap">{item.label}</span>
            )}

            {collapsed && (
              <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-lg border border-edge2 bg-bg px-2.5 py-1.5 text-xs font-semibold text-ink shadow-xl group-hover:block">
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function PlanBlock({ user }: { user: SidebarUser }) {
  if (user.plan === "PRO") {
    return (
      <div className="relative mb-3 overflow-hidden rounded-2xl border border-accent/30 bg-card p-4">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full opacity-30 blur-2xl"
          style={{
            background:
              "radial-gradient(closest-side, var(--color-accent), transparent)",
          }}
        />
        <p className="relative flex items-center gap-1.5 whitespace-nowrap text-sm font-bold text-accent">
          <Sparkles className="h-4 w-4" /> Pro plan
        </p>
        <p className="relative mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
          <InfinityIcon className="h-3.5 w-3.5" /> Unlimited reviews
        </p>
      </div>
    );
  }

  const remaining = Math.max(0, user.limit - user.used);
  const pct = Math.min(100, (user.used / user.limit) * 100);

  return (
    <div className="mb-3 rounded-2xl border border-edge bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="whitespace-nowrap text-sm font-bold">Free plan</p>
        <p className="whitespace-nowrap font-mono text-xs text-muted">
          {Math.min(user.used, user.limit)}
          <span className="text-faint">/{user.limit}</span>
        </p>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-edge">
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
      <p className="mt-2.5 whitespace-nowrap text-xs text-muted">
        {remaining === 0 ? (
          <span className="text-bad">All {user.limit} used this month.</span>
        ) : (
          <>
            <span className="font-semibold text-ink">{remaining}</span> review
            {remaining === 1 ? "" : "s"} left this month
          </>
        )}
      </p>
      <Link
        href="/dashboard/billing?intent=pro"
        className="btn btn-primary btn-sheen mt-3 w-full whitespace-nowrap px-3 py-2 text-xs"
      >
        <Zap className="h-3.5 w-3.5" /> Upgrade to Pro
      </Link>
    </div>
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
      <path
        d="M26.5 26.5 L35 35"
        stroke="url(#sb-rim)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
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
