"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Lock, Scale, Users } from "lucide-react";
import {
  PANELIST_META,
  type PanelReport,
  type PanelistRole,
} from "@/lib/interview";
import { scoreColor } from "@/components/ScoreRing";
import { cn } from "@/lib/cn";

/**
 * The panel: three role-differentiated interviewers who score independently and
 * then reach a verdict. On-demand and Pro-gated. The whole appeal is watching
 * them DISAGREE — a recruiter's "lean hire" next to a hiring manager's "no hire"
 * is the most honest artifact this product makes.
 */

const VERDICT_STYLE: Record<string, string> = {
  "Strong hire": "border-good/40 text-good bg-white/60",
  Hire: "border-good/35 text-good bg-white/60",
  "Lean hire": "border-warn/35 text-warn bg-white/60",
  "Lean no hire": "border-warn/40 text-warn bg-white/60",
  "No hire": "border-bad/40 text-bad bg-white/60",
};

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
      <section className="card p-6 sm:p-7">
        <h2 className="flex items-center gap-2 text-lg font-medium tracking-tight">
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
      </section>
    );
  }

  /* ---- pro: not yet convened ---- */
  if (!panel) {
    return (
      <section className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-start gap-3.5">
          {/* three seats at the table */}
          <span className="mt-0.5 flex shrink-0 -space-x-2" aria-hidden>
            {["R", "H", "B"].map((l, i) => (
              <span
                key={l}
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-ink/80 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.75)]"
                style={{ background: ["#9fd8cb", "#f5d98b", "#cfd6f5"][i] }}
              >
                {l}
              </span>
            ))}
          </span>
          <div>
            <h2 className="text-lg font-medium tracking-tight">Convene the panel</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
              A recruiter, a hiring manager, and a bar raiser each score this
              interview from their own lens — then reach a verdict.
            </p>
            {error && (
              <p role="alert" className="mt-2 text-sm text-bad">
                {error}
              </p>
            )}
          </div>
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
      </section>
    );
  }

  /* ---- the panel's decision ---- */
  return (
    <section className="card p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Scale className="h-3.5 w-3.5 text-accent" /> The panel&rsquo;s decision
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/85">
            {panel.synthesis}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-xl border px-3 py-1.5 text-base font-semibold",
            VERDICT_STYLE[panel.verdict] ?? "border-white/80 bg-white/60 text-ink"
          )}
        >
          {panel.verdict}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {panel.panelists.map((p) => {
          const meta = PANELIST_META[p.role as PanelistRole];
          return (
            <div
              key={p.role}
              className="flex flex-col rounded-2xl border border-white/80 bg-white/50 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{meta.name}</p>
                <span
                  className="text-2xl font-light leading-none tabular-nums"
                  style={{ color: scoreColor(p.score) }}
                >
                  {p.score}
                </span>
              </div>
              <span
                className={cn(
                  "chip mt-2 w-fit px-2.5 py-0.5 text-xs",
                  VERDICT_STYLE[p.verdict] ?? "text-muted"
                )}
              >
                {p.verdict}
              </span>
              <p className="mb-3 mt-3 flex-1 text-sm leading-relaxed text-ink/80">{p.take}</p>
              <p className="border-t border-ink/10 pt-3 text-xs leading-relaxed text-muted">
                <span className="font-semibold text-warn">Worries me:</span>{" "}
                {p.concern}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
