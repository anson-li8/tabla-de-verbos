// ─────────────────────────────────────────────────────────────
// session-store — the app's entire persistence layer.
//
// The app is fully static (no server, no database): practice
// sessions, streak freezes and every derived analytic live in
// this browser's localStorage. These functions are faithful
// ports of the former API routes (POST/GET /api/sessions,
// GET /api/sessions/stats, POST /api/streak-freeze) so every
// feature — records strip, focus panel, heatmap, racha,
// seguro de racha — works identically, just locally.
//
// Storage keys:
//   tdv-sessions  — StoredSession[] (chronological, oldest first)
//   tdv-freezes   — StoredFreeze[]  (seguro de racha claims)
// ─────────────────────────────────────────────────────────────

import type {
  DailyStats,
  FocusStatsResponse,
  FocusTrendPoint,
  HardestTense,
  HardestVerb,
  MissRecord,
  QuestionKind,
  SessionMode,
  SessionRecord,
  SessionStats,
  SessionSummary,
  SessionsResponse,
  TenseTally,
} from "./types";

const SESSIONS_KEY = "tdv-sessions";
const FREEZES_KEY = "tdv-freezes";

/** never keep more than this many sessions (oldest dropped first) */
const MAX_SESSIONS = 600;

/** the default daily practice goal (questions per day) */
export const DAILY_GOAL = 20;

const DAY_MS = 86_400_000;

// ── stored shapes ────────────────────────────────────────────

interface StoredSession {
  id: string;
  mode: SessionMode;
  durationSec: number;
  score: number;
  total: number;
  accuracy: number;
  bestStreak: number;
  avgMsPerQuestion: number;
  accentWarnings: number;
  misses: MissRecord[];
  tally: TenseTally;
  /** ISO timestamp */
  createdAt: string;
}

interface StoredFreeze {
  /** local-calendar day key "YYYY-MM-DD" that was frozen */
  frozenFor: string;
  /** ISO timestamp of the claim */
  createdAt: string;
}

// ── low-level storage ────────────────────────────────────────

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function isStoredSession(v: unknown): v is StoredSession {
  if (!v || typeof v !== "object") return false;
  const s = v as Partial<StoredSession>;
  return (
    typeof s.id === "string" &&
    (s.mode === "timed" || s.mode === "infinite") &&
    typeof s.score === "number" &&
    typeof s.total === "number" &&
    typeof s.accuracy === "number" &&
    typeof s.createdAt === "string"
  );
}

function readSessions(): StoredSession[] {
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredSession);
  } catch {
    return [];
  }
}

/** write with a quota-safety net: if localStorage is full, drop
 *  the oldest quarter of the history and retry (never crash). */
function writeSessions(list: StoredSession[]): void {
  let trimmed = list.slice(-MAX_SESSIONS);
  while (trimmed.length > 0) {
    try {
      window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
      return;
    } catch {
      // quota exceeded — shed the oldest quarter and try again
      const next = trimmed.slice(Math.ceil(trimmed.length / 4));
      if (next.length === trimmed.length) return; // can't shrink — give up
      trimmed = next;
    }
  }
}

function readFreezes(): StoredFreeze[] {
  try {
    const raw = window.localStorage.getItem(FREEZES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f): f is StoredFreeze =>
        !!f &&
        typeof f === "object" &&
        typeof (f as StoredFreeze).frozenFor === "string" &&
        typeof (f as StoredFreeze).createdAt === "string"
    );
  } catch {
    return [];
  }
}

function writeFreezes(list: StoredFreeze[]): void {
  try {
    window.localStorage.setItem(FREEZES_KEY, JSON.stringify(list));
  } catch {
    // storage unavailable — the claim just won't persist
  }
}

// ── normalization (port of the old POST /api/sessions schema) ──

function capStr(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeMiss(raw: MissRecord): MissRecord {
  return {
    verb: capStr(raw?.verb, 40),
    subject:
      typeof raw?.subject === "string" && raw.subject.trim()
        ? (capStr(raw.subject, 120) as MissRecord["subject"])
        : null,
    tense: capStr(raw?.tense, 120),
    kind: (capStr(raw?.kind, 120) || "conjugation") as QuestionKind,
    given: capStr(raw?.given, 120),
    expected: capStr(raw?.expected, 120),
    userAnswer: capStr(raw?.userAnswer, 120),
  };
}

function normalizeTally(raw: TenseTally | undefined): TenseTally {
  if (!raw || typeof raw !== "object") return {};
  const out: TenseTally = {};
  let keys = 0;
  for (const [tenseRaw, counts] of Object.entries(raw)) {
    if (keys >= 40) break; // defensive cap
    const tense = tenseRaw.trim().slice(0, 120);
    if (!tense || !counts || counts.t <= 0) continue;
    const t = Math.min(1000, Math.round(counts.t));
    const entry: TenseTally[string] = {
      t,
      c: Math.min(t, Math.max(0, Math.round(counts.c))),
    };
    if (typeof counts.ms === "number" && counts.ms > 0) {
      entry.ms = Math.min(7_200_000, Math.round(counts.ms));
    }
    out[tense] = entry;
    keys++;
  }
  return out;
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(max, Math.max(min, n));
}

// ── save a session (POST /api/sessions) ──────────────────────

export async function saveSession(
  summary: SessionSummary
): Promise<SessionRecord> {
  const mode: SessionMode = summary.mode === "timed" ? "timed" : "infinite";
  const total = clampInt(summary.total, 0, 1000, 0);
  const record: StoredSession = {
    id: makeId(),
    mode,
    durationSec: clampInt(summary.durationSec, 0, 86_400, 0),
    score: clampInt(summary.score, 0, Math.min(1000, total), 0),
    total,
    accuracy: Math.min(1, Math.max(0, Number(summary.accuracy) || 0)),
    bestStreak: clampInt(summary.bestStreak, 0, 1000, 0),
    avgMsPerQuestion: clampInt(summary.avgMsPerQuestion, 0, 7_200_000, 0),
    accentWarnings: clampInt(summary.accentWarnings, 0, 1000, 0),
    misses: (Array.isArray(summary.misses) ? summary.misses : [])
      .slice(0, 50)
      .map(normalizeMiss),
    tally: normalizeTally(summary.tally),
    createdAt: new Date().toISOString(),
  };

  const all = readSessions();
  all.push(record);
  writeSessions(all);

  return toSessionRecord(record);
}

function toSessionRecord(s: StoredSession): SessionRecord {
  return {
    id: s.id,
    mode: s.mode,
    durationSec: s.durationSec,
    score: s.score,
    total: s.total,
    accuracy: s.accuracy,
    bestStreak: s.bestStreak,
    avgMsPerQuestion: s.avgMsPerQuestion,
    accentWarnings: s.accentWarnings,
    createdAt: s.createdAt,
  };
}

// ── recent sessions + all-time stats (GET /api/sessions) ─────

export async function fetchSessions(
  limitArg: number = 8
): Promise<SessionsResponse> {
  const limit = Math.min(25, Math.max(1, Math.round(limitArg) || 8));
  const all = readSessions();

  // newest first for the recent strip
  const recent = all
    .slice(-limit)
    .reverse()
    .map(toSessionRecord);

  // aggregates across ALL stored sessions
  let bestAccuracy = 0;
  let bestScore = 0;
  let bestStreak = 0;
  let accSum = 0;
  let totalQuestions = 0;
  let weightedMs = 0;
  let weightedTotal = 0;
  for (const s of all) {
    bestAccuracy = Math.max(bestAccuracy, s.accuracy);
    bestScore = Math.max(bestScore, s.score);
    bestStreak = Math.max(bestStreak, s.bestStreak);
    accSum += s.accuracy;
    totalQuestions += s.total;
    if (s.total > 0) {
      weightedMs += Math.max(0, s.avgMsPerQuestion) * s.total;
      weightedTotal += s.total;
    }
  }

  const stats: SessionStats = {
    totalSessions: all.length,
    bestAccuracy,
    bestScore,
    bestStreak,
    avgAccuracy: all.length > 0 ? accSum / all.length : 0,
    totalQuestions,
    avgMsPerQuestion:
      weightedTotal > 0 ? Math.round(weightedMs / weightedTotal) : null,
  };

  return { recent, stats };
}

// ── focus analytics (GET /api/sessions/stats) ────────────────

/** local-calendar day key "YYYY-MM-DD" (no UTC drift) */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function dayKeyToDate(key: string): Date {
  // parse at noon — immune to DST boundary shifts
  return new Date(`${key}T12:00:00`);
}

const TREND_POINTS = 14;
const MISS_SESSIONS = 15;
const MISS_LIMIT = 30;
const ANALYZE_SESSIONS = 100;
const HARDEST_LIMIT = 8;
const SHAKIEST_LIMIT = 4;
const SHAKIEST_MIN_ANSWERS = 5;
/** days covered by the activity heatmap (24 weeks, Monday-aligned) */
const HEATMAP_DAYS = 168;
/** min timed answers before a tense qualifies as "slow" */
const SLOWEST_MIN_ANSWERS = 5;
/** how many × the overall average a tense must be to be flagged */
const SLOWEST_MIN_FACTOR = 1.35;
/** min sessions per time-of-day bucket before it can be "best" */
const HOUR_MIN_SESSIONS = 2;

function validMisses(raw: unknown): MissRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is MissRecord =>
      !!m && typeof m === "object" && typeof (m as MissRecord).verb === "string"
  );
}

function validTally(raw: unknown): TenseTally {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: TenseTally = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (
      v &&
      typeof v === "object" &&
      typeof (v as { c?: unknown }).c === "number" &&
      typeof (v as { t?: unknown }).t === "number"
    ) {
      const ms = (v as { ms?: unknown }).ms;
      out[k] = {
        c: (v as { c: number }).c,
        t: (v as { t: number }).t,
        ...(typeof ms === "number" && ms > 0 ? { ms } : {}),
      };
    }
  }
  return out;
}

export async function fetchFocusStats(): Promise<FocusStatsResponse> {
  const stored = readSessions();

  // newest-first analyze window (≤ 100 sessions), like the old route
  const rows = stored.slice(-ANALYZE_SESSIONS).reverse();
  const chrono = [...rows].reverse();

  // ── accuracy trend (last 14 sessions) ─────────────────────
  const trend: FocusTrendPoint[] = chrono.slice(-TREND_POINTS).map((s) => ({
    accuracy: s.accuracy,
    score: s.score,
    total: s.total,
    mode: s.mode === "timed" ? ("timed" as const) : ("infinite" as const),
    createdAt: s.createdAt,
  }));

  // recent-half average minus older-half average, in points
  let trendDelta: number | null = null;
  if (trend.length >= 4) {
    const older = trend.slice(0, Math.floor(trend.length / 2));
    const recent = trend.slice(Math.ceil(trend.length / 2));
    const avg = (xs: FocusTrendPoint[]) =>
      xs.reduce((a, b) => a + b.accuracy, 0) / xs.length;
    trendDelta = Math.round((avg(recent) - avg(older)) * 1000) / 10;
  }

  // ── hardest verbs (rows are newest-first, so the first
  //    session a verb appears in is its most recent miss) ────
  const counts = new Map<string, { count: number; lastMissedAt: string }>();
  for (const s of rows) {
    for (const m of validMisses(s.misses)) {
      const verb = m.verb.trim().slice(0, 40);
      if (!verb) continue;
      const prev = counts.get(verb);
      counts.set(verb, {
        count: (prev?.count ?? 0) + 1,
        lastMissedAt: prev?.lastMissedAt ?? s.createdAt,
      });
    }
  }
  const hardestVerbs: HardestVerb[] = [...counts.entries()]
    .map(([verb, v]) => ({
      verb,
      count: v.count,
      lastMissedAt: v.lastMissedAt,
    }))
    .sort(
      (a, b) => b.count - a.count || b.lastMissedAt.localeCompare(a.lastMissedAt)
    )
    .slice(0, HARDEST_LIMIT);

  // ── shakiest tenses (aggregate the per-session tallies) ──
  const tenseAgg = new Map<string, { c: number; t: number; ms: number }>();
  for (const s of rows) {
    for (const [tense, v] of Object.entries(validTally(s.tally))) {
      const key = tense.trim().slice(0, 120);
      if (!key || v.t <= 0) continue;
      const prev = tenseAgg.get(key);
      tenseAgg.set(key, {
        // defensive clamp — hand-imported rows may carry c > t
        c: (prev?.c ?? 0) + Math.min(v.c, v.t),
        t: (prev?.t ?? 0) + v.t,
        ms: (prev?.ms ?? 0) + (v.ms ?? 0),
      });
    }
  }
  const hardestTenses: HardestTense[] = [...tenseAgg.entries()]
    .map(([tense, v]) => ({
      tense,
      c: v.c,
      t: v.t,
      ...(v.ms > 0 ? { ms: v.ms } : {}),
    }))
    .filter((v) => v.t >= SHAKIEST_MIN_ANSWERS)
    .sort((a, b) => a.c / a.t - b.c / b.t || b.t - a.t)
    .slice(0, SHAKIEST_LIMIT);

  // ── pace insight (the slowest tense vs everything else) ──
  let slowestTense: FocusStatsResponse["slowestTense"] = null;
  {
    let totalMs = 0;
    let totalAnswers = 0;
    for (const v of tenseAgg.values()) {
      if (v.ms > 0) {
        totalMs += v.ms;
        totalAnswers += v.t;
      }
    }
    if (totalAnswers > 0) {
      const overallAvgMs = totalMs / totalAnswers;
      const candidates = [...tenseAgg.entries()]
        .filter(([, v]) => v.ms > 0 && v.t >= SLOWEST_MIN_ANSWERS)
        .map(([tense, v]) => ({
          tense,
          avgMs: v.ms / v.t,
          overallAvgMs,
          factor: v.ms / v.t / overallAvgMs,
        }))
        .sort((a, b) => b.avgMs - a.avgMs);
      const worst = candidates[0];
      // the factor guard also needs a second candidate (something
      // to be slower THAN) — with a single tracked tense there is
      // no contrast and no insight
      if (
        worst &&
        candidates.length > 1 &&
        worst.factor >= SLOWEST_MIN_FACTOR &&
        worst.avgMs - overallAvgMs >= 1500 // and at least 1.5s slower
      ) {
        slowestTense = {
          tense: worst.tense,
          avgMs: Math.round(worst.avgMs),
          overallAvgMs: Math.round(overallAvgMs),
          factor: Math.round(worst.factor * 10) / 10,
        };
      }
    }
  }

  // ── best time of day to practice ─────────────────────────
  const HOUR_BUCKETS: [string, (h: number) => boolean][] = [
    ["morning", (h) => h >= 5 && h < 12],
    ["afternoon", (h) => h >= 12 && h < 18],
    ["evening", (h) => h >= 18 || h < 5], // 18:00–04:59 wraps midnight
  ];
  const hourAgg = new Map<string, { acc: number; n: number }>();
  for (const s of chrono) {
    const h = new Date(s.createdAt).getHours();
    for (const [name, inBucket] of HOUR_BUCKETS) {
      if (inBucket(h)) {
        const prev = hourAgg.get(name) ?? { acc: 0, n: 0 };
        hourAgg.set(name, { acc: prev.acc + s.accuracy, n: prev.n + 1 });
        break;
      }
    }
  }
  let bestHour: FocusStatsResponse["bestHour"] = null;
  {
    const qualified = [...hourAgg.entries()]
      .filter(([, v]) => v.n >= HOUR_MIN_SESSIONS)
      .map(([bucket, v]) => ({
        bucket,
        avgAccuracy: v.acc / v.n,
        sessions: v.n,
      }))
      .sort((a, b) => b.avgAccuracy - a.avgAccuracy);
    const best = qualified[0];
    const runnerUp = qualified[1];
    if (
      best &&
      runnerUp &&
      best.avgAccuracy - runnerUp.avgAccuracy >= 0.08 // ≥ 8 pts gap
    ) {
      bestHour = {
        bucket: best.bucket,
        avgAccuracy: Math.round(best.avgAccuracy * 1000) / 1000,
        sessions: best.sessions,
      };
    }
  }

  // ── recent misses (chronological, from the newest sessions) ──
  const recentMisses: MissRecord[] = [];
  let missCount = 0;
  for (const s of chrono.slice(-MISS_SESSIONS)) {
    const misses = validMisses(s.misses);
    missCount += misses.length;
    recentMisses.push(...misses);
  }

  // ── daily goal aggregates (today's questions + day streak) ──
  const today = new Date();
  const todayK = dayKey(today);
  const yesterday = new Date(today.getTime() - DAY_MS);
  const yesterdayK = dayKey(yesterday);
  const beforeYesterday = new Date(today.getTime() - 2 * DAY_MS);
  const beforeYesterdayK = dayKey(beforeYesterday);
  const dayTotals = new Map<string, number>();
  for (const r of stored) {
    const k = dayKey(new Date(r.createdAt));
    dayTotals.set(k, (dayTotals.get(k) ?? 0) + r.total);
  }
  const activeToday = dayTotals.has(todayK);

  // ── streak freezes (seguro de racha) ─────────────────────
  // A frozen day bridges a single missed day forever (the claim
  // itself is rate-limited to one per 7-day window by
  // claimStreakFreeze — here we just honor the marks).
  const freezes = readFreezes();
  const frozenKeys = new Set(freezes.map((f) => f.frozenFor));
  const frozenYesterday = frozenKeys.has(yesterdayK);
  const recentFreezeClaim = freezes.find(
    (f) => Date.parse(f.createdAt) >= today.getTime() - 7 * DAY_MS
  );

  // the racha counts consecutive practiced days ending today —
  // or ending yesterday (still alive, just not practiced yet
  // today). Frozen days keep the chain alive without counting.
  const hasPracticeOrFreeze = (d: Date) =>
    dayTotals.has(dayKey(d)) || frozenKeys.has(dayKey(d));
  let streakDays = 0;
  let cursor = activeToday
    ? today
    : hasPracticeOrFreeze(yesterday)
      ? yesterday
      : null;
  while (cursor && hasPracticeOrFreeze(cursor)) {
    if (dayTotals.has(dayKey(cursor))) streakDays++;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  // freeze offer: a live streak missed exactly yesterday, not
  // yet frozen, and no freeze claimed this week. freezableStreak
  // is the run that a freeze would restore.
  const freezeOffer =
    !activeToday &&
    !dayTotals.has(yesterdayK) &&
    !frozenYesterday &&
    dayTotals.has(beforeYesterdayK) &&
    !recentFreezeClaim;
  let freezableStreak = 0;
  if (freezeOffer) {
    let c = beforeYesterday;
    while (c && dayTotals.has(dayKey(c))) {
      freezableStreak++;
      c = new Date(c.getTime() - DAY_MS);
    }
  }

  // longest run across the whole stored history
  let bestStreakDays = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of [...dayTotals.keys()].sort()) {
    const d = dayKeyToDate(k);
    run =
      prev && Math.round((d.getTime() - prev.getTime()) / DAY_MS) === 1
        ? run + 1
        : 1;
    bestStreakDays = Math.max(bestStreakDays, run);
    prev = d;
  }

  // activity heatmap: sparse day counts over the last 24 weeks
  // (oldest → newest, only practiced days — the client fills gaps)
  const days: DailyStats["days"] = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i); // DST-safe calendar arithmetic
    const total = dayTotals.get(dayKey(d));
    if (total) days.push({ date: dayKey(d), total });
  }

  return {
    trend,
    trendDelta,
    hardestVerbs,
    hardestTenses,
    slowestTense,
    bestHour,
    recentMisses: recentMisses.slice(-MISS_LIMIT),
    daily: {
      goal: DAILY_GOAL,
      todayQuestions: dayTotals.get(todayK) ?? 0,
      streakDays,
      bestStreakDays,
      activeToday,
      freezeOffer,
      freezableStreak,
      frozenYesterday,
      days,
    },
    totals: { sessions: chrono.length, missCount },
  };
}

// ── streak freeze claim (POST /api/streak-freeze) ────────────

/**
 * Claim the "seguro de racha" (streak insurance). Keeps a live
 * racha alive when exactly ONE day was missed: the frozen day
 * counts for continuity (without adding to the count). Max one
 * freeze per rolling 7-day window. Same validations as the old
 * route, same error strings — now enforced locally.
 */
export async function claimStreakFreeze(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const today = new Date();
  const yesterday = new Date(today.getTime() - DAY_MS);
  const yesterdayK = dayKey(yesterday);
  const beforeYesterday = new Date(today.getTime() - 2 * DAY_MS);
  const beforeYesterdayK = dayKey(beforeYesterday);

  const stored = readSessions();

  const practicedOn = (dayK: string): boolean =>
    stored.some((s) => dayKey(new Date(s.createdAt)) === dayK);

  // 1) yesterday must be a missed day (no sessions on it)
  if (practicedOn(yesterdayK)) {
    return { ok: false, error: "You practiced yesterday — the racha never broke." };
  }

  // 2) the day before yesterday must have practice — otherwise
  //    there is no live streak to save
  if (!practicedOn(beforeYesterdayK)) {
    return {
      ok: false,
      error: "No streak to save — the last practice was more than one day ago.",
    };
  }

  const freezes = readFreezes();

  // 3) yesterday must not already be frozen
  if (freezes.some((f) => f.frozenFor === yesterdayK)) {
    return { ok: false, error: "Yesterday is already frozen." };
  }

  // 4) one freeze per rolling 7-day window
  const recentFreeze = freezes
    .filter((f) => Date.parse(f.createdAt) >= today.getTime() - 7 * DAY_MS)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (recentFreeze) {
    return {
      ok: false,
      error:
        "Only one freeze per week — the next one unlocks " +
        `${new Date(Date.parse(recentFreeze.createdAt) + 7 * DAY_MS).toLocaleDateString()}.`,
    };
  }

  writeFreezes([
    ...freezes,
    { frozenFor: yesterdayK, createdAt: new Date().toISOString() },
  ]);

  return { ok: true };
}

// ── data portability (local-first = your data, your device) ──

interface ExportBlob {
  app: "tabla-de-verbos";
  version: 1;
  exportedAt: string;
  sessions: StoredSession[];
  freezes: StoredFreeze[];
}

/** serialize the full local history (sessions + freezes) as JSON */
export function exportPracticeData(): string {
  const blob: ExportBlob = {
    app: "tabla-de-verbos",
    version: 1,
    exportedAt: new Date().toISOString(),
    sessions: readSessions(),
    freezes: readFreezes(),
  };
  return JSON.stringify(blob, null, 2);
}

/** restore a history produced by exportPracticeData (merges, dedupes by id) */
export function importPracticeData(
  json: string
): { ok: boolean; imported?: number; error?: string } {
  try {
    const parsed: unknown = JSON.parse(json);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as { app?: unknown }).app !== "tabla-de-verbos"
    ) {
      return { ok: false, error: "Not a Tabla de Verbos backup file." };
    }
    const blob = parsed as Partial<ExportBlob>;
    const incomingSessions = Array.isArray(blob.sessions)
      ? blob.sessions.filter(isStoredSession)
      : [];
    const incomingFreezes = Array.isArray(blob.freezes)
      ? blob.freezes.filter(
          (f): f is StoredFreeze =>
            !!f &&
            typeof f === "object" &&
            typeof (f as StoredFreeze).frozenFor === "string" &&
            typeof (f as StoredFreeze).createdAt === "string"
        )
      : [];
    if (incomingSessions.length === 0 && incomingFreezes.length === 0) {
      return { ok: false, error: "The backup contains no sessions." };
    }

    // merge: keep existing, add only ids we don't have yet
    const existingIds = new Set(readSessions().map((s) => s.id));
    const merged = [
      ...readSessions(),
      ...incomingSessions.filter((s) => !existingIds.has(s.id)),
    ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    writeSessions(merged);

    const existingFrozen = new Set(readFreezes().map((f) => f.frozenFor));
    writeFreezes([
      ...readFreezes(),
      ...incomingFreezes.filter((f) => !existingFrozen.has(f.frozenFor)),
    ]);

    announceDataChange();

    return {
      ok: true,
      imported: incomingSessions.length + incomingFreezes.length,
    };
  } catch {
    return { ok: false, error: "Couldn't read that file — is it valid JSON?" };
  }
}

/** wipe every session + freeze from this browser */
export function clearPracticeData(): void {
  try {
    window.localStorage.removeItem(SESSIONS_KEY);
    window.localStorage.removeItem(FREEZES_KEY);
  } catch {
    // storage unavailable — nothing to clear
  }
  announceDataChange();
}

/** broadcast that the local history changed (import / wipe) so
 *  mounted screens can refresh their stats live */
function announceDataChange(): void {
  try {
    window.dispatchEvent(new CustomEvent("tdv-data-changed"));
  } catch {
    // ancient browsers — non-fatal
  }
}
