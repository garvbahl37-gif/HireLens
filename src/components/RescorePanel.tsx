"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RefreshCw, PenLine } from "lucide-react";

/**
 * Edit the resume and re-run it against the same job.
 *
 * The textarea is prefilled with the resume text we already have, so the user
 * applies the fixes the review just named and re-scores in place. The job is
 * fixed server-side — this is about moving the number on THIS target, honestly.
 */
export function RescorePanel({
  reviewId,
  resumeText,
}: {
  reviewId: string;
  resumeText: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(resumeText);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = text.trim() !== resumeText.trim();

  async function rescore() {
    if (pending || !changed) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/rescore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't re-score. Try again.");
        setPending(false);
        return;
      }
      router.push(`/dashboard/reviews/${data.id}`);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  if (!open) {
    return (
      <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-edge bg-card2 text-accent">
            <RefreshCw className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Apply the fixes, then re-score</p>
            <p className="mt-0.5 text-sm text-muted">
              Edit your resume and re-run it on this same job. We don&rsquo;t
              guess the new number — we re-run it.
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="btn btn-ghost shrink-0"
        >
          <PenLine className="h-4 w-4" /> Edit &amp; re-score
        </button>
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Edit your resume</p>
        <span className="text-xs text-faint">
          Same job — only the resume changes
        </span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        spellCheck={false}
        className="input font-mono text-xs leading-relaxed"
        placeholder="Your resume text…"
      />

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad"
        >
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          onClick={() => {
            setOpen(false);
            setText(resumeText);
            setError(null);
          }}
          className="btn btn-ghost"
          disabled={pending}
        >
          Cancel
        </button>
        <button
          onClick={rescore}
          className="btn btn-primary"
          disabled={pending || !changed}
          title={changed ? undefined : "Make an edit first"}
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Re-scoring…
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" /> Re-score
            </>
          )}
        </button>
      </div>
    </div>
  );
}
