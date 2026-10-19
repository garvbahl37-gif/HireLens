/**
 * The loading state, after the reference's own: the green orb alone in an
 * empty panel, breathing, with a line of text that shimmers like the
 * reference's "Thinking, please wait…".
 *
 * Pure CSS (the .orb and .shimmer-text classes in globals.css), because this
 * renders as a Suspense fallback during streaming — before React hydrates —
 * and must animate from the very first frame the browser paints.
 */
export function Loader({
  label = "Reading the room",
  fullscreen = true,
}: {
  label?: string;
  fullscreen?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        fullscreen
          ? "fixed inset-0 z-[60] flex items-center justify-center bg-bg"
          : "flex min-h-[60vh] flex-1 items-center justify-center"
      }
    >
      {fullscreen && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_100%,rgba(82,188,79,0.28),transparent_70%),radial-gradient(40%_35%_at_50%_45%,rgba(255,255,255,0.8),transparent_70%)]"
        />
      )}

      <div className="loader-in relative flex flex-col items-center">
        <div className="orb h-24 w-24" aria-hidden />
        <p className="shimmer-text mt-9 text-sm font-medium tracking-wide">
          {label}…
        </p>
      </div>
    </div>
  );
}
