"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import type { CoverLetter } from "@/lib/ai";

/**
 * Generate and export a cover letter grounded in this resume + job (Pro).
 *
 * Free users see the locked value, not a disabled button — the honest sell is
 * "here is what Pro does", not a teaser of the output. Pro users generate,
 * read, copy, and download a real PDF they can send.
 */
export function CoverLetterPanel({
  reviewId,
  isPro,
  initial,
}: {
  reviewId: string;
  isPro: boolean;
  initial: CoverLetter | null;
}) {
  const [letter, setLetter] = useState<CoverLetter | null>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/cover-letter`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't write the cover letter.");
        setPending(false);
        return;
      }
      setLetter(data.coverLetter);
      setPending(false);
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  function plainText(l: CoverLetter) {
    return [l.hook, ...l.paragraphs, l.closing].join("\n\n");
  }

  async function copy() {
    if (!letter) return;
    await navigator.clipboard.writeText(plainText(letter));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  /* ---- free: locked value ---- */
  if (!isPro) {
    return (
      <div className="card p-5 sm:p-6">
        <h2 className="flex items-center gap-2.5 text-lg font-medium tracking-tight">
          <TitleIcon /> Cover letter
        </h2>
        <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted">
          Pro writes a cover letter grounded in your actual resume and tuned to
          this job — no invented experience, no fabricated numbers — and exports
          it as a clean PDF you can send.
        </p>
        <Link href="/dashboard/billing?intent=pro" className="btn btn-primary mt-5">
          <Lock className="h-4 w-4" /> Unlock with Pro
        </Link>
      </div>
    );
  }

  /* ---- pro: empty state ---- */
  if (!letter) {
    return (
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="flex items-center gap-2.5 text-lg font-medium tracking-tight">
            <TitleIcon /> Cover letter
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            Drafted from your resume and this job — grounded, never invented.
          </p>
        </div>
        <button onClick={generate} className="btn btn-primary shrink-0" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Writing…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generate
            </>
          )}
        </button>
        {error && (
          <p role="alert" className="text-sm text-bad sm:w-full">
            {error}
          </p>
        )}
      </div>
    );
  }

  /* ---- pro: the letter ---- */
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-lg font-medium tracking-tight">
          <TitleIcon /> Cover letter
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={copy} className="btn btn-ghost">
            {copied ? (
              <>
                <Check className="h-4 w-4 text-good" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy
              </>
            )}
          </button>
          <a
            href={`/api/reviews/${reviewId}/cover-letter/pdf`}
            className="btn btn-ghost"
          >
            <Download className="h-4 w-4" /> PDF
          </a>
          <button onClick={generate} className="btn btn-ghost" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Redo
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-4 rounded-2xl [&>p]:max-w-[72ch] border border-white/80 bg-white/60 p-5 text-sm leading-relaxed sm:p-7">
        <p>{letter.hook}</p>
        {letter.paragraphs.map((p, i) => (
          <p key={i} className="text-muted">
            {p}
          </p>
        ))}
        <p className="text-muted">{letter.closing}</p>
      </div>

      <p className="mt-3 text-xs text-muted">
        Anything in <span className="font-mono">[ ]</span> is a number to fill
        in — we never invent one for you.
      </p>
    </div>
  );
}

/** The heading icon, in a small glass disc like the other review cards. */
function TitleIcon() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/70 text-accent">
      <FileText className="h-4 w-4" />
    </span>
  );
}
