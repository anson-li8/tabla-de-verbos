// ─────────────────────────────────────────────────────────────
// Tabla de Verbos — Practice mode: shared client-side types,
// constants, formatters and API fetchers.
// ─────────────────────────────────────────────────────────────

import {
  ALL_VERBS,
  SP5_VERBS,
  SP6_VERBS,
  type RowKey,
  type SubjectKey,
} from "@/lib/conjugator/types";

// ── Types ────────────────────────────────────────────────────

export type QuestionKind = "conjugation" | "translate-es-en" | "translate-en-es";
export type Level = 5 | 6 | "all";
export type SessionMode = "timed" | "infinite";

export interface QuizSettings {
  types: QuestionKind[];
  tenses: RowKey[];
  level: Level;
  mode: SessionMode;
  durationSec: number;
}

export interface Question {
  id: string;
  kind: QuestionKind;
  verb: string;
  subject: SubjectKey | null;
  tense: string;
  tenseLabelEs: string;
  tenseLabelEn: string;
  promptMain: string;
  chips: string[];
  answers: string[];
  displayAnswer: string;
}

export interface MissRecord {
  verb: string;
  subject: SubjectKey | null;
  tense: string;
  kind: QuestionKind;
  given: string;
  expected: string;
  userAnswer: string;
}

export interface SessionSummary {
  mode: SessionMode;
  durationSec: number;
  score: number;
  total: number;
  accuracy: number;
  bestStreak: number;
  avgMsPerQuestion: number;
  accentWarnings: number;
  misses: MissRecord[];
}

export interface SessionRecord {
  id: string;
  mode: string;
  durationSec: number;
  score: number;
  total: number;
  accuracy: number;
  bestStreak: number;
  avgMsPerQuestion: number;
  accentWarnings: number;
  createdAt: string;
}

export interface SessionStats {
  totalSessions: number;
  bestAccuracy: number;
  bestScore: number;
  bestStreak: number;
  avgAccuracy: number;
  totalQuestions: number;
}

export interface SessionsResponse {
  recent: SessionRecord[];
  stats: SessionStats;
}

// ── Constants ────────────────────────────────────────────────

/** the app's signature micro-label style (mono uppercase) */
export const MICRO =
  "font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground";

/** curated practice tenses (skips inf/ger/part and the vos_* rows) */
export const PRACTICE_TENSES: RowKey[] = [
  "pres",
  "imp",
  "pret",
  "fut",
  "cond",
  "pres_perf",
  "plu_perf",
  "fut_perf",
  "cond_perf",
  "pres_subj",
  "imp_subj",
  "tu_pos",
  "tu_neg",
  "ud",
  "uds",
  "nos",
];

/** "core" tense preset */
export const CORE_TENSES: RowKey[] = ["pres", "imp", "pret", "fut", "cond"];

/** timed challenge durations in seconds (1 / 2 / 5 / 10 min) */
export const DURATION_OPTIONS = [60, 120, 300, 600];

const KIND_VALUES: string[] = [
  "conjugation",
  "translate-es-en",
  "translate-en-es",
];

export const DEFAULT_SETTINGS: QuizSettings = {
  types: ["conjugation", "translate-es-en", "translate-en-es"],
  tenses: [...CORE_TENSES],
  level: "all",
  mode: "timed",
  durationSec: 120,
};

/** merge untrusted JSON (localStorage) with defaults */
export function sanitizeSettings(raw: unknown): QuizSettings {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_SETTINGS };
  const r = raw as Partial<QuizSettings>;
  const types = Array.isArray(r.types)
    ? r.types.filter((t): t is QuestionKind => KIND_VALUES.includes(t as string))
    : [];
  const tenses = Array.isArray(r.tenses)
    ? r.tenses.filter(
        (t): t is RowKey => (PRACTICE_TENSES as string[]).includes(t as string)
      )
    : [];
  return {
    types: types.length > 0 ? types : [...DEFAULT_SETTINGS.types],
    tenses: tenses.length > 0 ? tenses : [...DEFAULT_SETTINGS.tenses],
    level:
      r.level === 5 || r.level === 6 || r.level === "all"
        ? r.level
        : DEFAULT_SETTINGS.level,
    mode:
      r.mode === "timed" || r.mode === "infinite"
        ? r.mode
        : DEFAULT_SETTINGS.mode,
    durationSec: DURATION_OPTIONS.includes(r.durationSec as number)
      ? (r.durationSec as number)
      : DEFAULT_SETTINGS.durationSec,
  };
}

// ── Formatting helpers ───────────────────────────────────────

function formatSec(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** elapsed time as mm:ss (floors) */
export function formatMs(ms: number): string {
  return formatSec(Math.floor(Math.max(0, ms) / 1000));
}

/** countdown as mm:ss (ceils — never shows 00:00 early) */
export function formatCountdownMs(ms: number): string {
  return formatSec(Math.ceil(Math.max(0, ms) / 1000));
}

/** "5 min" for whole minutes, otherwise m:ss */
export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "0:00";
  if (sec % 60 === 0) return `${sec / 60} min`;
  return formatSec(Math.round(sec));
}

/** simple relative time: "just now" / "5m ago" / "3h ago" / "mar 4" */
export function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  if (diff < 45_000) return "just now";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** chip label for a question kind */
export function kindLabel(kind: QuestionKind): string {
  if (kind === "translate-es-en") return "es → en";
  if (kind === "translate-en-es") return "en → es";
  return "conjugation";
}

/** which normalizer applies to the expected answer */
export function answerLang(kind: QuestionKind): "es" | "en" {
  return kind === "translate-es-en" ? "en" : "es";
}

// ── API fetchers (contracts owned by Task 3-a) ───────────────

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`${url} failed with ${res.status}`);
  return (await res.json()) as T;
}

function validateQuestion(q: Question): Question {
  if (
    !q ||
    typeof q.id !== "string" ||
    typeof q.promptMain !== "string" ||
    typeof q.displayAnswer !== "string" ||
    !Array.isArray(q.answers)
  ) {
    throw new Error("malformed question from /api/practice/question");
  }
  return q;
}

/** POST /api/practice/question → next Question */
export async function fetchQuestion(settings: QuizSettings): Promise<Question> {
  const q = await postJson<Question>("/api/practice/question", settings);
  return validateQuestion(q);
}

/** GET /api/sessions?limit=8 → { recent, stats } */
export async function fetchSessions(): Promise<SessionsResponse> {
  const res = await fetch("/api/sessions?limit=8", {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`/api/sessions failed with ${res.status}`);
  const data = (await res.json()) as SessionsResponse;
  if (!data || !Array.isArray(data.recent) || !data.stats) {
    throw new Error("malformed sessions response");
  }
  return data;
}

/** POST /api/sessions — persist a finished session */
export function saveSession(summary: SessionSummary): Promise<unknown> {
  return postJson<unknown>("/api/sessions", summary);
}

/** re-exported so setup can show counts without importing data directly */
export const VERB_COUNTS = {
  sp5: SP5_VERBS.length,
  sp6: SP6_VERBS.length,
  all: ALL_VERBS.length,
} as const;
