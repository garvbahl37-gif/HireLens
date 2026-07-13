import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { endSession, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().trim().min(1, "Name can't be empty").max(80),
});

/** Rename the account. */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid name" },
      { status: 400 }
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name },
  });

  return NextResponse.json({ ok: true, name: parsed.data.name });
}

const deleteSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

/**
 * Delete the account and everything in it. Reviews cascade (see the schema's
 * onDelete: Cascade), and the session cookie is cleared here — otherwise the
 * browser would keep a token whose user no longer exists.
 */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your password to confirm." },
      { status: 400 }
    );
  }

  // Deleting an account is irreversible — re-authenticate first.
  const fresh = await db.user.findUnique({ where: { id: user.id } });
  if (!fresh) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  const ok = await bcrypt.compare(parsed.data.password, fresh.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "That password is wrong." }, { status: 403 });
  }

  await db.user.delete({ where: { id: user.id } });
  await endSession();

  return NextResponse.json({ ok: true });
}
