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
  const userId = await verifySessionToken(token);
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId } });
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

  const userId = await verifySessionToken(token);
  if (!userId) redirect("/api/auth/logout");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/api/auth/logout");
  return user;
}

export async function startSession(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(userId), sessionCookieOptions);
}

export async function endSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}
