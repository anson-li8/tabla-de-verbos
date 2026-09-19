"use client";

// ─────────────────────────────────────────────────────────────
// Big accuracy ring for the results screen — stroke draws in on
// mount. success ≥ 80% · primary 50–79% · destructive < 50%.
// ─────────────────────────────────────────────────────────────

import { motion } from "framer-motion";

interface AccuracyRingProps {
  accuracy: number; // 0..1
  size?: number;
  stroke?: number;
}

export function AccuracyRing({
  accuracy,
  size = 172,
  stroke = 13,
}: AccuracyRingProps) {
  const clamped = Math.min(1, Math.max(0, accuracy));
  const pct = Math.round(clamped * 100);
  const r = (size - stroke) / 2 - 3;
  const c = 2 * Math.PI * r;

  const strokeClass =
    clamped >= 0.8
      ? "stroke-success"
      : clamped >= 0.5
        ? "stroke-primary"
        : "stroke-destructive";
  const textClass =
    clamped >= 0.8
      ? "text-success"
      : clamped >= 0.5
        ? "text-primary"
        : "text-destructive";

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="status"
      aria-label={`accuracy ${pct}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted/50"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - clamped) }}
          transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className={strokeClass}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className={`font-display text-5xl font-semibold leading-none ${textClass}`}>
          {pct}
          <span className="text-2xl">%</span>
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          accuracy
        </p>
      </div>
    </div>
  );
}
