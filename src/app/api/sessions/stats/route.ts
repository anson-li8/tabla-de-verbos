// ─────────────────────────────────────────────────────────────
// /api/sessions/stats — practice focus analytics (miss bank).
//
// GET → data for the setup screen's focus panel:
//   trend          last 14 sessions, oldest → newest
//   trendDelta     recent-half minus older-half accuracy (pts,
//                  null when fewer than 4 sessions)
//   hardestVerbs   top 8 verbs by miss count across the last
//                  100 sessions (with last-missed timestamps)
//   hardestTenses  top 4 tenses by weakest accuracy (≥ 5 answers,
//                  aggregated from the per-session tally maps)
//   recentMisses   ≤ 30 most recent misses from the last 15
//                  sessions (chronological — feeds "drill my
//                  misses" quick start)
//   daily          daily-goal aggregates: today's question count,
//                  day-streak (racha), the goal constant and a sparse
//                  `days` array (last 24 weeks, practiced days only)
//                  feeding the activity heatmap
//   totals         sessions & misses in the analyzed window
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const TREND_POINTS = 14;
const MISS_SESSIONS = 15;
const MISS_LIMIT = 30;
const ANALYZE_SESSIONS = 100;
const HARDEST_LIMIT = 8;
const SHAKIEST_LIMIT = 4;
const SHAKIEST_MIN_ANSWERS = 5;
/** the daily practice goal (questions per day) */
export const DAILY_GOAL = 20;
/** sessions scanned for the day-streak (bounded — far beyond a year of daily use) */
const DAILY_SCAN = 2000;
/** days covered by the activity heatmap (24 weeks, Monday-aligned) */
const HEATMAP_DAYS = 168;

/** normalized missed-question record persisted as JSON (see POST /api/sessions) */
interface MissRow {
  verb: string;
  subject: string | null;
  tense: string;
  kind: string;
  given: string;
  expected: string;
  userAnswer: string;
}

function parseMisses(raw: string): MissRow[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is MissRow =>
        !!m && typeof m === "object" && typeof (m as MissRow).verb === "string"
    );
  } catch {
    return [];
  }
}

function parseTally(
  raw: string
): Record<string, { c: number; t: number; ms?: number }> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, { c: number; t: number; ms?: number }> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
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
  } catch {
    return {};
  }
}

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

export async function GET() {
  try {
    // newest first — reversed below for chronological order
    const rows = await db.practiceSession.findMany({
      orderBy: { createdAt: "desc" },
      take: ANALYZE_SESSIONS,
      select: {
        mode: true,
        score: true,
        total: true,
        accuracy: true,
        misses: true,
        tally: true,
        createdAt: true,
      },
    });
    const chrono = [...rows].reverse();

    // ── accuracy trend (last 14 sessions) ─────────────────────
    const trend = chrono.slice(-TREND_POINTS).map((s) => ({
      accuracy: s.accuracy,
      score: s.score,
      total: s.total,
      mode: s.mode === "timed" ? ("timed" as const) : ("infinite" as const),
      createdAt: s.createdAt.toISOString(),
    }));

    // recent-half average minus older-half average, in points
    let trendDelta: number | null = null;
    if (trend.length >= 4) {
      const older = trend.slice(0, Math.floor(trend.length / 2));
      const recent = trend.slice(Math.ceil(trend.length / 2));
      const avg = (xs: typeof trend) =>
        xs.reduce((a, b) => a + b.accuracy, 0) / xs.length;
      trendDelta = Math.round((avg(recent) - avg(older)) * 1000) / 10;
    }

    // ── hardest verbs (rows are newest-first, so the first
    //    session a verb appears in is its most recent miss) ────
    const counts = new Map<string, { count: number; lastMissedAt: Date }>();
    for (const s of rows) {
      for (const m of parseMisses(s.misses)) {
        const verb = m.verb.trim().slice(0, 40);
        if (!verb) continue;
        const prev = counts.get(verb);
        counts.set(verb, {
          count: (prev?.count ?? 0) + 1,
          lastMissedAt: prev?.lastMissedAt ?? s.createdAt,
        });
      }
    }
    const hardestVerbs = [...counts.entries()]
      .map(([verb, v]) => ({
        verb,
        count: v.count,
        lastMissedAt: v.lastMissedAt.toISOString(),
      }))
      .sort(
        (a, b) => b.count - a.count || b.lastMissedAt.localeCompare(a.lastMissedAt)
      )
      .slice(0, HARDEST_LIMIT);

    // ── shakiest tenses (aggregate the per-session tallies) ──
    const tenseAgg = new Map<string, { c: number; t: number; ms: number }>();
    for (const s of rows) {
      for (const [tense, v] of Object.entries(parseTally(s.tally))) {
        const key = tense.trim().slice(0, 120);
        if (!key || v.t <= 0) continue;
        const prev = tenseAgg.get(key);
        tenseAgg.set(key, {
          // defensive clamp — rows written outside the API (imports,
          // older builds) may carry c > t
          c: (prev?.c ?? 0) + Math.min(v.c, v.t),
          t: (prev?.t ?? 0) + v.t,
          ms: (prev?.ms ?? 0) + (v.ms ?? 0),
        });
      }
    }
    const hardestTenses = [...tenseAgg.entries()]
      .map(([tense, v]) => ({
        tense,
        c: v.c,
        t: v.t,
        ...(v.ms > 0 ? { ms: v.ms } : {}),
      }))
      .filter((v) => v.t >= SHAKIEST_MIN_ANSWERS)
      .sort((a, b) => a.c / a.t - b.c / b.t || b.t - a.t)
      .slice(0, SHAKIEST_LIMIT);

    // ── recent misses (chronological, from the newest sessions) ──
    const recentMisses: MissRow[] = [];
    let missCount = 0;
    for (const s of chrono.slice(-MISS_SESSIONS)) {
      const misses = parseMisses(s.misses);
      missCount += misses.length;
      recentMisses.push(...misses);
    }

    // ── daily goal aggregates (today's questions + day streak) ──
    const dayRows = await db.practiceSession.findMany({
      orderBy: { createdAt: "desc" },
      take: DAILY_SCAN,
      select: { total: true, createdAt: true },
    });
    const today = new Date();
    const todayK = dayKey(today);
    const yesterday = new Date(today.getTime() - 86_400_000);
    const yesterdayK = dayKey(yesterday);
    const dayTotals = new Map<string, number>();
    for (const r of dayRows) {
      const k = dayKey(r.createdAt);
      dayTotals.set(k, (dayTotals.get(k) ?? 0) + r.total);
    }
    const activeToday = dayTotals.has(todayK);
    // the racha counts consecutive practiced days ending today —
    // or ending yesterday (still alive, just not practiced yet today)
    let streakDays = 0;
    let cursor = activeToday
      ? today
      : dayTotals.has(yesterdayK)
        ? yesterday
        : null;
    while (cursor && dayTotals.has(dayKey(cursor))) {
      streakDays++;
      cursor = new Date(cursor.getTime() - 86_400_000);
    }
    // longest run across the whole scanned history
    let bestStreakDays = 0;
    let run = 0;
    let prev: Date | null = null;
    for (const k of [...dayTotals.keys()].sort()) {
      const d = dayKeyToDate(k);
      run = prev && Math.round((d.getTime() - prev.getTime()) / 86_400_000) === 1 ? run + 1 : 1;
      bestStreakDays = Math.max(bestStreakDays, run);
      prev = d;
    }

    // activity heatmap: sparse day counts over the last 24 weeks
    // (oldest → newest, only practiced days — the client fills gaps)
    const days: { date: string; total: number }[] = [];
    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i); // DST-safe calendar arithmetic
      const total = dayTotals.get(dayKey(d));
      if (total) days.push({ date: dayKey(d), total });
    }

    return NextResponse.json({
      trend,
      trendDelta,
      hardestVerbs,
      hardestTenses,
      recentMisses: recentMisses.slice(-MISS_LIMIT),
      daily: {
        goal: DAILY_GOAL,
        todayQuestions: dayTotals.get(todayK) ?? 0,
        streakDays,
        bestStreakDays,
        activeToday,
        days,
      },
      totals: { sessions: chrono.length, missCount },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load focus stats — try again" },
      { status: 500 }
    );
  }
}
