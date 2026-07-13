import { NextRequest, NextResponse } from "next/server";
import { TranscriptionError, transcribeAudio } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// An interview answer is at most a couple of minutes of speech; anything much
// larger isn't a real answer and shouldn't be sent to the transcriber.
const MAX_BYTES = 20 * 1024 * 1024;

/** Transcribe a recorded interview answer. Auth-gated: transcription costs money. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected audio upload" }, { status: 400 });
  }

  const file = form.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No audio provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That recording is too long. Keep answers under a couple of minutes." },
      { status: 413 }
    );
  }

  try {
    const text = await transcribeAudio(file);
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof TranscriptionError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[transcribe] route error:", err);
    return NextResponse.json(
      { error: "Couldn't transcribe. Try again, or type your answer." },
      { status: 502 }
    );
  }
}
