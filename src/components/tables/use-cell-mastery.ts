"use client";

// ─────────────────────────────────────────────────────────────
// useCellMastery — localStorage-backed per-cell mastery stats
// for Tables mode. A cell is "mastered" after answering it
// correctly (exact — accent warnings don't count) 2+ times.
// Keyed by verb|subject|row|lang so mastery is scoped to the
// exact conjugation being studied.
//
// Storage is read via useSyncExternalStore: the server snapshot
// is empty (hydration-safe — badges never differ during the
// hydration render) and updates notify subscribers.
// ─────────────────────────────────────────────────────────────

import { useCallback, useSyncExternalStore } from "react";

const KEY = "tdv-cell-mastery";
/** correct answers needed for a cell to count as mastered */
export const MASTERY_THRESHOLD = 2;

export interface CellStat {
  /** fully-correct answers (accent warnings excluded) */
  c: number;
  /** total graded attempts */
  t: number;
}

export type MasteryMap = Record<string, CellStat>;

// ── module-level store (single tab; no cross-tab sync needed) ──

const EMPTY: MasteryMap = {};
let cache: MasteryMap | null = null;
const listeners = new Set<() => void>();

function load(): MasteryMap {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: MasteryMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        v &&
        typeof v === "object" &&
        typeof (v as CellStat).c === "number" &&
        typeof (v as CellStat).t === "number" &&
        (v as CellStat).t >= 0
      ) {
        // defensive clamp — never trust localStorage
        const s = v as CellStat;
        out[k.slice(0, 80)] = {
          c: Math.max(0, Math.min(s.c, s.t)),
          t: s.t,
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function getSnapshot(): MasteryMap {
  if (cache === null) cache = load();
  return cache;
}

function getServerSnapshot(): MasteryMap {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit(next: MasteryMap) {
  cache = next;
  try {
    // keep the map bounded (roughly oldest-first insertion order)
    const entries = Object.entries(next);
    const stored =
      entries.length > 4000 ? Object.fromEntries(entries.slice(-4000)) : next;
    window.localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // storage unavailable — mastery just won't persist
  }
  for (const l of listeners) l();
}

export function useCellMastery() {
  const mastery = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /** merge fresh verdicts into the mastery map */
  const recordVerdicts = useCallback(
    (
      verb: string,
      subject: string,
      cells: { row: string; lang: string; correct: boolean; accentOnly?: boolean }[]
    ) => {
      const current = getSnapshot();
      const next = { ...current };
      for (const cell of cells) {
        if (typeof cell.row !== "string" || typeof cell.lang !== "string") continue;
        const k = `${verb}|${subject}|${cell.row}|${cell.lang}`;
        const s = next[k] ?? { c: 0, t: 0 };
        next[k] = {
          c: s.c + (cell.correct && !cell.accentOnly ? 1 : 0),
          t: s.t + 1,
        };
      }
      commit(next);
    },
    []
  );

  return { mastery, recordVerdicts };
}
