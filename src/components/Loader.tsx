/**
 * The loading screen — pure CSS, no client JavaScript.
 *
 * This renders as a Suspense fallback and is streamed during SSR, so it must
 * animate WITHOUT hydration. Framer-motion would leave everything stuck in its
 * hidden state until JS ran (which for a fallback is often never). Every
 * animation here is a CSS keyframe (see globals.css, the `ldr-*` classes), so
 * the whole scene is cinematic from the first painted frame.
 *
 * Deliberately NOT a client component: it has no interactivity, and keeping it
 * server-rendered means it appears instantly with the streamed HTML.
 */

// Embers drifting up through the scene — fixed positions/delays so it's
// deterministic (no Math.random, which would also break SSR hydration).
const DUST = [
  { left: "12%", delay: "0s" },
  { left: "28%", delay: "1.4s" },
  { left: "44%", delay: "2.6s" },
  { left: "58%", delay: "0.7s" },
  { left: "72%", delay: "3.1s" },
  { left: "86%", delay: "1.9s" },
];

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
          ? "grain fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-bg"
          : "grain relative flex min-h-[60vh] flex-1 flex-col items-center justify-center overflow-hidden"
      }
    >
      {/* warm ambient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 48% at 50% 42%, rgba(242,98,46,0.13), transparent 72%), radial-gradient(40% 30% at 50% 42%, rgba(255,154,79,0.08), transparent 70%)",
        }}
      />
      {/* filmic vignette to pull the eye to centre */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 90% at 50% 48%, transparent 52%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* drifting embers */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[360px] -translate-x-1/2 -translate-y-1/2"
      >
        {DUST.map((d, i) => (
          <span
            key={i}
            className="ldr-dust"
            style={{ left: d.left, animationDelay: d.delay }}
          />
        ))}
      </div>

      {/* ---- the central stage ---- */}
      <div className="relative flex flex-col items-center">
        <div className="relative grid h-[210px] w-[210px] place-items-center">
          {/* radar pings emanating outward */}
          <span aria-hidden className="ldr-ping" />
          <span aria-hidden className="ldr-ping ldr-ping-2" />
          <span aria-hidden className="ldr-ping ldr-ping-3" />

          {/* rotating conic rims */}
          <span aria-hidden className="ldr-ring ldr-ring-outer" />
          <span aria-hidden className="ldr-ring ldr-ring-inner" />

          {/* a spark riding the outer rim */}
          <span aria-hidden className="ldr-orbit" />

          {/* the lens, assembling itself */}
          <svg
            viewBox="0 0 40 40"
            fill="none"
            className="relative h-28 w-28"
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
        </div>

        {/* wordmark */}
        <p className="relative mt-6 text-2xl font-extrabold tracking-tight">
          Hire<span className="text-gradient">Lens</span>
        </p>

        {/* the hairline that fills */}
        <div className="relative mt-5 h-px w-44 overflow-hidden rounded-full bg-edge">
          <span className="ldr-track" />
        </div>

        <p className="ldr-label relative mt-4 text-xs font-medium tracking-[0.2em] text-faint uppercase">
          {label}
        </p>
      </div>
    </div>
  );
}
