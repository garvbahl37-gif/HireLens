import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { startSession } from "@/lib/auth";
import { enforce } from "@/lib/ratelimit";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// Compared against when the email doesn't exist, so both branches cost
// one bcrypt verify and can't be told apart by timing.
const DUMMY_HASH = bcrypt.hashSync("timing-equalizer", 10);

export async function POST(req: NextRequest) {
  // Before the bcrypt compare, not after: the hash is the expensive part, and
  // an unmetered one is both a credential-stuffing oracle and a CPU DoS.
  const limited = await enforce(req, "login");
  if (limited) return limited;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });

  const valid = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_HASH
  );

  if (!user || !valid) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  await startSession(user.id, user.tokenVersion);
  return NextResponse.json({ ok: true });
}
