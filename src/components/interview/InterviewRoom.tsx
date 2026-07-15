"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Code2,
  Crosshair,
  Flag,
  Loader2,
  MessageSquareText,
  ScanSearch,
  Sparkles,
  Target,
  Volume2,
  VolumeX,
  Waypoints,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { stopSpeaking } from "@/lib/tts";
import { TypedQuestion } from "@/components/interview/TypedQuestion";
import { InterviewerOrb, type OrbState } from "@/components/interview/InterviewerOrb";
import type { Delivery } from "@/lib/speech-metrics";
import { KIND_LABELS, type QuestionKind } from "@/lib/interview";
import { VoiceComposer } from "@/components/interview/VoiceComposer";
import { cn } from "@/lib/cn";

const EASE = [0.16, 1, 0.3, 1] as const;

/** An icon per question kind, so the transcript reads at a glance. */
const KIND_ICON: Record<QuestionKind, LucideIcon> = {
  warmup: Sparkles,
  behavioral: MessageSquareText,
  technical: Code2,
  gap_probe: Target,
  resume_deep_dive: ScanSearch,
  claim_probe: Crosshair,
  closing: Waypoints,
};

export type Msg = {
  role: "interviewer" | "candidate";
  content: string;
  kind?: QuestionKind;
  isFollowUp?: boolean;
  delivery?: Delivery;
};

/* ------------------------------------------------------------------ */

export function InterviewRoom({
  id,
  jobTitle,
  company,
  initialMessages,
  answered,
  totalQuestions,
  isPro,
}: {
  id: string;
  jobTitle: string;
  company: string | null;
  initialMessages: Msg[];
  answered: number;
  totalQuestions: number;
  isPro: boolean;
}) {
  const router = useRouter();

  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [done, setDone] = useState(answered);
  const [thinking, setThinking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);

  // What the interviewer is doing right now, for the orb + status line.
  const orbState: OrbState = thinking
    ? "thinking"
    : speaking
      ? "speaking"
      : "idle";
  const statusLabel = thinking
    ? "Thinking…"
    : speaking
      ? "Speaking…"
      : "Listening";

  // elapsed timer — interviews are timed, and the pressure is the point
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const send = useCallback(
    async (answer: string, delivery: Delivery) => {
      if (!answer.trim() || thinking) return;

      stopSpeaking();
      setError(null);
      setThinking(true);
      setMessages((m) => [
        ...m,
        { role: "candidate", content: answer, delivery },
      ]);

    try {
      const res = await fetch(`/api/interviews/${id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, delivery }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setThinking(false);
        return;
      }

      if (data.done) {
        router.push(`/dashboard/interview/${id}/report`);
        router.refresh();
        return;
      }

      setMessages((m) => [
        ...m,
        {
          role: "interviewer",
          content: data.question.content,
          kind: data.question.kind,
          isFollowUp: data.question.isFollowUp,
        },
      ]);
      setDone(data.answered);
      setThinking(false);
    } catch {
      setError("Network error. Your answer wasn't sent — try again.");
      setThinking(false);
    }
    },
    [id, router, thinking]
  );

  async function finishEarly() {
    setFinishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/${id}/finish`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't end the interview.");
        setFinishing(false);
        return;
      }
      router.push(`/dashboard/interview/${id}/report`);
      router.refresh();
    } catch {
      setError("Network error.");
      setFinishing(false);
    }
  }

  // Only the newest question performs itself; the rest of the transcript is
  // already-said history and renders instantly.
  const lastInterviewerIndex = messages.reduce(
    (acc, m, i) => (m.role === "interviewer" ? i : acc),
    -1
  );

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="relative flex h-[calc(100vh-9rem)] flex-col md:h-[calc(100vh-7rem)]">
      {/* ambient depth behind the whole room */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 left-1/2 -z-10 h-64 w-[min(680px,90%)] -translate-x-1/2 rounded-full opacity-[0.12] blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, var(--color-accent), transparent)",
        }}
      />

      {/* ---------- header: the session bar ---------- */}
      <div className="card mb-4 flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <InterviewerOrb state={orbState} size={46} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">
              {jobTitle}
              {company && <span className="text-muted"> · {company}</span>}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-xs">
              <span
                className={cn(
                  "flex items-center gap-1.5 font-semibold",
                  thinking || speaking ? "text-accent" : "text-good"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    thinking || speaking ? "bg-accent" : "bg-good"
                  )}
                />
                {statusLabel}
              </span>
              <span className="text-faint">·</span>
              <span className="text-muted">{isPro ? "Full loop" : "Screen"}</span>
              <span className="text-faint">·</span>
              <span className="font-mono tabular-nums text-muted">
                {mm}:{ss}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* segmented progress — one pip per question */}
          <div className="hidden items-center gap-1.5 sm:flex" title={`${done} of ${totalQuestions} answered`}>
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <motion.span
                key={i}
                className="h-1.5 rounded-full"
                animate={{
                  width: i < done ? 22 : 8,
                  backgroundColor:
                    i < done
                      ? "var(--color-accent)"
                      : "var(--color-edge2)",
                }}
                transition={{ duration: 0.4, ease: EASE }}
              />
            ))}
          </div>

          <button
            onClick={() => {
              if (!muted) stopSpeaking();
              setMuted((m) => !m);
            }}
            aria-label={muted ? "Unmute the interviewer" : "Mute the interviewer"}
            title={muted ? "Unmute the interviewer" : "Mute the interviewer"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-edge text-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            {muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>

          <button
            onClick={finishEarly}
            disabled={finishing || thinking || done === 0}
            title={
              done === 0
                ? "Answer at least one question first"
                : "End and get scored on what you've answered"
            }
            className="btn btn-ghost px-3 py-2 text-xs"
          >
            {finishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Flag className="h-3.5 w-3.5" />
            )}
            End
          </button>
        </div>
      </div>

      {/* ---------- transcript ---------- */}
      <div
        ref={scroller}
        className="card flex-1 space-y-6 overflow-y-auto p-5 sm:p-6"
      >
        {messages.map((m, i) => (
          <Bubble
            key={i}
            msg={m}
            index={i}
            muted={muted}
            live={i === lastInterviewerIndex}
            onSpeakingChange={i === lastInterviewerIndex ? setSpeaking : undefined}
          />
        ))}

        <AnimatePresence>
          {thinking && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <InterviewerOrb state="thinking" size={34} />
              <div className="flex gap-1 rounded-2xl rounded-tl-sm border border-edge bg-card2 px-4 py-3">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="h-1.5 w-1.5 rounded-full bg-accent"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      delay: d * 0.15,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---------- composer: voice first ---------- */}
      <div className="mt-4">
        {error && (
          <p
            role="alert"
            className="mb-2 rounded-lg border border-bad/30 bg-bad/5 px-3 py-2 text-sm text-bad"
          >
            {error}
          </p>
        )}

        <VoiceComposer disabled={thinking || finishing} onSubmit={send} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Bubble({
  msg,
  index,
  muted,
  live,
  onSpeakingChange,
}: {
  msg: Msg;
  index: number;
  muted: boolean;
  /** The question currently being put to the candidate: it types itself out. */
  live?: boolean;
  onSpeakingChange?: (speaking: boolean) => void;
}) {
  const isInterviewer = msg.role === "interviewer";
  // Bumping this remounts TypedQuestion, which replays the reveal + the voice.
  const [replay, setReplay] = useState(0);

  const KindIcon = msg.kind ? KIND_ICON[msg.kind] : Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index, 3) * 0.04, ease: EASE }}
      className={cn(
        "flex gap-3",
        isInterviewer ? "justify-start" : "justify-end"
      )}
    >
      {isInterviewer && (
        <div className="mt-6 shrink-0">
          <InterviewerOrb state={live ? "speaking" : "idle"} size={30} />
        </div>
      )}

      <div className={cn("max-w-[85%]", !isInterviewer && "order-1")}>
        {isInterviewer && (
          <div className="mb-2 flex items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                msg.isFollowUp
                  ? "border-warn/30 bg-warn/5 text-warn"
                  : "border-accent/25 bg-accent/5 text-accent"
              )}
            >
              <KindIcon className="h-3 w-3" />
              {msg.isFollowUp ? "Follow-up" : msg.kind ? KIND_LABELS[msg.kind] : "Question"}
            </span>
            {/* Autoplay can always be blocked, so never make hearing the
                question depend on it — this always works. */}
            <button
              onClick={() => setReplay((r) => r + 1)}
              aria-label="Hear this question again"
              title="Play it again"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-edge text-faint transition-colors hover:border-accent/40 hover:text-accent"
            >
              <Volume2 className="h-3 w-3" />
            </button>
          </div>
        )}

        <div
          className={cn(
            "text-[15px] leading-relaxed",
            isInterviewer
              ? "rounded-2xl rounded-tl-md border border-edge2/60 bg-card2/80 px-4 py-3.5 shadow-[0_2px_12px_-6px_rgba(0,0,0,0.5)] backdrop-blur"
              : "rounded-2xl rounded-tr-md bg-gradient-to-br from-accent to-accent2 px-4 py-3.5 font-medium text-[#180f0a] shadow-[0_6px_20px_-10px_var(--color-accent)]"
          )}
        >
          {isInterviewer && (live || replay > 0) ? (
            <TypedQuestion
              // Include `muted` so toggling it REMOUNTS with fresh state rather
              // than re-running the reveal effect against stale `shown`.
              key={`${index}-${replay}-${muted ? "m" : "s"}`}
              text={msg.content}
              speakIt={!muted}
              onSpeakingChange={onSpeakingChange}
            />
          ) : (
            msg.content
          )}
        </div>
      </div>
    </motion.div>
  );
}
