"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowUp, Keyboard, Loader2, Mic, Square } from "lucide-react";
import { type Delivery, computeDelivery } from "@/lib/speech-metrics";
import { useVoice } from "@/components/interview/useVoice";
import { cn } from "@/lib/cn";

const AUTO_STOP_SEC = 6;
/** Only start showing the countdown once the silence looks deliberate. */
const COUNTDOWN_FROM_SEC = 3;

export function VoiceComposer({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (answer: string, delivery: Delivery) => void;
}) {
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [typedStart, setTypedStart] = useState<number | null>(null);

  const voice = useVoice({
    onFinish: (answer, delivery) => onSubmit(answer, delivery),
  });

  /* ---------- typed fallback ---------- */
  if (typing || !voice.supported) {
    return (
      <div>
        {/* the reference's chat input: a glass box, round buttons along the
            bottom. The box carries the focus ring, so the field doesn't double it. */}
        <div className="rounded-2xl border border-white/80 bg-white/55 p-3 shadow-[0_1px_2px_rgba(18,36,26,0.05)] transition-colors focus-within:bg-white/80 focus-within:ring-2 focus-within:ring-accent2/45">
          <label htmlFor="typed-answer" className="sr-only">
            Your answer
          </label>
          <textarea
            id="typed-answer"
            value={draft}
            onChange={(e) => {
              if (typedStart === null) setTypedStart(Date.now());
              setDraft(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submitTyped();
              }
            }}
            disabled={disabled}
            rows={2}
            placeholder={
              disabled
                ? "The interviewer is thinking…"
                : "Type your answer. Be specific — use numbers."
            }
            className="max-h-40 min-h-[3rem] w-full resize-none bg-transparent px-1 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus-visible:outline-none! disabled:opacity-60"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            {voice.supported ? (
              <button
                onClick={() => setTyping(false)}
                title="Speak instead — you'll get delivery coaching"
                className="flex h-9 items-center gap-1.5 rounded-full border border-ink/15 bg-white/60 px-3 text-xs font-medium text-ink transition-colors hover:bg-white"
              >
                <Mic className="h-3.5 w-3.5" /> Speak instead
                <span className="hidden text-faint sm:inline">
                  · you&apos;ll get delivery coaching
                </span>
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={submitTyped}
              disabled={!draft.trim() || disabled}
              aria-label="Send answer"
              title="Send (⌘/Ctrl + Enter)"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pill text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition-opacity disabled:opacity-35"
            >
              {disabled ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {!voice.supported && (
          <p className="mt-2 px-1 text-xs text-faint">
            This browser can&apos;t record audio. Typed answers are still scored
            — you just won&apos;t get the delivery breakdown.
          </p>
        )}
      </div>
    );

    function submitTyped() {
      const text = draft.trim();
      if (!text || disabled) return;
      // A typed answer has no real delivery to measure. Pass zero duration so
      // the report knows to omit delivery for this turn rather than inventing
      // a words-per-minute figure from typing speed.
      onSubmit(
        text,
        computeDelivery({ transcript: text, durationSec: 0, pauses: [] })
      );
      setDraft("");
      setTypedStart(null);
    }
  }

  /* ---------- voice ---------- */
  const countdown = Math.max(0, voice.silenceSec - COUNTDOWN_FROM_SEC);
  const silenceProgress = Math.min(
    1,
    countdown / (AUTO_STOP_SEC - COUNTDOWN_FROM_SEC)
  );

  const busy = disabled || voice.transcribing;

  return (
    <div>
      {/* Same glass box as the typed composer: what you're saying (or the
          prompt to start) on top, the round controls along the bottom. */}
      <div
        className={cn(
          "relative rounded-2xl border bg-white/55 p-3 shadow-[0_1px_2px_rgba(18,36,26,0.05)] transition-colors",
          voice.recording ? "border-accent2/50 bg-white/75" : "border-white/80"
        )}
      >
        {/* waveform + status */}
        <div className="flex min-h-[3rem] flex-col justify-center px-1">
          {voice.recording ? (
            <>
              <div className="flex h-8 items-center gap-[3px]">
                {Array.from({ length: 48 }).map((_, i) => {
                  const v = voice.levels[i] ?? 0;
                  return (
                    <motion.span
                      key={i}
                      className="w-full rounded-full bg-accent2"
                      animate={{
                        height: `${Math.max(8, v * 100)}%`,
                        opacity: 0.35 + v * 0.65,
                      }}
                      transition={{ duration: 0.08 }}
                    />
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-faint">
                {voice.silenceSec > COUNTDOWN_FROM_SEC
                  ? `Sending in ${Math.ceil(AUTO_STOP_SEC - voice.silenceSec)}s — keep talking to continue`
                  : "Recording — take your time, pause to think"}
              </p>
            </>
          ) : voice.transcribing ? (
            <div>
              <p className="text-sm font-medium">Transcribing your answer…</p>
              <p className="mt-0.5 text-xs text-muted">
                Reading back exactly what you said.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium">
                {disabled ? "The interviewer is thinking…" : "Tap the mic to answer"}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Speak like you would in the room. We measure your pace, fillers
                and hesitation.
              </p>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            onClick={() => setTyping(true)}
            disabled={voice.recording || voice.transcribing}
            title="Type instead (no delivery coaching)"
            className="flex h-9 items-center gap-1.5 rounded-full border border-ink/15 bg-white/60 px-3 text-xs font-medium text-ink transition-colors hover:bg-white disabled:opacity-40"
          >
            <Keyboard className="h-3.5 w-3.5" /> Type instead
            <span className="hidden text-faint sm:inline">· no delivery coaching</span>
          </button>

          <div className="flex items-center gap-3">
            {voice.recording && (
              <span className="text-xs tabular-nums text-muted">
                {Math.floor(voice.elapsedSec / 60)}:
                {String(Math.floor(voice.elapsedSec % 60)).padStart(2, "0")}
              </span>
            )}

            {/* mic / stop — the dark circle is the one action here */}
            <button
              onClick={voice.recording ? voice.stop : voice.start}
              disabled={busy}
              aria-label={voice.recording ? "Stop and send" : "Start answering"}
              className={cn(
                "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_10px_22px_-12px_rgba(13,26,16,0.8)] transition-colors disabled:opacity-50",
                voice.recording ? "bg-bad" : "bg-pill hover:bg-[#1d3322]"
              )}
            >
              {/* auto-stop countdown ring */}
              {voice.recording && silenceProgress > 0.05 && (
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
                  <circle
                    cx="24"
                    cy="24"
                    r="22"
                    fill="none"
                    stroke="white"
                    strokeOpacity="0.9"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 22}
                    strokeDashoffset={2 * Math.PI * 22 * (1 - silenceProgress)}
                  />
                </svg>
              )}

              {voice.recording && (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-bad"
                  animate={{ scale: [1, 1.35], opacity: [0.35, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
              )}

              {voice.transcribing || disabled ? (
                <Loader2 className="relative h-5 w-5 animate-spin" />
              ) : voice.recording ? (
                <Square className="relative h-4 w-4 fill-current" />
              ) : (
                <Mic className="relative h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {voice.error && (
        <p
          role="alert"
          className="mt-2 rounded-xl border border-bad/30 bg-white/60 px-3 py-2 text-sm text-bad"
        >
          {voice.error}
        </p>
      )}
    </div>
  );
}
