"use client";

// ─────────────────────────────────────────────────────────────
// Spanish accent helper keys — insert the character at the
// current caret position without stealing input focus.
// ─────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";

const ACCENT_CHARS = ["á", "é", "í", "ó", "ú", "ñ", "ü"] as const;

interface AccentKeysProps {
  onInsert: (ch: string) => void;
  disabled?: boolean;
}

export function AccentKeys({ onInsert, disabled = false }: AccentKeysProps) {
  return (
    <div
      role="group"
      aria-label="Spanish accent keys"
      className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
    >
      {ACCENT_CHARS.map((ch) => (
        <button
          key={ch}
          type="button"
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsert(ch)}
          aria-label={`insert ${ch}`}
          className={cn(
            "h-10 w-10 rounded-lg border bg-card font-mono text-sm shadow-xs outline-none transition-colors sm:h-11 sm:w-11",
            "hover:border-primary/50 hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:opacity-40"
          )}
        >
          {ch}
        </button>
      ))}
    </div>
  );
}
