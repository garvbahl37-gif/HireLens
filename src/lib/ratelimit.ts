import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Fixed-window rate limiting, backed by Postgres.
 *
 * The whole take-a-slot operation is ONE statement. The obvious version --
 * read the row, decide whether the window expired, then write -- is a
 * check-then-act, and two concurrent requests both read the stale window and
 * both reset it to 1. That is not a rate limiter, it is a rate suggestion.
 *
 * So the window advance and the increment happen inside a single atomic
 * `INSERT ... ON CONFLICT DO UPDATE`, whose SET clause reads the row's own
 * committed value under the row lock the upsert already holds:
 *
 *   count = CASE WHEN <window expired> THEN 1 ELSE RateLimit.count + 1 END
 *
 * The returned count is therefore the caller's true position in the window,
 * and only the request that actually receives count <= limit is allowed
 * through.
 */
export type RateLimitResult = {
  ok: boolean;
  /** How many requests remain in the current window. */
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
};

export async function take(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const rows = await db.$queryRaw<
    Array<{ count: number; window_start: Date }>
  >`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."windowStart" < NOW() - (${windowSec} * INTERVAL '1 second')
        THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimit"."windowStart" < NOW() - (${windowSec} * INTERVAL '1 second')
        THEN NOW()
        ELSE "RateLimit"."windowStart"
      END
    RETURNING "count", "windowStart" AS window_start
  `;

  const row = rows[0];
  // A limiter that fails closed takes the whole site down with the database
  // it depends on. If the counter is unreadable, let the request through --
  // auth and the plan gates are still in front of everything that matters.
  if (!row) return { ok: true, remaining: limit, retryAfter: 0 };

  const elapsed = (Date.now() - row.window_start.getTime()) / 1000;
  return {
    ok: row.count <= limit,
    remaining: Math.max(0, limit - row.count),
    retryAfter: Math.max(1, Math.ceil(windowSec - elapsed)),
  };
}

/**
 * The caller's identity for limiting purposes.
 *
 * A user id when we have one -- it survives IP rotation, which is the whole
 * point for the expensive authenticated routes. Otherwise the IP, salted and
 * hashed so the table is not a log of who visited.
 */
export function callerKey(
  req: NextRequest,
  bucket: string,
  userId?: string | null
): string {
  if (userId) return `${bucket}:u:${userId}`;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const salt = process.env.RATE_SALT ?? process.env.AUTH_SECRET ?? "hirelens";
  const hash = createHash("sha256").update(`${salt}:${ip}`).digest("hex");
  return `${bucket}:i:${hash.slice(0, 32)}`;
}

/** Per-bucket budgets. Tuned to be invisible to a human and fatal to a script. */
export const LIMITS = {
  /** Credential stuffing, and bcrypt-per-request is a cheap CPU DoS. */
  login: { limit: 10, windowSec: 15 * 60 },
  signup: { limit: 5, windowSec: 60 * 60 },
  /** Password-reset mail: an unbounded one is a free spam cannon aimed at a stranger. */
  forgot: { limit: 5, windowSec: 60 * 60 },
  /** ElevenLabs is billed per character. */
  tts: { limit: 60, windowSec: 10 * 60 },
  /** Whisper is billed per second of audio. */
  transcribe: { limit: 40, windowSec: 10 * 60 },
  /** Backstop behind the monthly plan quota -- this one bounds the burst. */
  analysis: { limit: 20, windowSec: 10 * 60 },
} as const;

/**
 * Enforce a bucket. Returns a 429 to return, or null to proceed.
 *
 *   const limited = await enforce(req, "tts", user.id);
 *   if (limited) return limited;
 */
export async function enforce(
  req: NextRequest,
  bucket: keyof typeof LIMITS,
  userId?: string | null
): Promise<NextResponse | null> {
  const { limit, windowSec } = LIMITS[bucket];
  const result = await take(callerKey(req, bucket, userId), limit, windowSec);
  if (result.ok) return null;

  return NextResponse.json(
    {
      error: "Too many requests. Give it a minute and try again.",
      code: "RATE_LIMITED",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
