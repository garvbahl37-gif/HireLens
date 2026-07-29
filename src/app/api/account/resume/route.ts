import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  resumeText: z.string().trim().min(100, "That resume looks too short.").max(30_000),
  resumeName: z.string().trim().max(160).optional(),
});

/** Set the primary resume the Chrome extension scores jobs against. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid resume" },
      { status: 400 }
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      primaryResumeText: parsed.data.resumeText,
      primaryResumeName: parsed.data.resumeName || "Pasted resume",
    },
  });

  return NextResponse.json({ ok: true });
}

/** Clear the primary resume. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  await db.user.update({
    where: { id: user.id },
    data: { primaryResumeText: null, primaryResumeName: null },
  });
  return NextResponse.json({ ok: true });
}
