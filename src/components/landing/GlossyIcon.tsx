import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * Glossy green "clay" icons after the reference's 3D renders. Each shape is
 * drawn twice: a deep-green copy nudged down-right as the extruded side, then
 * the face with a lit-from-top-left gradient, then a specular highlight.
 */
export type GlossyKind = "score" | "lens" | "mic" | "case" | "bubble";

export function GlossyIcon({
  kind,
  className,
}: {
  kind: GlossyKind;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const face = `gf-${uid}`;
  const spec = `gs-${uid}`;
  const inset = `gi-${uid}`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("drop-shadow-[0_12px_12px_rgba(40,140,20,0.32)]", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={face} x1="10" y1="6" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#b4fb98" />
          <stop offset="0.38" stopColor="#62e23f" />
          <stop offset="1" stopColor="#25a915" />
        </linearGradient>
        <linearGradient id={inset} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2ffe9" />
          <stop offset="1" stopColor="#c6f5b1" />
        </linearGradient>
        <radialGradient id={spec} cx="0.3" cy="0.22" r="0.5">
          <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <Shape kind={kind} face={`url(#${face})`} inset={`url(#${inset})`} spec={`url(#${spec})`} />
    </svg>
  );
}

const SIDE = "#178a10";

function Shape({
  kind,
  face,
  inset,
  spec,
}: {
  kind: GlossyKind;
  face: string;
  inset: string;
  spec: string;
}) {
  switch (kind) {
    // a résumé sheet with the score bars rising out of it
    case "score":
      return (
        <g>
          <rect x="14" y="8" width="36" height="48" rx="9" fill={SIDE} transform="translate(2.5 3)" />
          <rect x="14" y="8" width="36" height="48" rx="9" fill={face} />
          <rect x="14" y="8" width="36" height="48" rx="9" fill={spec} />
          <rect x="21" y="16" width="16" height="3.5" rx="1.75" fill={inset} opacity="0.9" />
          {[
            { x: 21, h: 9 },
            { x: 29, h: 15 },
            { x: 37, h: 21 },
          ].map((b) => (
            <g key={b.x}>
              <rect x={b.x} y={48 - b.h} width="6" height={b.h} rx="3" fill={SIDE} opacity="0.55" transform="translate(1 1.2)" />
              <rect x={b.x} y={48 - b.h} width="6" height={b.h} rx="3" fill={inset} />
            </g>
          ))}
        </g>
      );
    // the lens — a magnifier with a pale glass disc
    case "lens":
      return (
        <g>
          <g transform="translate(2.5 3)">
            <circle cx="27" cy="27" r="17" fill="none" stroke={SIDE} strokeWidth="9" />
            <rect x="38" y="36" width="10" height="22" rx="5" fill={SIDE} transform="rotate(-45 43 47)" />
          </g>
          <rect x="38" y="36" width="10" height="22" rx="5" fill={face} transform="rotate(-45 43 47)" />
          <circle cx="27" cy="27" r="13" fill={inset} opacity="0.85" />
          <circle cx="27" cy="27" r="17" fill="none" stroke={face} strokeWidth="9" />
          <circle cx="27" cy="27" r="21.5" fill={spec} />
        </g>
      );
    // a studio microphone
    case "mic":
      return (
        <g>
          <g transform="translate(2.5 3)">
            <rect x="22" y="5" width="20" height="33" rx="10" fill={SIDE} />
            <path d="M14 30a18 18 0 0 0 36 0" fill="none" stroke={SIDE} strokeWidth="6" strokeLinecap="round" />
            <rect x="29" y="46" width="6" height="9" rx="3" fill={SIDE} />
            <rect x="20" y="53" width="24" height="6" rx="3" fill={SIDE} />
          </g>
          <path d="M14 30a18 18 0 0 0 36 0" fill="none" stroke={face} strokeWidth="6" strokeLinecap="round" />
          <rect x="29" y="46" width="6" height="9" rx="3" fill={face} />
          <rect x="20" y="53" width="24" height="6" rx="3" fill={face} />
          <rect x="22" y="5" width="20" height="33" rx="10" fill={face} />
          {[14, 20, 26].map((y) => (
            <rect key={y} x="27" y={y} width="10" height="2.6" rx="1.3" fill={inset} opacity="0.85" />
          ))}
          <rect x="22" y="5" width="20" height="33" rx="10" fill={spec} />
        </g>
      );
    // a briefcase
    case "case":
      return (
        <g>
          <g transform="translate(2.5 3)">
            <path d="M24 18v-4a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v4" fill="none" stroke={SIDE} strokeWidth="5" />
            <rect x="8" y="18" width="48" height="36" rx="10" fill={SIDE} />
          </g>
          <path d="M24 18v-4a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v4" fill="none" stroke={face} strokeWidth="5" />
          <rect x="8" y="18" width="48" height="36" rx="10" fill={face} />
          <rect x="8" y="31" width="48" height="4" fill={SIDE} opacity="0.35" />
          <rect x="27" y="28" width="10" height="10" rx="3" fill={inset} />
          <rect x="8" y="18" width="48" height="36" rx="10" fill={spec} />
        </g>
      );
    // a speech bubble with a voice waveform — the mock interview
    case "bubble":
      return (
        <g>
          <path
            d="M14 8h36a9 9 0 0 1 9 9v22a9 9 0 0 1-9 9H28l-11 9v-9h-3a9 9 0 0 1-9-9V17a9 9 0 0 1 9-9z"
            fill={SIDE}
            transform="translate(2.5 3)"
          />
          <path
            d="M14 8h36a9 9 0 0 1 9 9v22a9 9 0 0 1-9 9H28l-11 9v-9h-3a9 9 0 0 1-9-9V17a9 9 0 0 1 9-9z"
            fill={face}
          />
          {[
            { x: 17, h: 8 },
            { x: 24, h: 16 },
            { x: 31, h: 22 },
            { x: 38, h: 14 },
            { x: 45, h: 9 },
          ].map((b) => (
            <rect key={b.x} x={b.x} y={28 - b.h / 2} width="4" height={b.h} rx="2" fill={inset} />
          ))}
          <path
            d="M14 8h36a9 9 0 0 1 9 9v22a9 9 0 0 1-9 9H28l-11 9v-9h-3a9 9 0 0 1-9-9V17a9 9 0 0 1 9-9z"
            fill={spec}
          />
        </g>
      );
  }
}
