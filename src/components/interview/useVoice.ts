"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Delivery,
  PAUSE_THRESHOLD_SEC,
  computeDelivery,
} from "@/lib/speech-metrics";
import { stopSpeaking } from "@/lib/tts";

/**
 * Voice answers, recorded locally and transcribed server-side (Groq Whisper).
 *
 * This replaces the browser Web Speech API, which shipped audio to a Google
 * service that failed constantly ("Speech recognition lost its connection")
 * and doesn't exist in Firefox at all. Here we:
 *   - capture the mic with MediaRecorder (works in every modern browser),
 *   - meter the audio live for the waveform, the elapsed timer, silence-based
 *     auto-stop, and the pause measurements the report uses,
 *   - and on stop, POST the recording to /api/transcribe for a reliable,
 *     deterministic transcript.
 *
 * There is no "network" failure mode from the recognizer anymore — the only
 * network call is our own transcription request, which fails loudly with a
 * ret/­type fallback rather than silently killing the mic.
 */

/** Below this RMS the mic is considered silent. */
const SILENCE_RMS = 0.012;
/** Stop after this much continuous silence, once they've actually spoken. */
const AUTO_STOP_SILENCE_SEC = 6.0;

export type VoiceState = {
  status: "idle" | "recording" | "transcribing";
  /** Bars for the waveform, newest last, 0-1. */
  levels: number[];
  elapsedSec: number;
  /** Continuous silence right now, in seconds. Drives the auto-stop ring. */
  silenceSec: number;
  error: string | null;
};

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  // Whisper accepts webm/ogg/mp4; pick whatever this browser records natively.
  for (const t of [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export function useVoice(opts: {
  onFinish: (answer: string, delivery: Delivery) => void;
  autoStop?: boolean;
}) {
  const [state, setState] = useState<VoiceState>({
    status: "idle",
    levels: [],
    elapsedSec: 0,
    silenceSec: 0,
    error: null,
  });

  const stream = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const raf = useRef<number | null>(null);
  const mimeType = useRef("");

  const startedAt = useRef(0);
  const pauses = useRef<number[]>([]);
  const silenceStart = useRef<number | null>(null);
  const spoke = useRef(false);
  const stopping = useRef(false);
  const mounted = useRef(true);

  const onFinishRef = useRef(opts.onFinish);
  const autoStopRef = useRef(opts.autoStop);
  useEffect(() => {
    onFinishRef.current = opts.onFinish;
    autoStopRef.current = opts.autoStop;
  }, [opts.onFinish, opts.autoStop]);

  const teardownAudio = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopping.current = true;
      try {
        recorder.current?.stop();
      } catch {
        /* already stopped */
      }
      teardownAudio();
    };
  }, [teardownAudio]);

  /**
   * Assemble the recording, transcribe it, and hand back the answer + metrics.
   * Called from the recorder's onstop, so all chunks are guaranteed present.
   */
  const finalize = useCallback(async (durationSec: number) => {
    const blob = new Blob(chunks.current, {
      type: mimeType.current || "audio/webm",
    });
    chunks.current = [];

    if (blob.size < 1200) {
      // Effectively nothing was recorded.
      if (mounted.current) {
        setState((s) => ({
          ...s,
          status: "idle",
          silenceSec: 0,
          error:
            "We didn't catch any audio. Check your microphone, or type your answer instead.",
        }));
      }
      return;
    }

    if (mounted.current) setState((s) => ({ ...s, status: "transcribing" }));

    try {
      const ext = mimeType.current.includes("mp4") ? "mp4" : "webm";
      const fd = new FormData();
      fd.append("audio", blob, `answer.${ext}`);

      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));

      if (!mounted.current) return;

      if (!res.ok || !data.text) {
        setState((s) => ({
          ...s,
          status: "idle",
          error:
            data.error ??
            "Couldn't transcribe that. Try again, or type your answer.",
        }));
        return;
      }

      const transcript = String(data.text).trim();
      if (!transcript) {
        setState((s) => ({
          ...s,
          status: "idle",
          error:
            "We couldn't make out any words. Speak a little louder, or type your answer.",
        }));
        return;
      }

      setState((s) => ({ ...s, status: "idle", silenceSec: 0 }));
      onFinishRef.current(
        transcript,
        computeDelivery({ transcript, durationSec, pauses: pauses.current })
      );
    } catch {
      if (mounted.current) {
        setState((s) => ({
          ...s,
          status: "idle",
          error: "Network error while transcribing. Try again, or type instead.",
        }));
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (stopping.current) return;
    stopping.current = true;

    const durationSec = (performance.now() - startedAt.current) / 1000;

    // Close an open trailing silence as a pause — but only if it's a genuine
    // mid-answer hesitation, not the ending silence that triggered auto-stop.
    if (silenceStart.current !== null) {
      const held = (performance.now() - silenceStart.current) / 1000;
      if (held >= PAUSE_THRESHOLD_SEC && held < AUTO_STOP_SILENCE_SEC - 0.5) {
        pauses.current.push(held);
      }
    }

    teardownAudio();

    // The recorder's onstop fires finalize() with everything captured.
    try {
      if (recorder.current && recorder.current.state !== "inactive") {
        // Stash duration for onstop.
        (recorder.current as MediaRecorder & { _dur?: number })._dur =
          durationSec;
        recorder.current.stop();
      } else {
        void finalize(durationSec);
      }
    } catch {
      void finalize(durationSec);
    }
  }, [finalize, teardownAudio]);

  const start = useCallback(async () => {
    // Silence the interviewer the instant the candidate starts answering.
    stopSpeaking();

    if (typeof MediaRecorder === "undefined") {
      setState((s) => ({
        ...s,
        error: "This browser can't record audio. Type your answer instead.",
      }));
      return;
    }

    stopping.current = false;
    pauses.current = [];
    silenceStart.current = null;
    spoke.current = false;
    chunks.current = [];
    startedAt.current = performance.now();

    setState({
      status: "recording",
      levels: [],
      elapsedSec: 0,
      silenceSec: 0,
      error: null,
    });

    let s: MediaStream;
    try {
      s = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState((st) => ({
        ...st,
        status: "idle",
        error:
          "Microphone blocked. Allow access in the address bar, or type your answer.",
      }));
      return;
    }
    stream.current = s;

    /* ---- metering: waveform, silence, pauses ---- */
    const ctx = new AudioContext();
    audioCtx.current = ctx;
    const src = ctx.createMediaStreamSource(s);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      const now = performance.now();

      if (rms < SILENCE_RMS) {
        if (silenceStart.current === null) silenceStart.current = now;
      } else {
        spoke.current = true;
        if (silenceStart.current !== null) {
          const held = (now - silenceStart.current) / 1000;
          if (held >= PAUSE_THRESHOLD_SEC) pauses.current.push(held);
          silenceStart.current = null;
        }
      }

      const silenceSec =
        silenceStart.current === null
          ? 0
          : (now - silenceStart.current) / 1000;

      setState((prev) => ({
        ...prev,
        levels: [...prev.levels.slice(-47), Math.min(1, rms * 6)],
        elapsedSec: (now - startedAt.current) / 1000,
        silenceSec,
      }));

      if (
        autoStopRef.current !== false &&
        spoke.current &&
        silenceSec >= AUTO_STOP_SILENCE_SEC
      ) {
        stop();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    /* ---- recording ---- */
    const mt = pickMimeType();
    mimeType.current = mt;
    const rec = mt ? new MediaRecorder(s, { mimeType: mt }) : new MediaRecorder(s);
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    rec.onstop = () => {
      const dur =
        (rec as MediaRecorder & { _dur?: number })._dur ??
        (performance.now() - startedAt.current) / 1000;
      void finalize(dur);
    };
    recorder.current = rec;
    rec.start();
  }, [finalize, stop]);

  return {
    ...state,
    recording: state.status === "recording",
    transcribing: state.status === "transcribing",
    start,
    stop,
    supported:
      typeof window !== "undefined" && typeof MediaRecorder !== "undefined",
  };
}
