import { NextRequest, NextResponse } from "next/server";
import { endSession } from "@/lib/auth";

export async function POST() {
  await endSession();
  return NextResponse.json({ ok: true });
}

/**
 * GET variant so a stale session (valid JWT, missing user row) can be
 * cleared via a plain redirect from a Server Component without a fetch.
 * Clears the cookie, then sends the browser to /login.
 */
export async function GET(req: NextRequest) {
  await endSession();
  return NextResponse.redirect(new URL("/login", req.url));
}
