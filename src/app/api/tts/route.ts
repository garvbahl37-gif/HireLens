import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { enforce } from "@/lib/ratelimit";

export const runtime = "nodejs";

const bodySchema = z.object({
  // A single interview question — bounded so a caller can't run down the
  // ElevenLabs quota with long text.
  text: z.string().trim().min(1).max(600),
});

// Sarah — "mature, reassuring, confident". A believable interviewer.
const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL";

// v4 Turbo: ElevenLabs' current generation, with natural breath, pacing and
// intonation, at conversational speed. Rendering the same question it took
// ~1.1s, against 3.0s for v4 and 4.1s for multilingual v2 — and in a live
// interview a pause that long before every question reads as the app hanging.
// (All transcribed back word-perfect, so clarity didn't separate them.) The
// app previously ran on Flash v2.5, which is fast but noticeably flatter.
// Override with ELEVENLABS_MODEL_ID.
const DEFAULT_MODEL = "eleven_v4_turbo";

/**
 * Speak an interviewer question with ElevenLabs, returning MP3 audio.
 *
 * Returns 501 when no key is configured, which is the client's signal to fall
 * back to the browser's built-in speech — so the interviewer always has a
 * voice, and a good one when the key (and quota) are available.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // ElevenLabs bills per character. Auth alone is not a budget.
  const limited = await enforce(req, "tts", user.id);
  if (limited) return limited;

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Server voice not configured" },
      { status: 501 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid text" }, { status: 400 });
  }

  const voice = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;

  try {
    const el = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: parsed.data.text,
          model_id: process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL,
          voice_settings: {
            // Mid stability keeps a natural, varied delivery without the
            // voice wandering between takes; a little style adds warmth.
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.15,
            // Sharpens presence and clarity — the "crisp" in a studio voice.
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!el.ok) {
      // Quota exhausted, bad key, etc. Tell the client to fall back rather than
      // surfacing an error — the interview must not stall on a voice failure.
      const detail = await el.text().catch(() => "");
      console.warn(`[tts] ElevenLabs ${el.status}: ${detail.slice(0, 200)}`);
      return NextResponse.json(
        { error: "Voice service unavailable" },
        { status: 502 }
      );
    }

    const audio = await el.arrayBuffer();
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[tts] request failed:", err);
    return NextResponse.json(
      { error: "Voice service unavailable" },
      { status: 502 }
    );
  }
}
