// ─────────────────────────────────────────────────────────────
// GET /api/verbs — the full verb catalogue
// → { verbs: [{ infinitive, level: 5|6, gloss }] }
//   sorted alphabetically (Spanish collation)
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

import {
  ALL_VERBS,
  verbGloss,
  verbLevel,
} from "@/lib/conjugator/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const verbs = ALL_VERBS.map((infinitive) => ({
    infinitive,
    level: verbLevel(infinitive),
    gloss: verbGloss(infinitive),
  })).sort((a, b) => a.infinitive.localeCompare(b.infinitive, "es"));

  return NextResponse.json({ verbs });
}
