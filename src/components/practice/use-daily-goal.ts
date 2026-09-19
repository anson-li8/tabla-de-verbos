"use client";

// ─────────────────────────────────────────────────────────────
// useDailyGoal — user-configurable daily practice goal, persisted
// to localStorage ("tdv-daily-goal"). Falls back to the server's
// goal constant until the user picks one.
//
// The lazy initializer is hydration-safe: the goal only feeds
// components that render after client-side data loads (the daily
// strip, heatmap and records strip are all gated on focusStats),
// so it never influences the server-rendered tree.
// ─────────────────────────────────────────────────────────────

import { useCallback, useState } from "react";

import { DAILY_GOAL_OPTIONS } from "./types";

const GOAL_KEY = "tdv-daily-goal";

function readStoredGoal(): number | null {
  try {
    const raw = window.localStorage.getItem(GOAL_KEY);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return (DAILY_GOAL_OPTIONS as readonly number[]).includes(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * @param serverGoal the goal constant from GET /api/sessions/stats
 * @returns the effective goal + a saver (clamped to the presets)
 */
export function useDailyGoal(serverGoal: number) {
  const [override, setOverride] = useState<number | null>(() =>
    typeof window === "undefined" ? null : readStoredGoal()
  );

  const saveGoal = useCallback(
    (goal: number) => {
      const valid = (DAILY_GOAL_OPTIONS as readonly number[]).includes(goal)
        ? goal
        : serverGoal;
      setOverride(valid);
      try {
        window.localStorage.setItem(GOAL_KEY, String(valid));
      } catch {
        // storage unavailable — the choice still applies for this visit
      }
    },
    [serverGoal]
  );

  return {
    /** effective goal (user pick, else the server constant) */
    goal: override ?? serverGoal,
    /** the user's explicit pick, if any (null = default) */
    userGoal: override,
    saveGoal,
  };
}
