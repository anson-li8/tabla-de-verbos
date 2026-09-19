// ─────────────────────────────────────────────────────────────
// chart-check — local grading for the fill-in conjugation chart.
//
// Faithful port of the former POST /api/check and
// POST /api/conjugate routes: the conjugation engine and answer
// checker are pure, shared code, so grading happens right here
// on the device — no server round-trip, instant feedback.
// ─────────────────────────────────────────────────────────────

import {
  conjugate,
  type ConjugationRow,
} from "@/lib/conjugator/engine";
import {
  VERBS,
  type RowKey,
  type SubjectKey,
} from "@/lib/conjugator/types";
import { checkAnswer, normalizeEs, stripAccents } from "@/lib/conjugator/checker";

import type {
  AnswersMap,
  CheckApiResponse,
  ConjugateApiResponse,
  RevealData,
  VerdictEn,
  VerdictEs,
} from "./types";

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

/**
 * Grade a filled-in chart (only filled cells are graded).
 * Same shape the old POST /api/check returned.
 */
export function checkChart(
  verb: string,
  subject: SubjectKey,
  answers: AnswersMap
): CheckApiResponse {
  if (!Object.hasOwn(VERBS, verb)) {
    return { verdicts: {}, summary: { correctCells: 0, totalCells: 0 } };
  }

  const rows = conjugate(verb, subject);
  const verdicts: CheckApiResponse["verdicts"] = {};
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
      verdicts[row.key as RowKey] = cellVerdict;
    }
  }

  return {
    verdicts,
    summary: { correctCells, totalCells },
  };
}

/** full 23-row reference chart (the old POST /api/conjugate) */
export function conjugateChart(
  verb: string,
  subject: SubjectKey
): ConjugateApiResponse {
  const rows = conjugate(verb, subject);
  return {
    verb,
    subject,
    rows: rows.map((row) => ({
      key: row.key,
      spanish: Array.isArray(row.spanish) ? row.spanish : [],
      english: Array.isArray(row.english) ? row.english : [],
    })),
  };
}

/** reveal-mode lookup map for the current verb + subject */
export function buildRevealData(
  verb: string,
  subject: SubjectKey
): RevealData | null {
  if (!Object.hasOwn(VERBS, verb)) return null;
  const data = conjugateChart(verb, subject);
  const map: RevealData = {};
  for (const row of data.rows) {
    map[row.key] = {
      spanish: Array.isArray(row.spanish) ? row.spanish : [],
      english: Array.isArray(row.english) ? row.english : [],
    };
  }
  return map;
}
