// ─────────────────────────────────────────────────────────────
// session-queue — offline safety net for practice sessions.
// If POST /api/sessions fails (offline, server hiccup), the
// summary is parked in localStorage and flushed automatically
// the next time the app is online.
// ─────────────────────────────────────────────────────────────

import { type SessionSummary } from "./types";

const QUEUE_KEY = "tdv-session-queue";
/** never keep more than this many unsent sessions (oldest dropped) */
const MAX_QUEUED = 20;

function readQueue(): SessionSummary[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is SessionSummary =>
        !!s &&
        typeof s === "object" &&
        typeof (s as SessionSummary).score === "number" &&
        typeof (s as SessionSummary).total === "number" &&
        typeof (s as SessionSummary).mode === "string"
    );
  } catch {
    return [];
  }
}

function writeQueue(queue: SessionSummary[]): void {
  try {
    window.localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify(queue.slice(-MAX_QUEUED))
    );
  } catch {
    // storage unavailable — the session is simply lost, never crash
  }
}

/** Park a session that couldn't be saved (offline). */
export function enqueueSession(summary: SessionSummary): number {
  const queue = readQueue();
  queue.push(summary);
  writeQueue(queue);
  return queue.length;
}

/** How many sessions are waiting to sync. */
export function queuedSessionCount(): number {
  return readQueue().length;
}

/**
 * Try to save every queued session, oldest first. Stops at the
 * first failure (keeps order); removes each success from the
 * queue. Returns how many synced and how many remain.
 */
export async function flushQueue(
  saveSession: (s: SessionSummary) => Promise<unknown>
): Promise<{ synced: number; remaining: number }> {
  const queue = readQueue();
  let synced = 0;
  for (const summary of queue) {
    try {
      await saveSession(summary);
      synced++;
    } catch {
      break;
    }
  }
  if (synced > 0) {
    writeQueue(queue.slice(synced));
  }
  return { synced, remaining: queue.length - synced };
}
