export function scoreColor(score: number): string {
  if (score >= 75) return "var(--color-good)";
  if (score >= 55) return "var(--color-warn)";
  return "var(--color-bad)";
}

export function scoreGrade(score: number): string {
  if (score >= 90) return "Exceptional";
  if (score >= 75) return "Interview-ready";
  if (score >= 60) return "Almost there";
  if (score >= 45) return "Needs work";
  return "Significant rework";
}

export function ScoreRing({
  score,
  size = 120,
  stroke = 10,
  showLabel = true,
}: {
  score: number;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);
  const color = scoreColor(clamped);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Score ${clamped} out of 100`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-edge)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      {showLabel && (
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fill="var(--color-ink)"
          fontSize={size * 0.28}
          fontWeight={700}
        >
          {clamped}
        </text>
      )}
    </svg>
  );
}

export function ScoreBar({
  label,
  score,
  note,
}: {
  label: string;
  score: number;
  note?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = scoreColor(clamped);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>
          {clamped}
        </span>
      </div>
      <div className="h-2 rounded-full bg-edge overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${clamped}%`,
            background: color,
            transition: "width 0.8s ease",
          }}
        />
      </div>
      {note && <p className="mt-1.5 text-xs text-muted leading-relaxed">{note}</p>}
    </div>
  );
}
