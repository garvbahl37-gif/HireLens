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
                "flex flex-col rounded-2xl border bg-surface/40 p-2.5 transition-colors",
                over === status ? "border-accent/50 bg-accent/[0.04]" : "border-edge"
              )}
            >
              <div className="mb-2.5 flex items-center justify-between px-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                  <span className="text-xs font-bold uppercase tracking-wider text-ink">
                    {meta.label}
                  </span>
                  <span className="text-xs font-medium text-faint">{list.length}</span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2">
                <AnimatePresence initial={false}>
                  {list.map((card) => (
                    <CardItem
                      key={card.id}
                      card={card}
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
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-edge py-2 text-xs font-medium text-faint transition-colors hover:border-edge2 hover:text-muted"
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

function scoreColor(n: number) {
  return n >= 75 ? "var(--color-good)" : n >= 55 ? "var(--color-warn)" : "var(--color-bad)";
}

function CardItem({
  card,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
  onRemove,
}: {
  card: ApplicationCard;
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
        "group relative cursor-grab rounded-xl border border-edge bg-card p-3 active:cursor-grabbing",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{card.company}</p>
          <p className="truncate text-xs text-muted">{card.role}</p>
        </div>
        {card.reviewScore != null && (
          <Link
            href={`/dashboard/reviews/${card.reviewId}`}
            title="Open review"
            className="shrink-0 text-sm font-bold tabular-nums"
            style={{ color: scoreColor(card.reviewScore) }}
          >
            {card.reviewScore}
          </Link>
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        {card.reviewId && (
          <Link
            href={`/dashboard/reviews/${card.reviewId}`}
            className="flex items-center gap-1 text-[11px] text-faint transition-colors hover:text-accent"
          >
            <FileText className="h-3 w-3" /> Review
          </Link>
        )}
        {card.interviewId && (
          <Link
            href={`/dashboard/interview/${card.interviewId}/report`}
            className="flex items-center gap-1 text-[11px] text-faint transition-colors hover:text-accent"
          >
            <MessagesSquare className="h-3 w-3" /> Mock
          </Link>
        )}
        {card.sourceUrl && (
          <a
            href={card.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-faint transition-colors hover:text-accent"
          >
            <ExternalLink className="h-3 w-3" /> Posting
          </a>
        )}
      </div>

      {/* move / delete menu — the touch + keyboard path */}
      <button
        onClick={() => setMenu((m) => !m)}
        aria-label="Card actions"
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-faint opacity-0 transition-opacity hover:bg-card2 hover:text-ink focus:opacity-100 group-hover:opacity-100"
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
          <div className="absolute right-1.5 top-8 z-20 w-40 overflow-hidden rounded-lg border border-edge2 bg-bg py-1 shadow-xl">
            <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-faint">
              Move to
            </p>
            {APPLICATION_STATUSES.filter((s) => s !== card.status).map((s) => (
              <button
                key={s}
                onClick={() => {
                  onMove(s);
                  setMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-muted transition-colors hover:bg-card2 hover:text-ink"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[s].dot)} />
                {STATUS_META[s].label}
              </button>
            ))}
            <div className="my-1 h-px bg-edge" />
            <button
              onClick={() => {
                onRemove();
                setMenu(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-bad transition-colors hover:bg-bad/10"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 px-5 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.form
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="card w-full max-w-md p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold">
            <span className={cn("h-2 w-2 rounded-full", STATUS_META[status].dot)} />
            Add to {STATUS_META[status].label}
          </h2>
          <button type="button" onClick={onClose} className="text-faint hover:text-ink">
            <X className="h-5 w-5" />
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
          <p role="alert" className="mt-4 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
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
