"use client";

import { motion } from "motion/react";
import { AudioLines, Gauge, MessageSquareDashed, Timer } from "lucide-react";
import {
  type Delivery,
  deliveryScore,
  fillerBand,
  fillerLabel,
  hedgeBand,
  paceBand,
  paceLabel,
} from "@/lib/speech-metrics";
import { cn } from "@/lib/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

const BAND_COLOR = {
  good: "var(--color-good)",
  warn: "var(--color-warn)",
  bad: "var(--color-bad)",
} as const;

function Metric({
  icon: Icon,
  label,
  value,
  unit,
  band,
  note,
  /** Where the value sits on a 0-1 scale, for the bar. */
  fill,
  index,
}: {
  icon: typeof Gauge;
  label: string;
  value: number | string;
  unit?: string;
  band: "good" | "warn" | "bad";
  note: string;
  fill: number;
  index: number;
}) {
  const color = BAND_COLOR[band];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px 120px 0px" }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: EASE }}
      className="rounded-2xl border border-edge bg-card2 p-4"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
      </div>

      <p className="mt-2 text-2xl font-extrabold tabular-nums" style={{ color }}>
        {value}
        {unit && (
          <span className="ml-1 text-xs font-semibold text-faint">{unit}</span>
        )}
      </p>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-edge">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.min(100, fill * 100)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.2 + index * 0.07, ease: EASE }}
        />
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted">{note}</p>
    </motion.div>
  );
}

export function CommunicationPanel({
  delivery,
  coaching,
}: {
  delivery: Delivery;
  coaching?: { summary: string; notes: string[] };
}) {
  const score = deliveryScore(delivery);

  const topFillers = Object.entries(delivery.fillerBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const topHedges = Object.entries(delivery.hedgeBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const mins = Math.floor(delivery.durationSec / 60);
  const secs = delivery.durationSec % 60;

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-bold">
            <AudioLines className="h-4 w-4 text-accent" /> How you came across
          </h2>
          <p className="mt-1 text-sm text-muted">
            Measured from your actual audio — not guessed from the transcript.
          </p>
        </div>

        <div className="text-right">
          <p
            className="text-3xl font-extrabold tabular-nums"
            style={{
              color:
                score >= 75
                  ? "var(--color-good)"
                  : score >= 55
                    ? "var(--color-warn)"
                    : "var(--color-bad)",
            }}
          >
            {score}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">
            Delivery
          </p>
        </div>
      </div>

      {/* the four numbers that actually decide how you land */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          index={0}
          icon={Gauge}
          label="Pace"
          value={delivery.wpm}
          unit="wpm"
          band={paceBand(delivery.wpm)}
          note={paceLabel(delivery.wpm)}
          // 145 wpm is the centre of the conversational band
          fill={Math.min(1, delivery.wpm / 200)}
        />
        <Metric
          index={1}
          icon={MessageSquareDashed}
          label="Filler words"
          value={delivery.fillersPerMin}
          unit="per min"
          band={fillerBand(delivery.fillersPerMin)}
          note={fillerLabel(delivery.fillersPerMin)}
          fill={Math.min(1, delivery.fillersPerMin / 15)}
        />
        <Metric
          index={2}
          icon={MessageSquareDashed}
          label="Hedging"
          value={delivery.hedgeCount}
          unit={delivery.hedgeCount === 1 ? "phrase" : "phrases"}
          band={hedgeBand(delivery.hedgeCount, delivery.wordCount)}
          note={
            delivery.hedgeCount === 0
              ? "You stated things plainly. Good."
              : "Words like 'I think' and 'maybe' quietly undercut your own claims."
          }
          fill={Math.min(1, delivery.hedgeCount / 12)}
        />
        <Metric
          index={3}
          icon={Timer}
          label="Hesitations"
          value={delivery.pauseCount}
          unit={delivery.pauseCount === 1 ? "pause" : "pauses"}
          band={
            delivery.pauseCount <= 1
              ? "good"
              : delivery.pauseCount <= 4
                ? "warn"
                : "bad"
          }
          note={
            delivery.pauseCount === 0
              ? "No stalling. You kept moving."
              : `Silences over 1.5s. Longest: ${delivery.longestPauseSec}s.`
          }
          fill={Math.min(1, delivery.pauseCount / 8)}
        />
      </div>

      {/* the specific tics, named */}
      {topFillers.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
            Your tics, counted
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topFillers.map(([word, n]) => (
              <span
                key={word}
                className={cn(
                  "chip gap-1.5",
                  n >= 4
                    ? "border-bad/40 text-bad"
                    : "border-warn/30 text-warn"
                )}
              >
                &ldquo;{word}&rdquo;
                <span className="font-mono text-[10px] opacity-70">×{n}</span>
              </span>
            ))}
            {topHedges.map(([word, n]) => (
              <span key={word} className="chip gap-1.5 border-edge2 text-muted">
                &ldquo;{word}&rdquo;
                <span className="font-mono text-[10px] opacity-70">×{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* the coach's read, grounded in the numbers above */}
      {coaching && (
        <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/[0.04] p-5">
          <p className="text-sm leading-relaxed">{coaching.summary}</p>
          {coaching.notes.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {coaching.notes.map((n) => (
                <li key={n} className="flex gap-2.5 text-sm">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  <span className="leading-relaxed text-muted">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-5 text-xs text-faint">
        {mins > 0 ? `${mins}m ${secs}s` : `${secs}s`} of speech ·{" "}
        {delivery.wordCount} words · {delivery.fillerCount} fillers total
      </p>
    </div>
  );
}
