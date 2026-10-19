"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  AudioLines,
  FileText,
  LayoutGrid,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { cn } from "@/lib/cn";

export type SearchEntry = {
  kind: "review" | "interview";
  id: string;
  title: string;
  company: string | null;
  score: number | null;
};

const PAGES = [
  { label: "Overview", href: "/dashboard" },
  { label: "New review", href: "/dashboard/new" },
  { label: "Mock interviews", href: "/dashboard/interview" },
  { label: "Start a mock interview", href: "/dashboard/interview/new" },
  { label: "Applications", href: "/dashboard/tracker" },
  { label: "Account settings", href: "/dashboard/account" },
  { label: "Billing", href: "/dashboard/billing" },
];

/**
 * Page title and where its back arrow goes. The overview gets a greeting
 * instead. `ownHeading` marks the pages that render their own h1 (the review
 * form and a review); everywhere else this title is the page's h1.
 */
function pageMeta(
  path: string
): { title: string; back: string; ownHeading?: boolean } | null {
  if (path === "/dashboard") return null;
  if (path.startsWith("/dashboard/new"))
    return { title: "New review", back: "/dashboard", ownHeading: true };
  if (path.startsWith("/dashboard/reviews/"))
    return { title: "Review", back: "/dashboard", ownHeading: true };
  if (path === "/dashboard/interview") return { title: "Mock interviews", back: "/dashboard" };
  if (path.startsWith("/dashboard/interview/new"))
    return { title: "New interview", back: "/dashboard/interview" };
  if (/^\/dashboard\/interview\/[^/]+\/report/.test(path))
    return { title: "Interview report", back: "/dashboard/interview" };
  if (path.startsWith("/dashboard/interview/"))
    return { title: "Interview", back: "/dashboard/interview" };
  if (path.startsWith("/dashboard/tracker")) return { title: "Applications", back: "/dashboard" };
  if (path.startsWith("/dashboard/account")) return { title: "Account", back: "/dashboard" };
  if (path.startsWith("/dashboard/billing")) return { title: "Billing", back: "/dashboard" };
  return { title: "Dashboard", back: "/dashboard" };
}

function greetingFor(hour: number) {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const noopSubscribe = () => () => {};

/**
 * The greeting depends on the viewer's clock, which the server can't know.
 * The server snapshot is a neutral "Welcome back"; the client swaps in the
 * time-of-day greeting right after hydration without a mismatch.
 */
function useGreeting() {
  return useSyncExternalStore(
    noopSubscribe,
    () => greetingFor(new Date().getHours()),
    () => "Welcome back"
  );
}

export function DashboardHeader({
  firstName,
  initials,
  plan,
  remaining,
  limit,
  entries,
}: {
  firstName: string;
  initials: string;
  plan: "FREE" | "PRO";
  remaining: number;
  limit: number;
  entries: SearchEntry[];
}) {
  const pathname = usePathname();
  const meta = pageMeta(pathname);
  const greeting = useGreeting();

  return (
    <header className="relative z-30 px-4 pb-5 pt-4 text-white md:px-6 md:pt-5">
      {/* phone-only brand row: the rail is hidden below md */}
      <div className="mb-4 flex items-center justify-between md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <LogoMark className="h-9 w-9" />
          <span className="text-lg font-bold tracking-tight">HireLens</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={plan === "PRO" ? "/dashboard/billing" : "/dashboard/billing?intent=pro"}
            className="canopy-search flex h-10 items-center gap-1.5 px-3.5 text-xs font-semibold"
          >
            {plan === "PRO" ? (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Pro
              </>
            ) : (
              `${remaining}/${limit} left`
            )}
          </Link>
          <Link
            href="/dashboard/account"
            aria-label="Account settings"
            className="canopy-btn text-xs font-bold"
          >
            {initials}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {meta ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href={meta.back}
              aria-label="Back"
              className="-ml-1.5 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/15"
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
            </Link>
            {meta.ownHeading ? (
              // a label, not the h1 — this page carries its own heading
              <p className="truncate text-xl font-medium tracking-tight md:text-[1.4rem]">
                <TypeText key={meta.title} text={meta.title} />
              </p>
            ) : (
              <h1 className="truncate text-xl font-medium tracking-tight md:text-[1.4rem]">
                <TypeText key={meta.title} text={meta.title} />
              </h1>
            )}
          </div>
        ) : (
          <h1 className="truncate text-xl font-medium tracking-tight md:text-[1.4rem]">
            <TypeText key={greeting} text={`${greeting}, ${firstName}`} />
          </h1>
        )}

        <QuickSearch entries={entries} />

        <div className="ml-auto hidden items-center gap-2.5 md:flex">
          {plan === "PRO" ? (
            <span className="canopy-search flex h-10 items-center gap-1.5 px-4 text-sm font-semibold">
              <Sparkles className="h-4 w-4" /> Pro
            </span>
          ) : (
            <Link
              href="/dashboard/billing?intent=pro"
              className="canopy-search flex h-10 items-center px-4 text-sm font-medium transition-colors hover:bg-white/20"
            >
              {remaining} of {limit} reviews left
            </Link>
          )}
          <Link
            href="/dashboard/account"
            aria-label="Account settings"
            className="canopy-btn text-xs font-bold"
          >
            {initials}
          </Link>
          <Link href="/dashboard/new" className="btn btn-primary h-10 px-5">
            <Plus className="h-4 w-4" /> New review
          </Link>
        </div>
      </div>
    </header>
  );
}

/**
 * The header title types itself in, a letter at a time, whenever it changes —
 * as the reference's header does when you move between screens. Keyed by the
 * caller so a new title replays it. Screen readers get the whole string.
 */
function TypeText({ text }: { text: string }) {
  return (
    <span aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <span
          key={i}
          aria-hidden
          className="type-char"
          style={{ animationDelay: `${i * 34}ms` }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */

type Result = {
  key: string;
  label: string;
  sub: string;
  href: string;
  icon: typeof FileText;
};

/**
 * Jump-to search across pages, reviews and interviews. Typing filters;
 * arrows move, Enter opens, Escape closes. ⌘K / Ctrl+K focuses it from
 * anywhere in the dashboard.
 */
function QuickSearch({ entries }: { entries: SearchEntry[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results: Result[] = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const all: Result[] = [
      ...PAGES.map((p) => ({
        key: p.href,
        label: p.label,
        sub: "Page",
        href: p.href,
        icon: LayoutGrid,
      })),
      ...entries.map((e) => ({
        key: `${e.kind}-${e.id}`,
        label: e.title,
        sub: [
          e.kind === "review" ? "Review" : "Interview",
          e.company,
          e.score !== null ? `${e.score}/100` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        href:
          e.kind === "review"
            ? `/dashboard/reviews/${e.id}`
            : `/dashboard/interview/${e.id}`,
        icon: e.kind === "review" ? FileText : AudioLines,
      })),
    ];
    if (!needle) return all.slice(0, 7);
    return all
      .filter((r) => `${r.label} ${r.sub}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [q, entries]);

  function go(r: Result) {
    setOpen(false);
    setQ("");
    inputRef.current?.blur();
    router.push(r.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      const r = results[cursor];
      if (r) {
        e.preventDefault();
        go(r);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const showList = open && results.length > 0;

  return (
    <div className="relative order-last w-full md:order-none md:w-[300px] lg:w-[340px]">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/80" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setCursor(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        placeholder="Search reviews, interviews, pages…"
        aria-label="Search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList ? `${listId}-${cursor}` : undefined}
        className="canopy-search h-10 w-full pl-10 pr-12 text-sm outline-none transition-colors focus:border-white/70 focus:bg-white/20"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/30 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-white/80 md:block">
        ⌘K
      </kbd>

      <AnimatePresence>
        {showList && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/80 bg-white/90 p-1.5 text-ink shadow-[0_24px_60px_-24px_rgba(18,36,26,0.55)] backdrop-blur-2xl"
          >
            {results.map((r, i) => (
              <li
                key={r.key}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === cursor}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(r);
                }}
                onMouseEnter={() => setCursor(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5",
                  i === cursor && "bg-card2"
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card2 text-accent">
                  <r.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{r.label}</span>
                  <span className="block truncate text-xs text-faint">{r.sub}</span>
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
