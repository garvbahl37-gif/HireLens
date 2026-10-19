"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, ChevronRight, Plus } from "lucide-react";
import { JD_DRAFT_KEY } from "@/lib/drafts";

export type Suggestion = { label: string; href: string };
export type AssistantNote = { body: string; href: string; cta: string };

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The assistant column: the orb, a handful of next steps picked from the
 * user's own data, the latest piece of advice as a message, and a composer.
 *
 * Sending plays the reference's sequence: the orb and suggestions dissolve,
 * your message lands as a bubble, a "thinking" line shimmers — and then the
 * review form opens with the pasted job description already filled in.
 */
export function AssistantPanel({
  suggestions,
  note,
}: {
  suggestions: Suggestion[];
  note: AssistantNote | null;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [text, setText] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => router.push("/dashboard/new"), reduce ? 0 : 1600);
    return () => clearTimeout(t);
  }, [sent, router, reduce]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const jd = text.trim();
    if (!jd || sent) return;
    try {
      sessionStorage.setItem(JD_DRAFT_KEY, jd);
    } catch {
      // storage blocked: the form still opens, just empty
    }
    setText("");
    setSent(jd);
  }

  return (
    <section className="card flex w-full min-w-0 flex-col p-5 md:p-6 lg:min-h-[560px]">
      <AnimatePresence mode="wait" initial={false}>
        {sent === null ? (
          <motion.div
            key="idle"
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.97 }}
            transition={{ duration: 0.35 }}
          >
            <div className="flex flex-col items-center pt-6 text-center">
              {/* the entrance lives on a wrapper: the orb's own CSS breathing
                  animation owns its transform and would override a scale here */}
              <motion.div
                aria-hidden
                initial={reduce ? false : { opacity: 0, scale: 0.4, filter: "blur(12px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 1.1, delay: 0.35, ease: EASE }}
              >
                <div className="orb h-[84px] w-[84px]" />
              </motion.div>
              <motion.h2
                initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.7, delay: 0.7, ease: EASE }}
                className="mt-7 text-[1.4rem] font-medium tracking-tight"
              >
                What&apos;s next for your search?
              </motion.h2>
            </div>

            <ul className="mt-6 space-y-2.5">
              {suggestions.map((s, i) => (
                <motion.li
                  key={s.href + s.label}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85 + i * 0.07, duration: 0.45, ease: EASE }}
                >
                  <Link
                    href={s.href}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/45 px-4 py-3 text-sm text-ink shadow-[0_1px_2px_rgba(18,36,26,0.05)] transition-colors hover:bg-white/80"
                  >
                    <span>{s.label}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ) : (
          <motion.div
            key="sent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col pt-2"
          >
            <motion.p
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.5, ease: EASE }}
              className="ml-8 line-clamp-4 self-end rounded-2xl rounded-br-md border border-white/80 bg-white/60 p-3.5 text-sm leading-relaxed text-ink/85"
            >
              {sent}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              role="status"
              className="shimmer-text mt-4 text-sm font-medium"
            >
              Reading the job description…
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* the latest piece of advice, set as a message from the assistant */}
      <div className="mt-6 flex flex-1 flex-col justify-end">
        {note && sent === null && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5, ease: EASE }}
            className="mb-4 mr-6 rounded-2xl rounded-bl-md border border-white/80 bg-white/55 p-3.5 text-sm leading-relaxed text-ink/85"
          >
            {note.body}{" "}
            <Link href={note.href} className="font-semibold text-accent underline-offset-2 hover:underline">
              {note.cta}
            </Link>
          </motion.div>
        )}

        <form
          onSubmit={submit}
          className="rounded-2xl border border-white/80 bg-white/55 p-3 shadow-[0_1px_2px_rgba(18,36,26,0.05)] transition-shadow focus-within:bg-white/80 focus-within:shadow-[0_0_0_3px_rgba(42,157,54,0.22)]"
        >
          <label htmlFor="assistant-jd" className="sr-only">
            Paste a job description to start a review
          </label>
          <textarea
            id="assistant-jd"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            rows={2}
            disabled={sent !== null}
            placeholder="Paste a job description to start a review…"
            className="w-full resize-none bg-transparent px-1 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus-visible:outline-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <Link
              href="/dashboard/new"
              aria-label="Open the full review form"
              title="Open the full review form"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 bg-white/60 text-ink transition-colors hover:bg-white"
            >
              <Plus className="h-4 w-4" />
            </Link>
            <button
              type="submit"
              disabled={!text.trim() || sent !== null}
              aria-label="Start a review with this job description"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-pill text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition-opacity disabled:opacity-35"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
