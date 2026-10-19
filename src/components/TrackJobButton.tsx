"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, KanbanSquare, Loader2 } from "lucide-react";

// A glass pill for the review's dark forest strip, where this button sits.
const PILL =
  "inline-flex h-10 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:border-white/35 hover:bg-white/20 focus-visible:outline-white disabled:opacity-70";

/**
 * One-click "add this job to the tracker" from a review. Prefilled from the
 * review's own company/role and linked back to it, so the board card already
 * carries its score.
 */
export function TrackJobButton({
  reviewId,
  company,
  jobTitle,
}: {
  reviewId: string;
  company: string | null;
  jobTitle: string;
}) {
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");

  async function track() {
    if (state !== "idle") return;
    setState("saving");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company || jobTitle,
          role: jobTitle,
          status: "WISHLIST",
          reviewId,
        }),
      });
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <Link
        href="/dashboard/tracker"
        className={PILL}
      >
        <Check className="h-4 w-4 text-neon" /> Tracked — open board
      </Link>
    );
  }

  return (
    <button
      onClick={track}
      disabled={state === "saving"}
      className={PILL}
    >
      {state === "saving" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <KanbanSquare className="h-4 w-4" />
      )}
      Track this job
    </button>
  );
}
