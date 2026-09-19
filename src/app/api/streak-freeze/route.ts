// ─────────────────────────────────────────────────────────────
// POST /api/streak-freeze — claim the "seguro de racha" (streak
// insurance). Keeps a live racha alive when exactly ONE day was
// missed: the frozen day counts for continuity (without adding
// to the count). Max one freeze per rolling 7-day window.
//
// Validations (all must hold):
//   · yesterday has NO practice sessions
//   · the day before yesterday HAS practice (a streak exists to save)
//   · yesterday isn't already frozen
//   · no freeze was claimed in the last 7 days
// → { ok: true, frozenFor: "YYYY-MM-DD" }
// ----------------------------------------------------------------

import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** local-calendar day key "YYYY-MM-DD" (no UTC drift) */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** the local midnight of the given day key */
function dayKeyToDate(key: string): Date {
  // parse at noon — immune to DST boundary shifts
  const noon = new Date(`${key}T12:00:00`);
  const midnight = new Date(noon);
  midnight.setHours(0, 0, 0, 0);
  return midnight;
}

const DAY_MS = 86_400_000;

export async function POST() {
  try {
    const today = new Date();
    const yesterday = new Date(today.getTime() - DAY_MS);
    const yesterdayK = dayKey(yesterday);
    const beforeYesterday = new Date(today.getTime() - 2 * DAY_MS);
    const beforeYesterdayK = dayKey(beforeYesterday);

    // 1) yesterday must be a missed day (no sessions anywhere on it)
    const yStart = dayKeyToDate(yesterdayK);
    const yEnd = new Date(yStart.getTime() + DAY_MS);
    const yesterdaySessions = await db.practiceSession.count({
      where: { createdAt: { gte: yStart, lt: yEnd } },
    });
    if (yesterdaySessions > 0) {
      return NextResponse.json(
        { error: "You practiced yesterday — the racha never broke." },
        { status: 409 }
      );
    }

    // 2) the day before yesterday must have practice — otherwise
    //    there is no live streak to save
    const bStart = dayKeyToDate(beforeYesterdayK);
    const bEnd = new Date(bStart.getTime() + DAY_MS);
    const beforeSessions = await db.practiceSession.count({
      where: { createdAt: { gte: bStart, lt: bEnd } },
    });
    if (beforeSessions === 0) {
      return NextResponse.json(
        {
          error:
            "No streak to save — the last practice was more than one day ago.",
        },
        { status: 409 }
      );
    }

    // 3) yesterday must not already be frozen
    const alreadyFrozen = await db.streakFreeze.findFirst({
      where: { frozenFor: yStart },
    });
    if (alreadyFrozen) {
      return NextResponse.json(
        { error: "Yesterday is already frozen." },
        { status: 409 }
      );
    }

    // 4) one freeze per rolling 7-day window
    const windowStart = new Date(today.getTime() - 7 * DAY_MS);
    const recentFreeze = await db.streakFreeze.findFirst({
      where: { createdAt: { gte: windowStart } },
      orderBy: { createdAt: "desc" },
    });
    if (recentFreeze) {
      return NextResponse.json(
        {
          error:
            "Only one freeze per week — the next one unlocks " +
            `${new Date(recentFreeze.createdAt.getTime() + 7 * DAY_MS).toLocaleDateString()}.`,
        },
        { status: 429 }
      );
    }

    const freeze = await db.streakFreeze.create({
      data: { frozenFor: yStart },
    });

    return NextResponse.json({
      ok: true,
      frozenFor: dayKey(freeze.frozenFor),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to claim the freeze — try again." },
      { status: 500 }
    );
  }
}
