// ─────────────────────────────────────────────────────────────
// /api/sessions/stats — practice focus analytics (miss bank).
//
// GET → data for the setup screen's focus panel:
//   trend          last 14 sessions, oldest → newest
//   trendDelta     recent-half minus older-half accuracy (pts,
//                  null when fewer than 4 sessions)
//   hardestVerbs   top 8 verbs by miss count across the last
//                  100 sessions (with last-missed timestamps)
//   recentMisses   ≤ 30 most recent misses from the last 15
//                  sessions (chronological — feeds "drill my
//                  misses" quick start)
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

    // ── recent misses (chronological, from the newest sessions) ──
    const recentMisses: MissRow[] = [];
    let missCount = 0;
    for (const s of chrono.slice(-MISS_SESSIONS)) {
      const misses = parseMisses(s.misses);
      missCount += misses.length;
      recentMisses.push(...misses);
    }

    return NextResponse.json({
      trend,
      trendDelta,
      hardestVerbs,
      recentMisses: recentMisses.slice(-MISS_LIMIT),
      totals: { sessions: chrono.length, missCount },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load focus stats — try again" },
      { status: 500 }
    );
  }
}
