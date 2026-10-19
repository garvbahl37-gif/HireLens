"use client";

/**
 * Route-level error boundary. Catches a throw in any server or client component
 * below the root and renders something that still looks like the product,
 * instead of Next's raw white default. There was no boundary in the app at all
 * before this, so an unhandled throw on any page fell through to the framework.
 */
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only handle onto the server-side stack, which is
    // scrubbed from the client for safety. Log it so a support report can be
    // matched to the real error.
    console.error("[error boundary]", error.digest ?? error.message);
  }, [error]);

  // The boundary sits above the dashboard layout, so it brings its own frame:
  // the same forest border and green canopy, with the message on glass.
  return (
    <div className="flex flex-1 bg-forest md:p-3">
      <div className="canopy flex min-h-dvh min-w-0 flex-1 flex-col overflow-clip md:min-h-[calc(100dvh-1.5rem)] md:rounded-[26px]">
        <header className="px-5 pt-5 md:px-8 md:pt-6">
          <Logo href="/dashboard" tone="light" />
        </header>
        <main className="flex flex-1 items-start justify-center px-4 pb-12 pt-10 md:items-center md:py-12">
          <div className="card w-full max-w-md p-6 text-center sm:p-9">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pill text-white">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">
              Something broke on our end
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              That wasn&rsquo;t you. The page hit an error we didn&rsquo;t expect.
              Try again — if it keeps happening, it&rsquo;s on our side to fix.
            </p>
            {error.digest && (
              <p className="mt-4 inline-block rounded-full border border-white/80 bg-white/50 px-3 py-1 font-mono text-xs text-muted">
                ref {error.digest}
              </p>
            )}
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button onClick={reset} className="btn btn-primary">
                <RefreshCw className="h-4 w-4" /> Try again
              </button>
              <Link href="/dashboard" className="btn btn-ghost">
                <Home className="h-4 w-4" /> Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
