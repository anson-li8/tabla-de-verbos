"use client";

// ─────────────────────────────────────────────────────────────
// MicroLabel — the app's mono uppercase micro-label with the
// signature brick dash (editorial rule mark) leading the text.
// ─────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";

import { MICRO } from "./types";

export function MicroLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn(MICRO, className)}>
      <span
        aria-hidden="true"
        className="mr-2 inline-block h-px w-4 translate-y-[-1px] bg-primary/70"
      />
      {children}
    </p>
  );
}
