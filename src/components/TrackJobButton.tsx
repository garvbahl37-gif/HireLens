"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, KanbanSquare, Loader2 } from "lucide-react";

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
        className="inline-flex items-center gap-1.5 text-sm font-medium text-good transition-colors hover:text-ink"
      >
        <Check className="h-4 w-4" /> Tracked — open board
      </Link>
    );
  }

  return (
    <button
      onClick={track}
      disabled={state === "saving"}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
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
