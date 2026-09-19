"use client";

// ─────────────────────────────────────────────────────────────
// useCardStars — localStorage-backed "needs review" stars for
// Flashcards mode. A card (verb × subject × row) gets starred
// from the back face's self-grade ("no lo sabía") and unstarred
// by "lo sabía". Stars power the "en revisión" deck filter.
//
// Storage is read via useSyncExternalStore: the server snapshot
// is empty (hydration-safe) and updates notify subscribers —
// the card back, the deck rail and the counters all react.
// ─────────────────────────────────────────────────────────────

import { useCallback, useSyncExternalStore } from "react";

import type { RowKey, SubjectKey } from "@/lib/conjugator/types";

const KEY = "tdv-card-stars";

/** starredAt timestamp per card key "verb|subject|row" */
export type CardStarMap = Record<string, number>;

// ── module-level store (single tab; no cross-tab sync needed) ──

const EMPTY: CardStarMap = {};
let cache: CardStarMap | null = null;
const listeners = new Set<() => void>();

function load(): CardStarMap {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: CardStarMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "number" && v > 0 && Number.isFinite(v)) {
        out[k.slice(0, 80)] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function getSnapshot(): CardStarMap {
  if (cache === null) cache = load();
  return cache;
}

function getServerSnapshot(): CardStarMap {
  return EMPTY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit(next: CardStarMap) {
  cache = next;
  try {
    // keep the map bounded (roughly oldest-first insertion order)
    const entries = Object.entries(next);
    const stored =
      entries.length > 3000 ? Object.fromEntries(entries.slice(-3000)) : next;
    window.localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // storage unavailable — stars just won't persist
  }
  for (const l of listeners) l();
}

export function cardStarKey(
  verb: string,
  subject: SubjectKey,
  row: RowKey,
): string {
  return `${verb}|${subject}|${row}`;
}

export function useCardStars() {
  const stars = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const isStarred = useCallback(
    (verb: string, subject: SubjectKey, row: RowKey) =>
      Object.hasOwn(stars, cardStarKey(verb, subject, row)),
    [stars],
  );

  /** star a card ("no lo sabía") — idempotent */
  const star = useCallback(
    (verb: string, subject: SubjectKey, row: RowKey) => {
      const k = cardStarKey(verb, subject, row);
      if (Object.hasOwn(getSnapshot(), k)) return;
      commit({ ...getSnapshot(), [k]: Date.now() });
    },
    [],
  );

  /** unstar a card ("lo sabía") — idempotent */
  const unstar = useCallback(
    (verb: string, subject: SubjectKey, row: RowKey) => {
      const k = cardStarKey(verb, subject, row);
      if (!Object.hasOwn(getSnapshot(), k)) return;
      const next = { ...getSnapshot() };
      delete next[k];
      commit(next);
    },
    [],
  );

  return { stars, isStarred, star, unstar };
}

/**
 * Count starred cards for a verb+subject pair (any row).
 * Pure — usable without the hook.
 */
export function countStarred(
  stars: CardStarMap,
  verb: string,
  subject: SubjectKey,
  rowKeys: readonly RowKey[],
): number {
  let n = 0;
  for (const row of rowKeys) {
    if (Object.hasOwn(stars, cardStarKey(verb, subject, row))) n++;
  }
  return n;
}
