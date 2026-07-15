"use client";

/**
 * Route-level error boundary. Catches a throw in any server or client component
 * below the root and renders something that still looks like the product,
 * instead of Next's raw white default. There was no boundary in the app at all
 * before this, so an unhandled throw on any page fell through to the framework.
 */
import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home } from "lucide-react";

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

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="card max-w-md p-8 text-center">
        <h1 className="text-lg font-bold">Something broke on our end</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          That wasn&rsquo;t you. The page hit an error we didn&rsquo;t expect.
          Try again — if it keeps happening, it&rsquo;s on our side to fix.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-faint">
            ref {error.digest}
          </p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="btn btn-primary">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
          <Link href="/dashboard" className="btn btn-ghost">
            <Home className="h-4 w-4" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
