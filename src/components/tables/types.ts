// ─────────────────────────────────────────────────────────────
// Tables mode — shared client types (Task 3-b)
// ─────────────────────────────────────────────────────────────
import type { RowKey, SubjectKey } from "@/lib/conjugator/types";

export type LevelFilter = "all" | 5 | 6;

export type CellLang = "es" | "en";

/** the user's typed answers for one chart row */
export interface CellAnswer {
  es: string;
  en: string;
}

export type AnswersMap = Partial<Record<RowKey, CellAnswer>>;

/** per-cell verdict returned by POST /api/check */
export interface VerdictEs {
  correct: boolean;
  accentOnly: boolean;
  expected: string;
}

export interface VerdictEn {
  correct: boolean;
  expected: string;
}

export interface CellVerdict {
  es?: VerdictEs;
  en?: VerdictEn;
}

export type VerdictsMap = Partial<Record<RowKey, CellVerdict>>;

/** one row of POST /api/conjugate */
export interface ConjugateRowData {
  key: RowKey;
  spanish: string[];
  english: string[];
}

export type RevealData = Partial<Record<RowKey, { spanish: string[]; english: string[] }>>;

/** POST /api/check response */
export interface CheckApiResponse {
  verdicts: VerdictsMap;
  summary: { correctCells: number; totalCells: number };
}

/** POST /api/conjugate response */
export interface ConjugateApiResponse {
  verb: string;
  subject: SubjectKey;
  rows: ConjugateRowData[];
}
