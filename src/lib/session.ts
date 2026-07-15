/**
 * Stateless session tokens (JWT, HS256) stored in an httpOnly cookie.
 * Edge-safe: imported by proxy.ts, so nothing database-flavoured here.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "hl_session";

/** 30 days — sessions survive reloads and browser restarts. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * `tokenVersion` is stamped into the token as `v`.
 *
 * A stateless 30-day JWT cannot be revoked — which meant changing your password
 * did NOT evict the stolen session it exists to evict. The attacker's cookie
 * kept working for a month. Carrying the version the token was minted with, and
 * comparing it against the user row at read time, makes every outstanding token
 * invalid the moment that column is bumped. It costs nothing: the user row is
 * already fetched on every authenticated request.
 *
 * The comparison happens in getCurrentUser()/requireUser(), not here, because
 * this module is imported by the edge proxy and must stay database-free.
 */
export async function createSessionToken(
  userId: string,
  tokenVersion: number
): Promise<string> {
  return new SignJWT({ v: tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export type SessionClaims = { userId: string; tokenVersion: number };

/** Returns the claims, or null for a missing/expired/tampered token. */
export async function verifySessionToken(
  token: string
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      // Tokens minted before `v` existed are version 0, which is the default on
      // every existing user row — so they stay valid rather than logging the
      // whole userbase out on deploy.
      tokenVersion: typeof payload.v === "number" ? payload.v : 0,
    };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};
