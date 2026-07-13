"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Keyboard, Loader2, Mic, Send, Square } from "lucide-react";
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
        <div className="card flex items-end gap-2 p-2.5">
          <textarea
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
            className="max-h-40 min-h-[3rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-faint disabled:opacity-60"
          />
          <button
            onClick={submitTyped}
            disabled={!draft.trim() || disabled}
            className="btn btn-primary h-10 shrink-0 px-4"
          >
            {disabled ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Send <Send className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>

        {voice.supported && (
          <button
            onClick={() => setTyping(false)}
            className="mt-2 flex items-center gap-1.5 px-1 text-xs text-faint transition-colors hover:text-accent"
          >
            <Mic className="h-3 w-3" /> Speak instead — you&apos;ll get delivery
            coaching
          </button>
        )}
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
      <div
        className={cn(
          "card relative overflow-hidden p-5 transition-colors",
          voice.recording && "border-accent/50"
        )}
      >
        <div className="flex items-center gap-5">
          {/* mic / stop */}
          <button
            onClick={voice.recording ? voice.stop : voice.start}
            disabled={busy}
            aria-label={voice.recording ? "Stop and send" : "Start answering"}
            className={cn(
              "relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50",
              voice.recording
                ? "bg-bad text-white"
                : "bg-gradient-to-br from-accent to-accent2 text-[#180f0a]"
            )}
          >
            {/* auto-stop countdown ring */}
            {voice.recording && silenceProgress > 0.05 && (
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="30"
                  fill="none"
                  stroke="white"
                  strokeOpacity="0.9"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 30}
                  strokeDashoffset={2 * Math.PI * 30 * (1 - silenceProgress)}
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
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : voice.recording ? (
              <Square className="h-5 w-5 fill-current" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </button>

          {/* waveform + status */}
          <div className="min-w-0 flex-1">
            {voice.recording ? (
              <>
                <div className="flex h-10 items-center gap-[3px]">
                  {Array.from({ length: 48 }).map((_, i) => {
                    const v = voice.levels[i] ?? 0;
                    return (
                      <motion.span
                        key={i}
                        className="w-full rounded-full bg-accent"
                        animate={{
                          height: `${Math.max(8, v * 100)}%`,
                          opacity: 0.35 + v * 0.65,
                        }}
                        transition={{ duration: 0.08 }}
                      />
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="font-mono tabular-nums text-muted">
                    {Math.floor(voice.elapsedSec / 60)}:
                    {String(Math.floor(voice.elapsedSec % 60)).padStart(2, "0")}
                  </span>
                  <span className="text-faint">
                    {voice.silenceSec > COUNTDOWN_FROM_SEC
                      ? `Sending in ${Math.ceil(AUTO_STOP_SEC - voice.silenceSec)}s — keep talking to continue`
                      : "Recording — take your time, pause to think"}
                  </span>
                </div>
              </>
            ) : voice.transcribing ? (
              <div>
                <p className="text-sm font-semibold">Transcribing your answer…</p>
                <p className="mt-0.5 text-xs text-muted">
                  Reading back exactly what you said.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold">
                  {disabled ? "The interviewer is thinking…" : "Tap to answer"}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Speak like you would in the room. We measure your pace, fillers
                  and hesitation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {voice.error && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-bad/30 bg-bad/5 px-3 py-2 text-sm text-bad"
        >
          {voice.error}
        </p>
      )}

      <button
        onClick={() => setTyping(true)}
        disabled={voice.recording || voice.transcribing}
        className="mt-2 flex items-center gap-1.5 px-1 text-xs text-faint transition-colors hover:text-ink disabled:opacity-40"
      >
        <Keyboard className="h-3 w-3" /> Type instead (no delivery coaching)
      </button>
    </div>
  );
}
