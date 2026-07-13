import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  // A single interview question — bounded so a caller can't run down the
  // ElevenLabs quota with long text.
  text: z.string().trim().min(1).max(600),
});

// Sarah — "mature, reassuring, confident". A believable interviewer.
const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL";

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
          // Flash: lowest latency, right for a back-and-forth interview.
          model_id: "eleven_flash_v2_5",
          voice_settings: { stability: 0.4, similarity_boost: 0.75 },
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
