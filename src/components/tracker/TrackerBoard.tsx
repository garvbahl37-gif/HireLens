"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ExternalLink,
  FileText,
  Loader2,
  MessagesSquare,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  APPLICATION_STATUSES,
  STATUS_META,
  type ApplicationCard,
  type ApplicationStatus,
} from "@/lib/applications";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { Monogram } from "@/components/dashboard/RecentReviews";
import { cn } from "@/lib/cn";

type ReviewOption = { id: string; label: string; score: number };

/**
 * The application board. A Kanban with two ways to move a card so it works on
 * every device: drag-and-drop on the desktop, and an explicit "move to" menu
 * (which is also the keyboard/touch path). Every mutation is optimistic — the
 * card moves instantly and the request settles behind it; a failure rolls back.
 */
export function TrackerBoard({
  initial,
  reviews,
}: {
  initial: ApplicationCard[];
  reviews: ReviewOption[];
}) {
  const [cards, setCards] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<ApplicationStatus | null>(null);
  const [adding, setAdding] = useState<ApplicationStatus | null>(null);

  const byStatus = useMemo(() => {
    const m = new Map<ApplicationStatus, ApplicationCard[]>();
    for (const s of APPLICATION_STATUSES) m.set(s, []);
    for (const c of [...cards].sort((a, b) => a.sortOrder - b.sortOrder)) {
      m.get(c.status)?.push(c);
    }
    return m;
  }, [cards]);

  async function move(id: string, to: ApplicationStatus) {
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === to) return;
    const prev = cards;
    // Optimistic: drop it at the top of the target column.
    const minOrder = Math.min(0, ...cards.filter((c) => c.status === to).map((c) => c.sortOrder));
    setCards((cs) =>
      cs.map((c) => (c.id === id ? { ...c, status: to, sortOrder: minOrder - 1 } : c))
    );
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: to, sortOrder: minOrder - 1 }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setCards(prev); // roll back
    }
  }

  async function remove(id: string) {
    const prev = cards;
    setCards((cs) => cs.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setCards(prev);
    }
  }

  function addCard(card: ApplicationCard) {
    setCards((cs) => [card, ...cs]);
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {APPLICATION_STATUSES.map((status) => {
          const meta = STATUS_META[status];
          const list = byStatus.get(status) ?? [];
          // The finish line gets the forest treatment, like the one emphasised
          // card on every surface of the reference.
          const offer = status === "OFFER";
          return (
            <div
              key={status}
              onDragOver={(e) => {
                if (dragId) {
                  e.preventDefault();
                  setOver(status);
                }
              }}
              onDragLeave={() => setOver((o) => (o === status ? null : o))}
              onDrop={() => {
                if (dragId) move(dragId, status);
                setDragId(null);
                setOver(null);
              }}
              className={cn(
                "flex flex-col p-2.5 transition-[box-shadow,background] xl:min-h-[440px]",
                offer ? "card-forest" : "card",
                over === status &&
                  (offer
                    ? "ring-2 ring-neon/60"
                    : "bg-white/70 ring-2 ring-accent2/50")
              )}
            >
              <div className="mb-2.5 flex items-center justify-between gap-2 px-1.5 pt-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      offer ? "bg-neon shadow-[0_0_8px_rgba(69,230,36,0.8)]" : meta.dot
                    )}
                  />
                  <span className={cn("truncate text-sm font-medium", offer ? "text-white" : "text-ink")}>
                    {meta.label}
                  </span>
                </div>
                <span
                  className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums",
                    offer ? "bg-white/15 text-white" : "bg-white/70 text-muted"
                  )}
                >
                  {list.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2">
                <AnimatePresence initial={false}>
                  {list.map((card) => (
                    <CardItem
                      key={card.id}
                      card={card}
                      dark={offer}
                      dragging={dragId === card.id}
                      onDragStart={() => setDragId(card.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOver(null);
                      }}
                      onMove={(to) => move(card.id, to)}
                      onRemove={() => remove(card.id)}
                    />
                  ))}
                </AnimatePresence>

                <button
                  onClick={() => setAdding(status)}
                  aria-label={`Add a job to ${meta.label}`}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-xs font-medium transition-colors",
                    offer
                      ? "border-white/25 text-white/70 hover:border-white/50 hover:bg-white/10 hover:text-white"
                      : "border-ink/15 text-muted hover:border-ink/30 hover:bg-white/50 hover:text-ink"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {adding && (
          <AddJobModal
            status={adding}
            reviews={reviews}
            onClose={() => setAdding(null)}
            onAdded={(card) => {
              addCard(card);
              setAdding(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */

function CardItem({
  card,
  dark = false,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
  onRemove,
}: {
  card: ApplicationCard;
  /** Sits in the forest (Offer) lane: white-on-glass instead of ink-on-glass. */
  dark?: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (to: ApplicationStatus) => void;
  onRemove: () => void;
}) {
  const [menu, setMenu] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative cursor-grab rounded-2xl border p-3 active:cursor-grabbing",
        dark
          ? "border-white/15 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
          : "border-white/80 bg-white/60 shadow-[0_1px_2px_rgba(18,36,26,0.06),0_10px_22px_-18px_rgba(18,36,26,0.45)]",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start gap-2.5 pr-5">
        {/* the list monogram, shrunk to fit a lane */}
        <span className="shrink-0 [&>span]:h-8 [&>span]:w-8 [&>span]:text-xs">
          <Monogram name={card.company} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-semibold", dark ? "text-white" : "text-ink")}>
            {card.company}
          </p>
          <p className={cn("line-clamp-2 text-xs leading-snug", dark ? "text-white/70" : "text-muted")}>
            {card.role}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          {card.reviewId && (
            <Link
              href={`/dashboard/reviews/${card.reviewId}`}
              className={cn(
                "flex items-center gap-1 text-[11px] transition-colors",
                dark ? "text-white/70 hover:text-neon" : "text-muted hover:text-accent"
              )}
            >
              <FileText className="h-3 w-3" /> Review
            </Link>
          )}
          {card.interviewId && (
            <Link
              href={`/dashboard/interview/${card.interviewId}/report`}
              className={cn(
                "flex items-center gap-1 text-[11px] transition-colors",
                dark ? "text-white/70 hover:text-neon" : "text-muted hover:text-accent"
              )}
            >
              <MessagesSquare className="h-3 w-3" /> Mock
            </Link>
          )}
          {card.sourceUrl && (
            <a
              href={card.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-1 text-[11px] transition-colors",
                dark ? "text-white/70 hover:text-neon" : "text-muted hover:text-accent"
              )}
            >
              <ExternalLink className="h-3 w-3" /> Posting
            </a>
          )}
        </div>
        {card.reviewScore != null && (
          <Link
            href={`/dashboard/reviews/${card.reviewId}`}
            title="Open review"
            className={cn("shrink-0 rounded-full", dark && "[&_span]:text-white/80")}
          >
            <ProgressRing score={card.reviewScore} size={20} />
          </Link>
        )}
      </div>

      {/* move / delete menu — the touch + keyboard path */}
      <button
        onClick={() => setMenu((m) => !m)}
        aria-label="Card actions"
        className={cn(
          "absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100",
          dark
            ? "text-white/70 hover:bg-white/15 hover:text-white"
            : "text-muted hover:bg-white hover:text-ink"
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {menu && (
        <>
          <button
            className="fixed inset-0 z-10 cursor-default"
            aria-hidden
            onClick={() => setMenu(false)}
          />
          <div className="absolute right-1.5 top-9 z-20 w-44 overflow-hidden rounded-2xl border border-white/80 bg-white/95 py-1.5 text-ink shadow-[0_18px_40px_-18px_rgba(18,36,26,0.45)] backdrop-blur-xl">
            <p className="px-3 py-1 text-xs text-faint">Move to</p>
            {APPLICATION_STATUSES.filter((s) => s !== card.status).map((s) => (
              <button
                key={s}
                onClick={() => {
                  onMove(s);
                  setMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ink/80 transition-colors hover:bg-sage/70 hover:text-ink"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s].dot)} />
                {STATUS_META[s].label}
              </button>
            ))}
            <div className="my-1 h-px bg-ink/10" />
            <button
              onClick={() => {
                onRemove();
                setMenu(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-bad transition-colors hover:bg-bad/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

function AddJobModal({
  status,
  reviews,
  onClose,
  onAdded,
}: {
  status: ApplicationStatus;
  reviews: ReviewOption[];
  onClose: () => void;
  onAdded: (card: ApplicationCard) => void;
}) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [reviewId, setReviewId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  const ready = company.trim().length > 0 && role.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || pending) return;
    setPending(true);
    setError(null);
    const linked = reviews.find((r) => r.id === reviewId);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.trim(),
          role: role.trim(),
          status,
          sourceUrl: sourceUrl.trim() || undefined,
          reviewId: reviewId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't add that job.");
        setPending(false);
        return;
      }
      onAdded({
        id: data.id,
        company: company.trim(),
        role: role.trim(),
        status,
        sourceUrl: sourceUrl.trim() || null,
        notes: null,
        reviewId: reviewId || null,
        interviewId: null,
        reviewScore: linked?.score ?? null,
        sortOrder: -Date.now(),
        appliedAt: null,
      });
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest/40 px-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.form
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-[1.4rem] border border-white/80 bg-white/90 p-6 text-ink shadow-[0_30px_70px_-30px_rgba(18,36,26,0.55)] backdrop-blur-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-medium tracking-tight">
            <span className={cn("h-2 w-2 rounded-full", STATUS_META[status].dot)} />
            Add to {STATUS_META[status].label}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-sage hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="company">Company</label>
              <input
                ref={firstRef}
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="input"
                placeholder="Stripe"
                autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="role">Role</label>
              <input
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input"
                placeholder="Senior Backend Engineer"
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="url">Job posting (optional)</label>
            <input
              id="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="input"
              placeholder="https://…"
            />
          </div>

          {reviews.length > 0 && (
            <div>
              <label className="label" htmlFor="review">Link a review (optional)</label>
              <select
                id="review"
                value={reviewId}
                onChange={(e) => setReviewId(e.target.value)}
                className="input"
              >
                <option value="">None</option>
                {reviews.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label} · {r.score}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-bad/30 bg-bad/5 px-3 py-2 text-sm text-bad">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn btn-ghost" disabled={pending}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!ready || pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add job
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
