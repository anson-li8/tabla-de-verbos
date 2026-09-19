// ─────────────────────────────────────────────────────────────
// /api/sessions — practice-session history (SQLite via Prisma)
//
// GET  ?limit=8   → { recent: SessionRecord[], stats: {...} }
//                  limit clamped to 1..25; stats computed across
//                  ALL sessions (not just the recent page).
// POST            → save a finished session, 201 { session: {...} }
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// ── POST: save a session ─────────────────────────────────────

const bodySchema = z.object({
  mode: z.enum(["timed", "infinite"]),
  durationSec: z.number().int().min(0).max(86400),
  score: z.number().int().min(0).max(1000),
  total: z.number().int().min(0).max(1000),
  accuracy: z.number().min(0).max(1),
  bestStreak: z.number().int().min(0).max(1000),
  avgMsPerQuestion: z.number().int().min(0),
  accentWarnings: z.number().int().min(0).max(1000),
  // loose records — each miss is normalized (trimmed + length-capped) below
  misses: z.array(z.record(z.string(), z.unknown())).max(50).optional(),
  // per-tense answer counts: tense → { c: correct, t: total }
  tally: z
    .record(
      z.string().max(120),
      z.object({
        c: z.number().int().min(0).max(1000),
        t: z.number().int().min(0).max(1000),
      })
    )
    .optional(),
});

/** normalized missed-question record persisted as JSON */
interface MissRecord {
  verb: string;
  subject: string | null;
  tense: string;
  kind: string;
  given: string;
  expected: string;
  userAnswer: string;
}

function capStr(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeMiss(raw: Record<string, unknown>): MissRecord {
  return {
    verb: capStr(raw.verb, 40),
    subject:
      typeof raw.subject === "string" && raw.subject.trim()
        ? capStr(raw.subject, 120)
        : null,
    tense: capStr(raw.tense, 120),
    kind: capStr(raw.kind, 120),
    given: capStr(raw.given, 120),
    expected: capStr(raw.expected, 120),
    userAnswer: capStr(raw.userAnswer, 120),
  };
}

/** per-tense answer counts — keys capped, c clamped to t, empty t dropped */
function normalizeTally(
  raw: Record<string, { c: number; t: number }> | undefined
): Record<string, { c: number; t: number }> {
  if (!raw) return {};
  const out: Record<string, { c: number; t: number }> = {};
  let keys = 0;
  for (const [tenseRaw, counts] of Object.entries(raw)) {
    if (keys >= 40) break; // defensive cap
    const tense = tenseRaw.trim().slice(0, 120);
    if (!tense || !counts || counts.t <= 0) continue;
    out[tense] = {
      t: Math.min(1000, counts.t),
      c: Math.min(Math.min(1000, counts.t), Math.max(0, counts.c)),
    };
    keys++;
  }
  return out;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".");
    return NextResponse.json(
      {
        error: `Invalid ${path || "body"}: ${issue?.message ?? "invalid session summary"}`,
      },
      { status: 400 }
    );
  }

  const { mode, durationSec, score, total, accuracy, bestStreak, avgMsPerQuestion, accentWarnings } =
    parsed.data;

  if (score > total) {
    return NextResponse.json(
      { error: `Invalid score: score (${score}) cannot exceed total (${total})` },
      { status: 400 }
    );
  }

  const misses = (parsed.data.misses ?? []).map(normalizeMiss);
  const tally = normalizeTally(parsed.data.tally);

  try {
    const session = await db.practiceSession.create({
      data: {
        mode,
        durationSec,
        score,
        total,
        accuracy,
        bestStreak,
        avgMsPerQuestion,
        accentWarnings,
        misses: JSON.stringify(misses),
        tally: JSON.stringify(tally),
      },
    });

    return NextResponse.json(
      {
        session: {
          id: session.id,
          mode: session.mode,
          durationSec: session.durationSec,
          score: session.score,
          total: session.total,
          accuracy: session.accuracy,
          bestStreak: session.bestStreak,
          avgMsPerQuestion: session.avgMsPerQuestion,
          accentWarnings: session.accentWarnings,
          misses,
          tally,
          createdAt: session.createdAt,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to save the session — try again" },
      { status: 500 }
    );
  }
}

// ── GET: recent sessions + all-time stats ────────────────────

const RECENT_COLUMNS = {
  select: {
    id: true,
    mode: true,
    durationSec: true,
    score: true,
    total: true,
    accuracy: true,
    bestStreak: true,
    avgMsPerQuestion: true,
    accentWarnings: true,
    createdAt: true,
  },
} as const;

export async function GET(request: Request) {
  const limitRaw = new URL(request.url).searchParams.get("limit");
  let limit = 8;
  if (limitRaw !== null) {
    const n = Number(limitRaw);
    if (!Number.isInteger(n)) {
      return NextResponse.json(
        { error: "Invalid limit: must be an integer" },
        { status: 400 }
      );
    }
    limit = Math.min(25, Math.max(1, n)); // clamp 1..25
  }

  try {
    const [recent, aggregate] = await Promise.all([
      db.practiceSession.findMany({
        ...RECENT_COLUMNS,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.practiceSession.aggregate({
        _count: { _all: true },
        _max: { accuracy: true, score: true, bestStreak: true },
        _avg: { accuracy: true },
        _sum: { total: true },
      }),
    ]);

    return NextResponse.json({
      recent,
      stats: {
        totalSessions: aggregate._count._all,
        // null when there are no sessions yet — the UI treats
        // totalSessions === 0 as "no records" and never reads this
        bestAccuracy: aggregate._max.accuracy ?? null,
        bestScore: aggregate._max.score ?? 0,
        bestStreak: aggregate._max.bestStreak ?? 0,
        avgAccuracy: aggregate._avg.accuracy ?? 0,
        totalQuestions: aggregate._sum.total ?? 0,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load sessions — try again" },
      { status: 500 }
    );
  }
}
