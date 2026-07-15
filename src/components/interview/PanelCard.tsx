"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Lock, Scale, Users } from "lucide-react";
import {
  PANELIST_META,
  type PanelReport,
  type PanelistRole,
} from "@/lib/interview";
import { cn } from "@/lib/cn";

/**
 * The panel: three role-differentiated interviewers who score independently and
 * then reach a verdict. On-demand and Pro-gated. The whole appeal is watching
 * them DISAGREE — a recruiter's "lean hire" next to a hiring manager's "no hire"
 * is the most honest artifact this product makes.
 */

const VERDICT_STYLE: Record<string, string> = {
  "Strong hire": "border-good/50 text-good bg-good/10",
  Hire: "border-good/40 text-good bg-good/5",
  "Lean hire": "border-warn/40 text-warn bg-warn/5",
  "Lean no hire": "border-warn/50 text-warn bg-warn/10",
  "No hire": "border-bad/50 text-bad bg-bad/10",
};

function scoreColor(n: number) {
  return n >= 75 ? "var(--color-good)" : n >= 55 ? "var(--color-warn)" : "var(--color-bad)";
}

export function PanelCard({
  interviewId,
  isPro,
  initial,
}: {
  interviewId: string;
  isPro: boolean;
  initial: PanelReport | null;
}) {
  const [panel, setPanel] = useState<PanelReport | null>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function convene() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/panel`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "The panel couldn't convene.");
        setPending(false);
        return;
      }
      setPanel(data.panel);
      setPending(false);
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  /* ---- free: locked value ---- */
  if (!isPro && !panel) {
    return (
      <div className="card p-6 sm:p-8">
        <h2 className="flex items-center gap-2 font-bold">
          <Users className="h-4 w-4 text-accent" /> The panel
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Pro convenes a full panel — a recruiter, a hiring manager, and a bar
          raiser — who each judge your interview from their own seat and then
          argue it out to a verdict. Watching them disagree is the closest thing
          to hearing the room after you leave it.
        </p>
        <Link href="/dashboard/billing?intent=pro" className="btn btn-primary mt-5">
          <Lock className="h-4 w-4" /> Unlock with Pro
        </Link>
      </div>
    );
  }

  /* ---- pro: not yet convened ---- */
  if (!panel) {
    return (
      <div className="card flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="flex items-center gap-2 font-bold">
            <Users className="h-4 w-4 text-accent" /> Convene the panel
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">
            A recruiter, a hiring manager, and a bar raiser each score this
            interview from their own lens — then reach a verdict.
          </p>
          {error && (
            <p role="alert" className="mt-2 text-sm text-bad">
              {error}
            </p>
          )}
        </div>
        <button onClick={convene} className="btn btn-primary shrink-0" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Deliberating…
            </>
          ) : (
            <>
              <Users className="h-4 w-4" /> Convene
            </>
          )}
        </button>
      </div>
    );
  }

  /* ---- the panel's decision ---- */
  return (
    <div className="card overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
            <Scale className="h-3.5 w-3.5" /> The panel&rsquo;s decision
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {panel.synthesis}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-xl border px-3 py-1.5 text-lg font-extrabold",
            VERDICT_STYLE[panel.verdict] ?? "border-edge text-ink"
          )}
        >
          {panel.verdict}
        </span>
      </div>

      <div className="grid divide-y divide-edge border-t border-edge sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {panel.panelists.map((p) => {
          const meta = PANELIST_META[p.role as PanelistRole];
          return (
            <div key={p.role} className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{meta.name}</p>
                <span
                  className="text-lg font-extrabold tabular-nums"
                  style={{ color: scoreColor(p.score) }}
                >
                  {p.score}
                </span>
              </div>
              <span
                className={cn(
                  "chip mt-2 px-2 py-0.5 text-[10px] uppercase tracking-wider",
                  VERDICT_STYLE[p.verdict] ?? "border-edge text-muted"
                )}
              >
                {p.verdict}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-muted">{p.take}</p>
              <p className="mt-3 border-t border-edge pt-3 text-xs leading-relaxed text-faint">
                <span className="font-semibold text-warn">Worries me:</span>{" "}
                {p.concern}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
