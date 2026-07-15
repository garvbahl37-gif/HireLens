import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Route protection (Next 16 proxy, formerly middleware).
 * DB-free by design — verifies the signed session JWT only; pages and
 * API routes re-check against the database for defense in depth.
 */
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  // Signature only. The token's tokenVersion can't be checked here — that needs
  // the user row, and this runs at the edge. getCurrentUser()/requireUser() do
  // the revocation check, which is the layer that actually gates data.
  const claims = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith("/dashboard") && !claims) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if ((pathname === "/login" || pathname === "/signup") && claims) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
