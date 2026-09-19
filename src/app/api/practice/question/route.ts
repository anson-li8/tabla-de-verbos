// ─────────────────────────────────────────────────────────────
// POST /api/practice/question — one random practice question
// Body (QuizSettings, all fields optional):
//   { types?: QuestionKind[], tenses?: RowKey[], level?: 5|6|"all",
//     mode?: "timed"|"infinite", durationSec?: number,
//     verbs?: string[] — optional explicit verb pool ("drill my misses"),
//                        unknown verbs filtered, overrides level when non-empty }
// Defaults: types ["conjugation"], tenses ["pres"], level "all",
//           mode "infinite", durationSec 120.
// Unknown types/tenses are filtered out; if either list ends up
// empty → 400.
// → the generated Question JSON (200)
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  generateQuestion,
  type QuestionKind,
  type QuizSettings,
} from "@/lib/conjugator/quiz";
import { TENSE_ROWS, type RowKey } from "@/lib/conjugator/types";

export const dynamic = "force-dynamic";

const QUESTION_KINDS: readonly QuestionKind[] = [
  "conjugation",
  "translate-es-en",
  "translate-en-es",
];

const VALID_TENSES: readonly RowKey[] = TENSE_ROWS.map((r) => r.key);

const bodySchema = z.object({
  types: z.array(z.string()).optional(),
  tenses: z.array(z.string()).optional(),
  level: z.union([z.literal(5), z.literal(6), z.literal("all")]).optional(),
  mode: z.enum(["timed", "infinite"]).optional(),
  durationSec: z.number().int().min(1).max(86400).optional(),
  verbs: z.array(z.string()).max(60).optional(),
  subjects: z.array(z.string()).optional(),
});

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
        error: `Invalid ${path || "body"}: ${issue?.message ?? "invalid quiz settings"}`,
      },
      { status: 400 }
    );
  }

  // filter to known kinds/tenses (defaults apply when absent)
  const types = (parsed.data.types ?? ["conjugation"]).filter((t): t is QuestionKind =>
    (QUESTION_KINDS as readonly string[]).includes(t)
  );
  if (types.length === 0) {
    return NextResponse.json(
      {
        error: `No valid question types — expected at least one of ${QUESTION_KINDS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const tenses = (parsed.data.tenses ?? ["pres"]).filter((t): t is RowKey =>
    (VALID_TENSES as readonly string[]).includes(t)
  );
  if (tenses.length === 0) {
    return NextResponse.json(
      { error: "No valid tenses — expected at least one known row key" },
      { status: 400 }
    );
  }

  const settings: QuizSettings = {
    types,
    tenses,
    level: parsed.data.level ?? "all",
    mode: parsed.data.mode ?? "infinite",
    durationSec: parsed.data.durationSec ?? 120,
    verbs: parsed.data.verbs,
    subjects: parsed.data.subjects as QuizSettings["subjects"],
  };

  try {
    const question = generateQuestion(settings);
    return NextResponse.json(question);
  } catch {
    return NextResponse.json(
      { error: "Failed to generate a question — try again" },
      { status: 500 }
    );
  }
}
