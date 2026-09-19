"use client";

import { motion } from "framer-motion";
import { Table2, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

export type AppMode = "tables" | "practice";

const MODES = [
  { key: "tables", label: "Tables", icon: Table2 },
  { key: "practice", label: "Practice", icon: Zap },
] as const;

interface ModeSwitcherProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function ModeSwitcher({ mode, onModeChange }: ModeSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="App mode"
      className="flex items-center gap-1 rounded-xl border bg-secondary/60 p-1"
    >
      {MODES.map(({ key, label, icon: Icon }) => {
        const active = mode === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onModeChange(key)}
            className={cn(
              "relative inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] outline-none transition-colors sm:px-4",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active
                ? "text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="mode-pill"
                className="absolute inset-0 rounded-lg bg-primary shadow-sm"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Icon className="relative z-10 size-4" aria-hidden="true" />
            <span className="relative z-10 hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
