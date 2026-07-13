/**
 * The loading screen — pure CSS, no client JavaScript.
 *
 * This renders as a Suspense fallback and is streamed during SSR, so it must
 * animate WITHOUT hydration. Framer-motion would leave the lens stuck in its
 * hidden state until JS ran (which for a fallback is often never), showing
 * only the ambient bloom — a bare orange circle. Every animation here is a CSS
 * keyframe (see globals.css, the `ldr-*` classes), so the full lens assembles
 * from the first painted frame.
 *
 * Deliberately NOT a client component: it has no interactivity, and keeping it
 * server-rendered means it appears instantly with the streamed HTML.
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
      className={
        fullscreen
          ? "grain fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg"
          : "grain relative flex min-h-[60vh] flex-1 flex-col items-center justify-center"
      }
    >
      {/* ambient bloom, breathing */}
      <div
        aria-hidden
        className="ldr-bloom pointer-events-none absolute h-[440px] w-[440px] rounded-full blur-[100px]"
        style={{
          background:
            "radial-gradient(closest-side, var(--color-accent), transparent 70%)",
        }}
      />

      {/* the lens, assembling itself */}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className="relative h-24 w-24"
        role="img"
        aria-label="Loading"
      >
        <defs>
          <linearGradient id="ldr-grad" x1="6" y1="4" x2="30" y2="34">
            <stop offset="0%" stopColor="#ffb877" />
            <stop offset="28%" stopColor="#f2622e" />
            <stop offset="100%" stopColor="#e04a1c" />
          </linearGradient>
          <radialGradient id="ldr-glass" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ff9a4f" stopOpacity="0.4" />
            <stop offset="55%" stopColor="#f2622e" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#100c0a" stopOpacity="0.6" />
          </radialGradient>
          <clipPath id="ldr-clip">
            <circle cx="17" cy="17" r="11.5" />
          </clipPath>
        </defs>

        {/* handle */}
        <path
          className="ldr-handle"
          d="M26.5 26.5 L35 35"
          stroke="url(#ldr-grad)"
          strokeWidth="3.4"
          strokeLinecap="round"
        />

        {/* glass */}
        <circle className="ldr-disc" cx="17" cy="17" r="11.5" fill="url(#ldr-glass)" />

        {/* the score bars the lens reveals, + a beam sweeping them */}
        <g clipPath="url(#ldr-clip)">
          <rect className="ldr-bar ldr-bar-1" x="12" y="11" width="2.4" height="12" rx="1.2" fill="url(#ldr-grad)" />
          <rect className="ldr-bar ldr-bar-2" x="15.6" y="14.5" width="2.4" height="8.5" rx="1.2" fill="url(#ldr-grad)" />
          <rect className="ldr-bar ldr-bar-3" x="19.2" y="18" width="2.4" height="5" rx="1.2" fill="url(#ldr-grad)" />
          <rect className="ldr-beam" x="4" width="26" height="5" fill="#fff" opacity="0.16" />
        </g>

        {/* aperture rim */}
        <circle
          className="ldr-rim"
          cx="17"
          cy="17"
          r="11.5"
          stroke="url(#ldr-grad)"
          strokeWidth="2.8"
          strokeLinecap="round"
          pathLength={92}
        />
      </svg>

      {/* wordmark */}
      <p className="relative mt-7 text-2xl font-extrabold tracking-tight">
        Hire<span className="text-gradient">Lens</span>
      </p>

      {/* the hairline that fills */}
      <div className="relative mt-5 h-px w-44 overflow-hidden rounded-full bg-edge">
        <span className="ldr-track" />
      </div>

      <p className="ldr-label relative mt-4 text-xs font-medium tracking-wide text-faint">
        {label}
      </p>
    </div>
  );
}
