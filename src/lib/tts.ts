"use client";

/**
 * The interviewer's voice.
 *
 * Preference order, most to least reliable/pleasant:
 *   1. ElevenLabs (server) — a real, consistent studio voice, same on every
 *      machine. Fetched as MP3 and played through an <audio> element; the
 *      typewriter is synced to playback position so text lands as it's spoken.
 *   2. The browser's built-in speech — used automatically when ElevenLabs
 *      isn't configured, is out of quota, or the fetch fails. Quality varies by
 *      OS, but it always exists.
 *
 * Callers see one interface — `speak(text, enabled, handlers)` with per-word
 * `onBoundary` and `onEnd` — regardless of which engine runs, so the typewriter
 * component doesn't care which voice is speaking.
 */

let generation = 0;
let currentAudio: HTMLAudioElement | null = null;

// Once we learn the server has no voice configured (501), stop trying — every
// question would otherwise pay a pointless round-trip before falling back.
let serverVoiceDisabled = false;

/* ------------------------------------------------------------------ */
/* Priming                                                             */
/* ------------------------------------------------------------------ */

/**
 * Call from inside a real user gesture (the click that starts the interview).
 * Unlocks BOTH audio paths: a silent utterance for speechSynthesis, and a
 * muted <audio> play so ElevenLabs playback isn't blocked by autoplay policy.
 */
export function primeSpeech() {
  if (typeof window === "undefined") return;
  try {
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
      window.speechSynthesis.getVoices();
    }
    // A 1-sample silent WAV, played muted, to satisfy the autoplay gate.
    const a = new Audio(
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA="
    );
    a.muted = true;
    void a.play().catch(() => {});
  } catch {
    /* fine — we fall back to whatever works */
  }
}

/* ------------------------------------------------------------------ */
/* Browser speech (fallback)                                          */
/* ------------------------------------------------------------------ */

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(
      (v) =>
        /en-US/i.test(v.lang) &&
        /natural|premium|samantha|google|aria|jenny/i.test(v.name)
    ) ??
    voices.find((v) => /en-US/i.test(v.lang)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    null
  );
}

export type SpeakHandlers = {
  /** How far through the text the voice currently is, in characters. Drives
   *  the on-screen typewriter so text lands as it's spoken. */
  onBoundary?: (charIndex: number) => void;
  onStart?: () => void;
  onEnd?: () => void;
};

function browserSpeak(text: string, mine: number, handlers: SpeakHandlers) {
  const synth = window.speechSynthesis;
  if (!synth) {
    handlers.onEnd?.();
    return;
  }

  const utter = () => {
    if (mine !== generation) {
      handlers.onEnd?.();
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    const v = pickVoice();
    if (v) u.voice = v;
    u.onstart = () => handlers.onStart?.();
    u.onboundary = (e) => {
      if (mine === generation) handlers.onBoundary?.(e.charIndex);
    };
    u.onend = () => handlers.onEnd?.();
    u.onerror = () => handlers.onEnd?.();
    synth.speak(u);
  };

  if (synth.getVoices().length === 0) {
    let fired = false;
    const once = () => {
      if (fired) return;
      fired = true;
      utter();
    };
    synth.addEventListener("voiceschanged", once, { once: true });
    setTimeout(once, 250);
    return;
  }
  utter();
}

/* ------------------------------------------------------------------ */
/* ElevenLabs (preferred), with fallback                              */
/* ------------------------------------------------------------------ */

async function serverSpeak(text: string, mine: number, handlers: SpeakHandlers) {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    // Superseded while we were fetching — a newer question already started.
    if (mine !== generation) return;

    if (res.status === 501) {
      serverVoiceDisabled = true; // no key; don't try again this session
      browserSpeak(text, mine, handlers);
      return;
    }
    if (!res.ok) {
      browserSpeak(text, mine, handlers);
      return;
    }

    const blob = await res.blob();
    if (mine !== generation) return;

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;

    const cleanup = () => URL.revokeObjectURL(url);

    audio.onplay = () => handlers.onStart?.();
    audio.ontimeupdate = () => {
      if (mine !== generation || !audio.duration) return;
      handlers.onBoundary?.(
        Math.floor((audio.currentTime / audio.duration) * text.length)
      );
    };
    audio.onended = () => {
      if (mine === generation) {
        handlers.onBoundary?.(text.length);
        handlers.onEnd?.();
      }
      cleanup();
    };
    audio.onerror = () => {
      cleanup();
      // Fall back to the browser voice if playback itself fails.
      if (mine === generation) browserSpeak(text, mine, handlers);
    };

    await audio.play().catch(() => {
      // Autoplay blocked despite priming — fall back.
      cleanup();
      if (mine === generation) browserSpeak(text, mine, handlers);
    });
  } catch {
    if (mine === generation) browserSpeak(text, mine, handlers);
  }
}

/* ------------------------------------------------------------------ */
/* Public interface                                                   */
/* ------------------------------------------------------------------ */

export function speak(
  text: string,
  enabled = true,
  handlers: SpeakHandlers = {}
) {
  if (!enabled || typeof window === "undefined") {
    handlers.onEnd?.();
    return;
  }

  // Each call gets a fresh identity. If a newer speak() or a stopSpeaking()
  // runs before this one's audio starts, the generation check discards it —
  // so only ever one voice is heard, and no duplicate can overlap. (No text
  // dedupe: it would swallow a legitimate re-speak after a spurious
  // StrictMode-dev stop, leaving the question silent.)
  const mine = ++generation;

  // Stop whatever is currently talking before starting the new line.
  stopCurrentAudio();
  window.speechSynthesis?.cancel();

  if (serverVoiceDisabled) {
    browserSpeak(text, mine, handlers);
  } else {
    void serverSpeak(text, mine, handlers);
  }
}

function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.onended = null;
    currentAudio.ontimeupdate = null;
    currentAudio.onerror = null;
    currentAudio = null;
  }
}

/** Stop any speech, and abandon any deferred/in-flight utterance. */
export function stopSpeaking() {
  generation += 1;
  stopCurrentAudio();
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

export function speechSupported(): boolean {
  // We always have at least one path: ElevenLabs, or the browser.
  return typeof window !== "undefined";
}
