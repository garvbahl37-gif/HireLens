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

/** What every panel is listening for, kept in view while you answer. */
const LISTENING_FOR = [
  "Lead with the result, then the how",
  "Put a number on it",
  "Say what you did, not the team",
];

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

  // The question on the table right now, for the session card.
  const current = lastInterviewerIndex >= 0 ? messages[lastInterviewerIndex] : null;
  const CurrentIcon = current?.kind ? KIND_ICON[current.kind] : Sparkles;
  const currentLabel = current?.isFollowUp
    ? "Follow-up"
    : current?.kind
      ? KIND_LABELS[current.kind]
      : "Question";
  const questionNo = Math.min(done + 1, totalQuestions);

  const active = thinking || speaking;

  const muteButton = (className: string) => (
    <button
      onClick={() => {
        if (!muted) stopSpeaking();
        setMuted((m) => !m);
      }}
      aria-label={muted ? "Unmute the interviewer" : "Mute the interviewer"}
      title={muted ? "Unmute the interviewer" : "Mute the interviewer"}
      className={className}
    >
      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </button>
  );

  const endButton = (className: string) => (
    <button
      onClick={finishEarly}
      disabled={finishing || thinking || done === 0}
      title={
        done === 0
          ? "Answer at least one question first"
          : "End and get scored on what you've answered"
      }
      className={className}
    >
      {finishing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Flag className="h-3.5 w-3.5" />
      )}
      End
    </button>
  );

  return (
    <div className="relative flex h-[calc(100dvh-18.5rem)] min-h-[440px] flex-col gap-3 md:h-[calc(100dvh-11.5rem)] lg:h-[calc(100dvh-8rem)] lg:flex-row lg:gap-4">
      {/* ---------- session bar (phones + tablets) ---------- */}
      <div className="card flex items-center gap-3 p-3 lg:hidden">
        <InterviewerOrb state={orbState} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {jobTitle}
            {company && <span className="font-normal text-muted"> · {company}</span>}
          </p>
          <p className="mt-1 flex items-center gap-2 text-xs">
            <span
              className={cn(
                "flex items-center gap-1.5 font-semibold",
                active ? "text-accent" : "text-good"
              )}
            >
              <span
                className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-accent" : "bg-good")}
              />
              {statusLabel}
            </span>
            <span className="text-faint">·</span>
            <span className="tabular-nums text-muted">
              {mm}:{ss}
            </span>
            <span className="text-faint">·</span>
            <span className="tabular-nums text-muted">
              {done}/{totalQuestions}
            </span>
          </p>
        </div>
        {muteButton(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/55 text-ink transition-colors hover:bg-white"
        )}
        {endButton("btn btn-ghost shrink-0 px-3 py-2 text-xs")}
      </div>

      {/* ---------- the conversation ---------- */}
      <section className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="hidden items-center justify-between gap-3 border-b border-ink/[0.07] px-6 py-3.5 sm:flex">
          <h2 className="text-lg font-medium tracking-tight">Conversation</h2>

          {/* segmented progress — one pip per question */}
          <div
            className="flex items-center gap-1.5"
            title={`${done} of ${totalQuestions} answered`}
          >
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <motion.span
                key={i}
                className="h-1.5 rounded-full"
                animate={{
                  width: i < done ? 22 : 8,
                  backgroundColor:
                    i < done ? "var(--color-accent2)" : "rgba(18, 33, 26, 0.14)",
                }}
                transition={{ duration: 0.4, ease: EASE }}
              />
            ))}
          </div>
        </div>

        <div
          ref={scroller}
          className="flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-6"
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
                <InterviewerOrb state="thinking" size={30} />
                <div className="flex gap-1 rounded-2xl rounded-tl-md border border-white/80 bg-white/60 px-4 py-3 shadow-[0_1px_2px_rgba(18,36,26,0.05)]">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="h-1.5 w-1.5 rounded-full bg-accent2"
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
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          {error && (
            <p
              role="alert"
              className="mb-2 rounded-xl border border-bad/30 bg-white/60 px-3 py-2 text-sm text-bad"
            >
              {error}
            </p>
          )}

          <VoiceComposer disabled={thinking || finishing} onSubmit={send} />
        </div>
      </section>

      {/* ---------- the interviewer (desktop column) ---------- */}
      <aside className="hidden min-h-0 w-[300px] shrink-0 flex-col gap-4 lg:flex xl:w-[320px]">
        <div className="card flex flex-1 flex-col items-center p-5 text-center">
          <div className="mt-6">
            <InterviewerOrb state={orbState} size={92} />
          </div>
          <p className="mt-8 text-[1.4rem] font-medium tracking-tight">{statusLabel}</p>
          <p className="mt-1 text-sm text-muted">
            {jobTitle}
            {company && <> at {company}</>}
          </p>

          <div className="mt-6 grid w-full grid-cols-2 divide-x divide-ink/10 rounded-2xl border border-white/80 bg-white/50 py-3">
            <div>
              <p className="text-sm text-muted">Elapsed</p>
              <p className="mt-0.5 text-2xl font-light tabular-nums">
                {mm}:{ss}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted">Answered</p>
              <p className="mt-0.5 text-2xl font-light tabular-nums">
                {done}
                <span className="text-base text-faint">/{totalQuestions}</span>
              </p>
            </div>
          </div>

          {/* what a panel listens for — set like the reference's prompt list;
              dropped on short screens so the column never overflows */}
          <ul className="mt-5 hidden w-full space-y-2 text-left [@media(min-height:860px)]:block">
            {LISTENING_FOR.map((tip) => (
              <li
                key={tip}
                className="flex items-center gap-2.5 rounded-xl border border-white/80 bg-white/40 px-3.5 py-2.5 text-sm text-ink/85"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent2" aria-hidden />
                {tip}
              </li>
            ))}
          </ul>

          <div className="mt-auto flex w-full gap-2 pt-5">
            {muteButton(
              "btn btn-ghost flex-1 px-3 py-2.5 text-sm"
            )}
            {endButton("btn btn-ghost flex-1 px-3 py-2.5 text-sm")}
          </div>
        </div>

        {/* the one emphasised thing: where you are in the loop */}
        <div className="card-forest p-5">
          <p className="text-sm text-white/70">
            {isPro ? "Full loop" : "Screen"} · adaptive follow-ups
          </p>
          <p className="mt-1 text-xl font-medium tracking-tight">
            Question {questionNo} of {totalQuestions}
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm text-white/85">
            <CurrentIcon className="h-4 w-4 text-neon" />
            {currentLabel}
          </p>
          <div className="mt-4 flex gap-1" aria-hidden>
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i < done ? "bg-neon" : i === done ? "bg-white/50" : "bg-white/15"
                )}
              />
            ))}
          </div>
        </div>
      </aside>
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
        <div className="mt-8 shrink-0">
          <InterviewerOrb state={live ? "speaking" : "idle"} size={28} />
        </div>
      )}

      <div className={cn("max-w-[85%] sm:max-w-[78%]", !isInterviewer && "order-1")}>
        {isInterviewer && (
          <div className="mb-2 flex items-center gap-2">
            <span
              className={cn(
                "chip gap-1.5 px-2.5 py-1 text-xs",
                msg.isFollowUp ? "text-warn" : "text-accent"
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
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-white/50 text-muted transition-colors hover:bg-white hover:text-ink"
            >
              <Volume2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div
          className={cn(
            "text-[15px] leading-relaxed",
            isInterviewer
              ? "rounded-2xl rounded-tl-md border border-white/80 bg-white/60 px-4 py-3.5 text-ink shadow-[0_1px_2px_rgba(18,36,26,0.05),0_10px_24px_-18px_rgba(18,36,26,0.3)]"
              : "rounded-2xl rounded-tr-md bg-pill px-4 py-3.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_26px_-16px_rgba(13,26,16,0.7)]"
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
