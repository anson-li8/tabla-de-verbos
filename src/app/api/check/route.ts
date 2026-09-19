// ─────────────────────────────────────────────────────────────
// POST /api/check — grade a filled-in verb chart
// Body: { verb, subject, answers: Record<RowKey, { es?, en? }> }
//   (cells may be partial or empty — only filled cells are graded)
// → {
//     verdicts: { [rowKey]: { es?: {correct, accentOnly, expected},
//                             en?: {correct, expected} } },
//     summary:  { correctCells, totalCells }
//   }
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { z } from "zod";

import { conjugate, type ConjugationRow } from "@/lib/conjugator/engine";
import { VERBS, type RowKey, type SubjectKey } from "@/lib/conjugator/types";
import { checkAnswer, normalizeEs, stripAccents } from "@/lib/conjugator/checker";

export const dynamic = "force-dynamic";

const SUBJECT_ENUM = z.enum(["yo", "tu", "el", "nosotros", "vosotros", "ellos"]);

const bodySchema = z.object({
  verb: z.string(),
  subject: SUBJECT_ENUM,
  answers: z
    .record(
      z.string(),
      z.object({
        es: z.string().optional(),
        en: z.string().optional(),
      })
    )
    .optional(),
});

/** per-cell verdict shapes (consumed by src/components/tables/types.ts) */
interface VerdictEs {
  correct: boolean;
  accentOnly: boolean;
  expected: string;
}
interface VerdictEn {
  correct: boolean;
  expected: string;
}

/**
 * Short display string for the expected answer: the canonical form plus up
 * to two alternates that meaningfully differ (variants that only add/remove
 * ¡…!/! punctuation are skipped — the checker ignores those anyway).
 */
function displayExpected(answers: string[]): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const answer of answers) {
    if (parts.length >= 3) break; // canonical + at most 2 alternates
    const key = answer.replace(/[¡!]/g, "").replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(answer);
  }
  return parts.join(" / ");
}

/**
 * For accent-only answers: the properly-accented counterpart of what the
 * user actually typed (the accepted variant that matches once accents are
 * ignored). Falls back to the canonical form.
 */
function accentedExpected(input: string, answers: string[]): string {
  const strippedInput = stripAccents(normalizeEs(input));
  return (
    answers.find((a) => stripAccents(normalizeEs(a)) === strippedInput) ??
    answers[0]
  );
}

function gradeSpanish(
  row: ConjugationRow,
  input: string
): { verdict: VerdictEs; correct: boolean } {
  const result = checkAnswer(input, row.spanish, "es");
  const correct = result !== "wrong";
  return {
    verdict: {
      correct,
      accentOnly: result === "accent",
      expected:
        result === "accent"
          ? accentedExpected(input, row.spanish)
          : displayExpected(row.spanish),
    },
    correct,
  };
}

function gradeEnglish(
  row: ConjugationRow,
  input: string
): { verdict: VerdictEn; correct: boolean } {
  const correct = checkAnswer(input, row.english, "en") === "exact";
  return { verdict: { correct, expected: displayExpected(row.english) }, correct };
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
        error: `Invalid ${path || "body"}: ${issue?.message ?? "expected { verb, subject, answers }"}`,
      },
      { status: 400 }
    );
  }

  const { verb, subject } = parsed.data;
  if (!Object.hasOwn(VERBS, verb)) {
    return NextResponse.json(
      { error: `Unknown verb "${verb}" — see GET /api/verbs for the list` },
      { status: 400 }
    );
  }

  const answers = parsed.data.answers ?? {};
  const rows = conjugate(verb, subject as SubjectKey);

  const verdicts: Partial<Record<RowKey, { es?: VerdictEs; en?: VerdictEn }>> = {};
  let correctCells = 0;
  let totalCells = 0;

  // rows come back in TENSE_ROWS order (all 23 forms)
  for (const row of rows) {
    const cell = answers[row.key];
    const esInput = typeof cell?.es === "string" ? cell.es.trim() : "";
    const enInput = typeof cell?.en === "string" ? cell.en.trim() : "";
    const cellVerdict: { es?: VerdictEs; en?: VerdictEn } = {};

    if (esInput) {
      const { verdict, correct } = gradeSpanish(row, esInput);
      cellVerdict.es = verdict;
      totalCells += 1;
      if (correct) correctCells += 1;
    }
    if (enInput) {
      const { verdict, correct } = gradeEnglish(row, enInput);
      cellVerdict.en = verdict;
      totalCells += 1;
      if (correct) correctCells += 1;
    }

    // unfilled cells are omitted entirely — the UI only shows
    // feedback for cells the learner actually attempted
    if (cellVerdict.es || cellVerdict.en) {
      verdicts[row.key] = cellVerdict;
    }
  }

  return NextResponse.json({
    verdicts,
    summary: { correctCells, totalCells },
  });
}
