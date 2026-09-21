// ─────────────────────────────────────────────────────────────
// Tabla de Verbos — practice quiz generator
// ─────────────────────────────────────────────────────────────

import type { ConjugationRow } from "./engine";
import { conjugate } from "./engine";
import type { RowKey, SubjectKey } from "./types";
import {
  ALL_VERBS,
  ROW_META,
  SP5_VERBS,
  SP6_VERBS,
  SUBJECTS,
  SUBJECT_KEYS,
  TENSE_ROWS,
} from "./types";

export type QuestionKind = "conjugation" | "translate-es-en" | "translate-en-es";

/** the classic 5 course subjects — practice questions draw from these
 *  unless the learner opts into vosotros via settings.subjects */
const DEFAULT_QUIZ_SUBJECTS: SubjectKey[] = [
  "yo",
  "tu",
  "el",
  "nosotros",
  "ellos",
];

export interface QuizSettings {
  types: QuestionKind[];
  tenses: RowKey[];
  level: 5 | 6 | "all";
  mode: "timed" | "infinite";
  durationSec: number;
  /**
   * Optional explicit verb pool (e.g. "drill my misses"). When given and
   * non-empty it overrides `level`; unknown verbs are filtered out and the
   * pool silently falls back to `level` if nothing valid remains.
   */
  verbs?: string[];
  /**
   * Optional subject pool for conjugation/translation questions. Defaults
   * to the classic 5 course subjects (no vosotros); pass vosotros in the
   * list to mix in Spain's informal 2nd-person plural. Unknown keys are
   * filtered, and an empty/invalid list falls back to the default.
   */
  subjects?: SubjectKey[];
}

export interface Question {
  id: string;
  kind: QuestionKind;
  verb: string;
  subject: SubjectKey | null;
  tense: RowKey;
  tenseLabelEs: string;
  tenseLabelEn: string;
  /** conjugation: the verb infinitive · translations: the phrase to translate */
  promptMain: string;
  /** small context chips shown under the prompt */
  chips: string[];
  /** acceptable answers (client checks instantly with checkAnswer) */
  answers: string[];
  /** canonical answer to reveal on wrong/skip */
  displayAnswer: string;
}

// ── Row classification ───────────────────────────────────────

/** rows with no subject agreement at all */
const SUBJECTLESS_TENSES = new Set<RowKey>(["inf", "ger", "part"]);

/**
 * Imperative rows. Like the original paper chart, these are
 * subject-independent (each command targets one fixed grammatical
 * person), so their questions carry subject = null and the row label
 * ("tú +", "usted", "vosotros −", …) provides the person.
 */
const COMMAND_TENSES = new Set<RowKey>([
  "tu_pos",
  "tu_neg",
  "ud",
  "uds",
  "vos_pos",
  "vos_neg",
  "nos",
]);

/** person hint appended to imperative ES→EN prompts, e.g. "¡habla! (tú)" */
const COMMAND_PERSON: Partial<Record<RowKey, string>> = {
  tu_pos: "tú",
  tu_neg: "tú",
  ud: "usted",
  uds: "ustedes",
  vos_pos: "vosotros",
  vos_neg: "vosotros",
  nos: "nosotros",
};

/** internal subject used to build rows when the question itself has no subject */
const DEFAULT_ROW_SUBJECT: SubjectKey = "el";

const PRONOUN: Record<SubjectKey, string> = Object.fromEntries(
  SUBJECTS.map((s) => [s.key, s.pronoun])
) as Record<SubjectKey, string>;

// ── Helpers ──────────────────────────────────────────────────

/** verb pool for a course level */
export function getVerbPool(level: 5 | 6 | "all"): string[] {
  if (level === 5) return [...SP5_VERBS];
  if (level === 6) return [...SP6_VERBS];
  return [...ALL_VERBS];
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function dedup(items: string[]): string[] {
  return [...new Set(items)];
}

/** subject shown on the question (null for subjectless & imperative rows) */
function pickSubject(tense: RowKey, pool: SubjectKey[]): SubjectKey | null {
  if (SUBJECTLESS_TENSES.has(tense) || COMMAND_TENSES.has(tense)) {
    return null;
  }
  return pick(pool);
}

function rowsByTense(verb: string, subject: SubjectKey): Map<RowKey, ConjugationRow> {
  return new Map(conjugate(verb, subject).map((row) => [row.key, row]));
}

function rowFor(
  rows: Map<RowKey, ConjugationRow>,
  tense: RowKey
): ConjugationRow {
  const row = rows.get(tense);
  if (!row) throw new Error(`Unknown tense: ${tense}`);
  return row;
}

/** first Spanish variant without "!" and without the " - " alternative spelling */
function bareSpanish(row: ConjugationRow): string {
  return (
    row.spanish.find((form) => !form.includes("!") && !form.includes(" - ")) ??
    row.spanish[0]
  );
}

// ── Question builders ────────────────────────────────────────

function conjugationQuestion(
  verb: string,
  tense: RowKey,
  subjectPool: SubjectKey[]
): Question {
  const meta = ROW_META[tense];
  const subject = pickSubject(tense, subjectPool);
  const rows = rowsByTense(verb, subject ?? DEFAULT_ROW_SUBJECT);
  const row = rowFor(rows, tense);

  const isCommand = COMMAND_TENSES.has(tense);
  const person = COMMAND_PERSON[tense];

  return {
    id: crypto.randomUUID(),
    kind: "conjugation",
    verb,
    subject,
    tense,
    tenseLabelEs: meta.labelEs,
    tenseLabelEn: meta.labelEn,
    promptMain: isCommand ? `${verb} → ¡___! (${person})` : verb,
    chips: isCommand
      ? ["Conjugate as a command", meta.labelEs]
      : subject
        ? [PRONOUN[subject], meta.labelEs]
        : [meta.labelEs],
    answers: row.spanish,
    displayAnswer: row.spanish[0],
  };
}

/**
 * Spanish → English: show a Spanish form, accept every English rendering of
 * every row that shares that Spanish form (so "hablamos" accepts both
 * "we speak" and "we spoke").
 */
function translateEsEnQuestion(
  verb: string,
  tense: RowKey,
  subjectPool: SubjectKey[]
): Question | null {
  const meta = ROW_META[tense];
  const subject = pickSubject(tense, subjectPool);
  const rows = rowsByTense(verb, subject ?? DEFAULT_ROW_SUBJECT);
  const chosen = rowFor(rows, tense);

  const display = bareSpanish(chosen);
  let promptMain: string;
  if (COMMAND_TENSES.has(tense)) {
    promptMain = `¡${display}! (${COMMAND_PERSON[tense] ?? ""})`;
  } else if (subject) {
    promptMain = `${PRONOUN[subject]} ${display}`;
  } else {
    promptMain = display;
  }

  const displayedForms = new Set(chosen.spanish);
  const answers: string[] = [];
  for (const row of rows.values()) {
    if (row.spanish.some((form) => displayedForms.has(form))) {
      answers.push(...row.english);
    }
  }
  if (answers.length === 0) return null;

  return {
    id: crypto.randomUUID(),
    kind: "translate-es-en",
    verb,
    subject,
    tense,
    tenseLabelEs: meta.labelEs,
    tenseLabelEn: meta.labelEn,
    promptMain,
    chips: ["ES → EN", meta.labelEs],
    answers: dedup(answers),
    displayAnswer: chosen.english[0],
  };
}

/**
 * English → Spanish: show the row's canonical English phrase, accept every
 * Spanish form from every row whose English contains that exact phrase.
 */
function translateEnEsQuestion(
  verb: string,
  tense: RowKey,
  subjectPool: SubjectKey[]
): Question | null {
  const meta = ROW_META[tense];
  const subject = pickSubject(tense, subjectPool);
  const rows = rowsByTense(verb, subject ?? DEFAULT_ROW_SUBJECT);
  const chosen = rowFor(rows, tense);

  const phrase = chosen.english[0];
  const isCommand = COMMAND_TENSES.has(tense);
  const answers: string[] = [];
  for (const row of rows.values()) {
    if (row.english.includes(phrase)) {
      answers.push(...row.spanish);
    }
  }
  if (answers.length === 0) return null;

  return {
    id: crypto.randomUUID(),
    kind: "translate-en-es",
    verb,
    subject,
    tense,
    tenseLabelEs: meta.labelEs,
    tenseLabelEn: meta.labelEn,
    promptMain: isCommand ? tense === "nos"
    ? `${phrase}!`
    : `${phrase}! (${COMMAND_PERSON[tense]})`
    : phrase,
    chips: ["EN → ES", meta.labelEs],
    answers: dedup(answers),
    displayAnswer: chosen.spanish[0],
  };
}

// ── Public API ───────────────────────────────────────────────

/**
 * One random question for the given settings.
 * Throws when settings.types / settings.tenses are (or filter down to) empty.
 */
export function generateQuestion(settings: QuizSettings): Question {
  const types = settings.types ?? [];
  if (types.length === 0) {
    throw new Error("generateQuestion: settings.types must not be empty");
  }

  const knownTenses = TENSE_ROWS.map((r) => r.key);
  const tenses = (settings.tenses ?? []).filter((t) => knownTenses.includes(t));
  if (tenses.length === 0) {
    throw new Error(
      "generateQuestion: settings.tenses must contain at least one known tense"
    );
  }

  let pool = getVerbPool(settings.level ?? "all");
  if (settings.verbs && settings.verbs.length > 0) {
    const explicit = dedup(settings.verbs.filter((v) => ALL_VERBS.includes(v)));
    if (explicit.length > 0) pool = explicit;
  }
  if (pool.length === 0) {
    throw new Error("generateQuestion: verb pool is empty");
  }

  const kind = pick(types);
  const tense = pick(tenses);
  const verb = pick(pool);

  // subject pool — classic 5 by default, vosotros only when opted in
  const knownSubjects = (settings.subjects ?? []).filter((s) =>
    (SUBJECT_KEYS as readonly string[]).includes(s)
  );
  const subjectPool = knownSubjects.length > 0 ? knownSubjects : DEFAULT_QUIZ_SUBJECTS;

  if (kind === "translate-es-en") {
    const q = translateEsEnQuestion(verb, tense, subjectPool);
    if (q) return q;
  } else if (kind === "translate-en-es") {
    const q = translateEnEsQuestion(verb, tense, subjectPool);
    if (q) return q;
  }
  // conjugation — or the fallback guard when a translation question
  // unexpectedly produced no acceptable answers.
  return conjugationQuestion(verb, tense, subjectPool);
}
