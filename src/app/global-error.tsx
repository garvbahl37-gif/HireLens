"use client";

/**
 * Last-resort boundary for a throw in the ROOT layout itself, which the normal
 * error.tsx sits below and therefore cannot catch. It has to render its own
 * <html>/<body> because at this level there is no layout left to provide them.
 * Deliberately dependency-free and inline-styled: whatever broke may have taken
 * the stylesheet or a shared component with it.
 */
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#100c0a",
          color: "#f7f1ea",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
            Something broke on our end
          </h1>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "#b6a597",
            }}
          >
            The app hit an unexpected error. Reloading usually clears it.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.6rem 1.15rem",
              borderRadius: "0.65rem",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
              background: "#f2622e",
              color: "#100c0a",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
