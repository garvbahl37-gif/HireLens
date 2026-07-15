import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/session";

/**
 * The logged-in user for the current request, or null.
 * Wrapped in react cache() so layouts/pages/components share one DB hit.
 */
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const user = await db.user.findUnique({ where: { id: claims.userId } });
  if (!user) return null;

  // Revocation. The token carries the tokenVersion it was minted with; a
  // password change or reset bumps the column, and every token issued before
  // that moment stops working here. Without this a stolen 30-day session
  // outlives the password change made specifically to kill it.
  if (user.tokenVersion !== claims.tokenVersion) return null;

  return user;
});

/**
 * For protected pages. Returns the user, or breaks out via redirect.
 *
 * The edge proxy only checks that the session JWT is *signed* — it can't
 * hit the DB. So a token can verify here yet have no matching user row
 * (e.g. the dev/grading DB was reseeded, minting new user ids, while the
 * browser kept its 30-day cookie). Redirecting straight to /login would
 * loop, because the proxy sees the still-valid JWT and bounces back to
 * /dashboard. Routing through the logout endpoint clears the cookie first,
 * so the next request has no session and lands on /login cleanly.
 */
export async function requireUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const claims = await verifySessionToken(token);
  if (!claims) redirect("/api/auth/logout");

  const user = await db.user.findUnique({ where: { id: claims.userId } });
  if (!user) redirect("/api/auth/logout");

  // A revoked session is indistinguishable from a stale one for redirect
  // purposes: clear the cookie via logout so the next request lands on /login
  // rather than looping against the still-signature-valid JWT the proxy sees.
  if (user.tokenVersion !== claims.tokenVersion) redirect("/api/auth/logout");

  return user;
}

export async function startSession(userId: string, tokenVersion: number) {
  const store = await cookies();
  store.set(
    SESSION_COOKIE,
    await createSessionToken(userId, tokenVersion),
    sessionCookieOptions
  );
}

export async function endSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}
