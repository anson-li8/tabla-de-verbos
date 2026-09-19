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

/** per-cell verdict returned by checkChart (tables/chart-check) */
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

/** one row of conjugateChart (tables/chart-check) */
export interface ConjugateRowData {
  key: RowKey;
  spanish: string[];
  english: string[];
}

export type RevealData = Partial<Record<RowKey, { spanish: string[]; english: string[] }>>;

/** checkChart response (local grading) */
export interface CheckApiResponse {
  verdicts: VerdictsMap;
  summary: { correctCells: number; totalCells: number };
}

/** conjugateChart response (local engine) */
export interface ConjugateApiResponse {
  verb: string;
  subject: SubjectKey;
  rows: ConjugateRowData[];
}
