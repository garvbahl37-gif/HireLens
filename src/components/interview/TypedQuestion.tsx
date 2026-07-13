"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { speak, speechSupported } from "@/lib/tts";

/** Reveal speed when we can't sync to a real voice. */
const CHAR_MS = 26;
/** If the voice hasn't reported a word boundary by now, it isn't going to.
 *  Generous, because Chrome can take a few hundred ms to actually start. */
const BOUNDARY_GRACE_MS = 2800;

/**
 * The question types itself out as the interviewer says it.
 *
 * Where the browser reports word boundaries (Chrome, Edge, Safari), the text is
 * revealed in lockstep with the voice — words land on screen exactly as they're
 * spoken. Everywhere else it types on a timer.
 *
 * The subtle part is what "the voice finished" means. A speech engine with no
 * usable voice fires `onend` almost immediately without ever speaking, and
 * treating that as "done" snaps the whole question on screen at once — so the
 * one case where you CAN'T hear it is also the case where you don't get the
 * typewriter either. So: `onend` only completes the reveal if at least one word
 * boundary actually arrived. If none did, the voice never really spoke, and we
 * type it out instead.
 */
export function TypedQuestion({
  text,
  speakIt,
  onSpeakingChange,
}: {
  text: string;
  /** Say it out loud as well as type it. */
  speakIt: boolean;
  /** Reports when the voice starts and stops, so the orb can react. */
  onSpeakingChange?: (speaking: boolean) => void;
}) {
  const [shown, setShown] = useState(0);

  const timer = useRef<number | null>(null);
  const cancelled = useRef(false);

  // Latest callback without making the reveal effect depend on it (which would
  // re-run — and re-speak — on every parent render).
  const speakingRef = useRef(onSpeakingChange);
  useEffect(() => {
    speakingRef.current = onSpeakingChange;
  }, [onSpeakingChange]);

  useEffect(() => {
    cancelled.current = false;

    let gotBoundary = false;
    let started = false;
    let timedRunning = false;

    const startTimed = () => {
      if (timedRunning || cancelled.current) return;
      timedRunning = true;

      let i = 0;
      const tick = () => {
        if (cancelled.current) return;
        i += 1;
        setShown(i);
        if (i < text.length) timer.current = window.setTimeout(tick, CHAR_MS);
      };
      // Always scheduled, never called synchronously — a setState during an
      // effect triggers a cascading render.
      timer.current = window.setTimeout(tick, CHAR_MS);
    };

    if (speakIt && speechSupported()) {
      speak(text, true, {
        // The voice actually began. Cancel the fallback — real boundaries will
        // drive the reveal now. This is what lets the ElevenLabs fetch take a
        // second or two without the timed typewriter racing ahead of it.
        onStart: () => {
          started = true;
          speakingRef.current?.(true);
        },
        onBoundary: (charIndex) => {
          if (cancelled.current) return;
          gotBoundary = true;

          // The voice is the source of truth. If the fallback typewriter had
          // already started (the engine was slow to warm up), stop it dead —
          // otherwise both drive the text and it visibly stutters and jumps.
          if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
          }
          timedRunning = false;

          // Reveal through the END of the word being spoken, so the word you
          // hear is the word you can read — not the one before it.
          let end = charIndex;
          while (end < text.length && !/\s/.test(text[end])) end += 1;

          // Never run backwards: boundaries can arrive slightly out of order.
          setShown((prev) => Math.max(prev, Math.min(text.length, end)));
        },
        onEnd: () => {
          speakingRef.current?.(false);
          if (cancelled.current) return;
          if (gotBoundary || started) {
            setShown(text.length); // the voice really spoke it — land it
          } else {
            startTimed(); // it never spoke; don't let the text snap into place
          }
        },
      });

      // If NOTHING has started by now — no audio, no browser speech — type it
      // out on a timer rather than leaving the bubble empty. Long enough to let
      // the ElevenLabs fetch (~1-2s) begin before we give up on it.
      const grace = window.setTimeout(() => {
        if (!started && !gotBoundary) startTimed();
      }, BOUNDARY_GRACE_MS);

      return () => {
        // Don't stop the voice here. In React StrictMode (dev) this effect
        // mounts, unmounts and remounts, and stopping on that phantom unmount
        // would discard the in-flight audio fetch and leave the question
        // silent. The voice is stopped where it actually should be: by the next
        // question's speak(), by starting a recording, or by the room unmount.
        cancelled.current = true;
        clearTimeout(grace);
        if (timer.current) clearTimeout(timer.current);
        speakingRef.current?.(false);
      };
    }

    startTimed();
    return () => {
      cancelled.current = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [text, speakIt]);

  const typing = shown < text.length;

  return (
    <span>
      <span aria-hidden>{text.slice(0, shown)}</span>
      {typing && (
        <motion.span
          aria-hidden
          className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-accent align-middle"
          animate={{ opacity: [1, 0.15, 1] }}
          transition={{ duration: 0.9, repeat: Infinity }}
        />
      )}
      {/* Screen readers get the whole question at once — they shouldn't have to
          sit through a decorative typewriter to find out what was asked. */}
      <span className="sr-only">{text}</span>
    </span>
  );
}
