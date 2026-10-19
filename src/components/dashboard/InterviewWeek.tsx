"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AudioLines, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export type PracticeSession = {
  id: string;
  jobTitle: string;
  company: string | null;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  answered: number;
  total: number;
  score: number | null;
  /** ISO timestamp */
  at: string;
};

const DAY = 86_400_000;
const noopSubscribe = () => () => {};

/** Midnight at the start of the week (Sunday) containing `d`, local time. */
function weekStart(d: Date) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - s.getDay());
  return s;
}
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Mock-interview practice laid out like the reference's interview calendar:
 * a week strip you can page through, with a dot under every day you
 * practised. Picking a day shows that day's sessions; otherwise the two most
 * recent show, the first one in forest so the live session pulls focus.
 *
 * Dates depend on the viewer's timezone, so the strip renders only after
 * hydration (the server snapshot is "not mounted").
 */
export function InterviewWeek({ sessions }: { sessions: PracticeSession[] }) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [offset, setOffset] = useState(0); // weeks from the current one
  const [picked, setPicked] = useState<number | null>(null); // epoch ms of a day

  const days = useMemo(() => {
    if (!mounted) return [];
    const start = weekStart(new Date()).getTime() + offset * 7 * DAY;
    return Array.from({ length: 7 }, (_, i) => new Date(start + i * DAY));
  }, [mounted, offset]);

  const dated = useMemo(
    () => sessions.map((s) => ({ ...s, date: new Date(s.at) })),
    [sessions]
  );

  const shown = picked
    ? dated.filter((s) => sameDay(s.date, new Date(picked)))
    : dated.slice(0, 2);

  const monthLabel =
    days.length > 0
      ? days[3].toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : " ";

  return (
    <section className="card flex w-full min-w-0 flex-col p-5 md:p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium tracking-tight">Interview practice</h2>
        <Link href="/dashboard/interview" className="text-sm font-medium text-accent hover:underline">
          All sessions
        </Link>
      </div>

      {/* month switcher */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/80 bg-white/40 px-1.5 py-1.5">
        <button
          onClick={() => {
            setOffset((o) => o - 1);
            setPicked(null);
          }}
          aria-label="Previous week"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/70 hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold" aria-live="polite">
          {monthLabel}
        </p>
        <button
          onClick={() => {
            setOffset((o) => o + 1);
            setPicked(null);
          }}
          aria-label="Next week"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/70 hover:text-ink"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* week strip */}
      <div className="mt-3 grid h-[66px] grid-cols-7 gap-1">
        {days.map((d) => {
          const has = dated.some((s) => sameDay(s.date, d));
          const isToday = sameDay(d, new Date());
          const isPicked = picked !== null && sameDay(d, new Date(picked));
          return (
            <button
              key={d.getTime()}
              onClick={() => setPicked(isPicked ? null : d.getTime())}
              aria-pressed={isPicked}
              aria-label={`${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}${has ? ", practice session" : ""}`}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl transition-colors",
                isPicked
                  ? "text-white"
                  : isToday
                    ? "bg-white/70 shadow-[0_1px_2px_rgba(18,36,26,0.08)]"
                    : "hover:bg-white/45"
              )}
            >
              {/* the dark selection pill slides from day to day */}
              {isPicked && (
                <motion.span
                  layoutId="week-pick"
                  className="absolute inset-0 rounded-xl bg-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
              <span className={cn("relative text-xs", isPicked ? "text-white/70" : "text-muted")}>
                {d.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span className="relative mt-0.5 text-lg font-medium tabular-nums leading-tight">
                {d.getDate()}
              </span>
              <span
                className={cn(
                  "absolute bottom-1.5 h-1 w-1 rounded-full",
                  has ? (isPicked ? "bg-neon" : "bg-accent2") : "bg-transparent"
                )}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-3">
        {shown.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-center">
            <p className="text-sm text-muted">
              {picked ? "No practice on this day." : "No mock interviews yet."}
            </p>
            <Link href="/dashboard/interview/new" className="btn btn-primary mt-3 px-4 py-2 text-xs">
              Start a mock interview
            </Link>
          </div>
        ) : (
          // Picking a day re-deals the cards: the leavers blur away, the
          // stayers glide to their new slot, and the first card turns forest.
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.map((s, i) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <SessionCard s={s} featured={i === 0} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}

function SessionCard({
  s,
  featured,
}: {
  s: PracticeSession & { date: Date };
  featured: boolean;
}) {
  const time = s.date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const detail =
    s.status === "COMPLETED"
      ? `Finished, scored ${s.score ?? "—"}/100`
      : s.status === "IN_PROGRESS"
        ? `${s.answered} of ${s.total} answered, pick up where you left off`
        : "Ended early";

  return (
    <Link
      href={`/dashboard/interview/${s.id}`}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-transform hover:-translate-y-0.5",
        featured
          ? "card-forest"
          : "border border-white/80 bg-white/45 hover:bg-white/70"
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-semibold">
          <AudioLines className={cn("h-4 w-4 shrink-0", featured ? "text-neon" : "text-accent")} />
          <span className="truncate">
            {s.company ? `${s.company}: ` : ""}
            {s.jobTitle}
          </span>
        </span>
        <span className={cn("mt-1 block truncate text-sm", featured ? "text-white/75" : "text-muted")}>
          {time}, {detail}
        </span>
      </span>
      {s.score !== null && (
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
            featured ? "bg-white/15 text-white ring-2 ring-white/25" : "bg-white/70 text-ink"
          )}
        >
          {s.score}
        </span>
      )}
    </Link>
  );
}
