"use client";

// ─────────────────────────────────────────────────────────────
// Animated SVG countdown ring for the timed challenge.
// Stroke color shifts primary → destructive under 20% remaining.
// ─────────────────────────────────────────────────────────────

interface TimerRingProps {
  remainingMs: number;
  totalMs: number;
  size?: number;
}

export function TimerRing({ remainingMs, totalMs, size = 40 }: TimerRingProps) {
  const progress = Math.min(
    1,
    Math.max(0, totalMs > 0 ? remainingMs / totalMs : 0)
  );
  const stroke = 4;
  const r = (size - stroke - 2) / 2;
  const circumference = 2 * Math.PI * r;
  const danger = progress <= 0.2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className="shrink-0 -rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        className="stroke-muted"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        className={danger ? "stroke-destructive" : "stroke-primary"}
        style={{
          transition: "stroke-dashoffset 0.3s linear, stroke 0.4s ease",
        }}
      />
    </svg>
  );
}
