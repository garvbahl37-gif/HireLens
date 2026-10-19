"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  BriefcaseBusiness,
  CreditCard,
  FilePlus2,
  House,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";

const NAV: { href: string; label: string; icon: LucideIcon; exact: boolean }[] = [
  { href: "/dashboard", label: "Overview", icon: House, exact: true },
  { href: "/dashboard/new", label: "New review", icon: FilePlus2, exact: false },
  // A voice glyph, because the mock interview is spoken.
  { href: "/dashboard/interview", label: "Mock interview", icon: AudioLines, exact: false },
  { href: "/dashboard/tracker", label: "Applications", icon: BriefcaseBusiness, exact: false },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, exact: false },
];

export type SidebarUser = {
  name: string;
  email: string;
  plan: "FREE" | "PRO";
  used: number;
  limit: number;
};

/**
 * The icon rail: a narrow forest panel with round buttons, the neon logo tile
 * on top and account controls pinned to the bottom. Labels live in tooltips,
 * which also show on keyboard focus so the rail is navigable without a mouse.
 */
export function SidebarShell({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  return (
    // z-40: a sticky element is its own stacking context, so without a z-index
    // of its own the green panel painted after it covered the tooltips.
    <aside className="sticky top-3 z-40 hidden h-[calc(100dvh-1.5rem)] w-[76px] shrink-0 flex-col items-center rounded-[22px] border border-white/[0.06] bg-rail/80 py-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] md:flex">
      <Link href="/dashboard" aria-label="HireLens overview" className="rounded-2xl">
        <LogoMark className="h-12 w-12 rounded-2xl" />
      </Link>

      <nav aria-label="Dashboard" className="mt-10 flex flex-col items-center gap-3">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <RailLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={active}
            />
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-3">
        <PlanButton user={user} />
        <RailLink
          href="/dashboard/account"
          label="Account settings"
          icon={Settings}
          active={pathname.startsWith("/dashboard/account")}
        />
        <div className="group relative">
          <LogoutButton variant="rail" />
          <Tooltip>Log out</Tooltip>
        </div>
      </div>
    </aside>
  );
}

function RailLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="rail-btn group"
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.1 : 1.75} />
      <Tooltip>{label}</Tooltip>
    </Link>
  );
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-lg bg-pill px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}

/**
 * Free plan: an upgrade button ringed by a meter of this month's reviews.
 * Pro: a quiet badge.
 */
function PlanButton({ user }: { user: SidebarUser }) {
  if (user.plan === "PRO") {
    return (
      <span
        title="Pro plan · unlimited reviews"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-neon/40 bg-neon/10 text-neon"
      >
        <Sparkles className="h-[18px] w-[18px]" />
      </span>
    );
  }

  const remaining = Math.max(0, user.limit - user.used);
  const pct = Math.min(1, user.used / user.limit);
  const size = 46;
  const r = 21;
  const c = 2 * Math.PI * r;
  const label = `${remaining} of ${user.limit} free reviews left this month. Upgrade to Pro`;

  return (
    <Link
      href="/dashboard/billing?intent=pro"
      aria-label={label}
      className="group relative flex h-[46px] w-[46px] items-center justify-center rounded-full"
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={2.5} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={remaining === 0 ? "var(--color-bad)" : "var(--color-neon)"}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neon text-forest shadow-[0_0_18px_-2px_var(--color-neon)] transition-transform group-hover:scale-105">
        <Zap className="h-4 w-4" />
      </span>
      <Tooltip>
        {remaining}/{user.limit} reviews left · Upgrade
      </Tooltip>
    </Link>
  );
}
