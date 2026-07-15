import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Password-reset tokens.
 *
 * Only the SHA-256 of the token is ever stored. A database leak must not hand
 * the attacker a working reset link for every account in the table — which is
 * exactly what storing the raw token would do. The plaintext exists only in the
 * email and in the URL the user clicks.
 *
 * SHA-256 rather than bcrypt: the token is 32 bytes of CSPRNG output, so it has
 * no entropy problem for a work factor to compensate for, and the lookup has to
 * be an indexed equality search on the hash. (A bcrypt hash is salted and
 * therefore not searchable, which is the whole reason password tables are looked
 * up by email and not by hash.)
 */

const TTL_MS = 60 * 60 * 1000; // one hour

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Mint a single-use reset token. Returns the plaintext — the only time it exists. */
export async function issueResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");

  // One live reset at a time. Without this, every "I didn't get the email"
  // retry leaves another working key to the account lying around.
  await db.verificationToken.deleteMany({
    where: { userId, type: "RESET", usedAt: null },
  });

  await db.verificationToken.create({
    data: {
      userId,
      type: "RESET",
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });

  return token;
}

/**
 * Spend a reset token: verify, mark used, and return the user it belongs to.
 *
 * Single-use is enforced by a conditional UPDATE (`usedAt: null` in the where
 * clause), not by read-then-write. Two clicks on the same link land in the same
 * millisecond often enough — via an email client's link prefetcher — that the
 * check-then-act version genuinely double-spends.
 */
export async function consumeResetToken(
  token: string
): Promise<{ userId: string } | null> {
  const tokenHash = hash(token);

  const row = await db.verificationToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true, type: true },
  });

  if (!row || row.type !== "RESET" || row.usedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;

  // Constant-time compare on the hashes. Belt and braces — the lookup above is
  // already an exact match — but it costs one line and keeps the comparison out
  // of the class of things that leak a prefix through timing.
  const a = Buffer.from(tokenHash, "hex");
  const b = Buffer.from(hash(token), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const spent = await db.verificationToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  // Someone else spent it between the read and the write.
  if (spent.count !== 1) return null;

  return { userId: row.userId };
}
