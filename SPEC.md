# SPEC — Tabla de Verbos (Modern Spanish Verb Trainer)

Single-page app at `/` only. Three modes: **Tables** (classical verb chart practice/reference), **Practice** (one-by-one quiz: conjugation or translation, timed or infinite) and **Cards** (flashcards).

> **v2 architecture (current):** the app is a fully **static export** (`output: "export"` in next.config.ts → deployable `out/`, e.g. Netlify). **No server, no API routes, no database.** The conjugation engine / checker / quiz generator are pure TS shared by the client; grading (former `/api/check`, `/api/conjugate`) lives in `src/components/tables/chart-check.ts`, question generation calls `generateQuestion` directly, and ALL persistence (sessions, stats, streak freezes, data export/import/wipe) lives in `src/components/practice/session-store.ts` on `localStorage` (`tdv-sessions`, `tdv-freezes`). The former `Task 3-a` Prisma/API layer is GONE — its contracts are preserved 1:1 by session-store.

## File ownership (do not touch other agents' files)
- `src/app/globals.css`, `src/app/layout.tsx`, `src/components/theme-provider.tsx` — owned by orchestrator (DONE, do not edit).
- `src/lib/conjugator/types.ts` (contains ALL shared types + verb data + row/subject metadata), `src/lib/conjugator/checker.ts` (DONE, orchestrator — do not edit; read-only reference).
- `src/lib/conjugator/engine.ts`, `src/lib/conjugator/quiz.ts` — Task 2 agent only.
- `src/app/page.tsx`, `src/components/app/**`, `src/components/tables/**` — Task 3-b agent only.
- `src/components/practice/**` — Task 3-c agent only.
- NEVER use blue/indigo colors. Use tokens: `primary` (brick red), `accent` (saffron), `success`, `warn`, `muted`, etc. Fonts: `font-display` (Fraunces), default sans (Inter), `font-mono` (IBM Plex Mono). Use existing shadcn/ui components in `src/components/ui`.
- `src/components/practice/session-store.ts` (localStorage persistence — the former API layer) — see contract below.

## Core contracts (already in types.ts / data.ts)

```ts
type SubjectKey = "yo" | "tu" | "el" | "nosotros" | "ellos";       // SUBJECTS meta has es/en/pronoun labels
type RowKey = "inf"|"ger"|"part"|"pres"|"imp"|"pret"|"fut"|"cond"|"pres_perf"|"plu_perf"|"fut_perf"|"cond_perf"|"pres_subj"|"imp_subj"|"pres_perf_subj"|"plu_perf_subj"|"tu_pos"|"tu_neg"|"ud"|"uds"|"vos_pos"|"vos_neg"|"nos";
// TENSE_ROWS: ordered meta for all 23 rows: { key, group: "base"|"indicative"|"perfect"|"subjunctive"|"imperative", labelEs, labelEn }
// VERBS: Record<string, VerbAttrs> — 53 verbs; SP5_VERBS, SP6_VERBS arrays; verbGloss(verb) => first English infinitive w/o "to "
```

## Task 2 — engine.ts / checker.ts / quiz.ts (port from /home/z/my-project/upload/*.js)

### engine.ts
```ts
export interface ConjugationRow {
  key: RowKey; group: RowGroup; labelEs: string; labelEn: string;
  spanish: string[];   // all acceptable Spanish answers (variants: -ra/-se subjunctive, ¡..! commands, alt participles, both reflexive gerund spellings)
  english: string[];   // all acceptable English answers, first item = canonical display form
}
export function conjugate(verb: string, subject: SubjectKey): ConjugationRow[];       // 23 rows, order of TENSE_ROWS
export function conjugateOne(verb: string, subject: SubjectKey, tense: RowKey): { spanish: string[]; english: string[] };
```
Port the logic from `upload/solution_constructor.js` + `upload/constants.js` FAITHFULLY (stem changes, boot verbs, orthographic changes, special forms, reflexive pronoun placement, the `addAccent` hack for nosotros imperfect subjunctive & reflexive commands, ímos rule, y-spelling third person, alternative participle arrays, -ra/-se subjunctive, etc.). Subject indexes: yo=0, tu=1, el=2, nosotros=3, ellos=4 (vosotros=5 exists in some arrays; we only use 5 subjects).
English generation (replaces the old regex approach — produce plain strings, port the be/go/have/multiword "he"-agreement logic):
- pres: "I/you/he/we/they" + am/is/are for "be..."-verbs; "goes to bed"/"has fun" for go/have verbs; verb+s for he otherwise; multi-word verbs add s to first word for he.
- imp: "{sub} used to {inf}" (+ "{sub} was/were {ger}" unless be-verb); pret: be-verb tú/nosotros/ellos → "{sub} were{rest}", else "{sub} {pret}".
- perfects: have/has|had|will have|would have (+that-variants for subjunctive) + participle. fut: "{sub} will {inf}"; cond: "{sub} would {inf}"; cond_perf also allows "would've".
- subjunctive rows: prefix "that {sub} ..."; imp_subj also "{sub} were {ger}" variant + impSubj/pret form.
- commands: tu_pos/ud/uds: ["{inf}!", "{inf}"]; tu_neg: ["don't {inf}!", "don't {inf}"]; nos: ["let's {inf}!", "let's {inf}"]; vos_pos: ["{inf}!"... use "(you all) speak!" variants too]; vos_neg: "don't ...".
- inf: "to {inf}"; ger: "{ger}"; part: "{part}".
Union all translations (e.g. hablar → speak & talk). e_subs = ["i","you","he","we","they"].

### checker.ts
```ts
export type CheckResult = "exact" | "accent" | "wrong";
export function normalizeEs(s: string): string;  // trim, lowercase, collapse spaces, strip ¡!¿?.,;
export function stripAccents(s: string): string; // á->a etc (keep ñ as n? NO — keep ñ distinct: only strip diacritics on vowels + ü)
export function normalizeEn(s: string): string;  // trim, lowercase, collapse spaces, strip .!?,; and apostrophes (don't->dont, let's->lets, would've->wouldve), also allow "(you all)"->"you all"
export function checkAnswer(input: string, answers: string[], lang: "es" | "en"): CheckResult;
// exact normalized match → "exact"; if only accents differ (stripAccents match) → "accent"; else "wrong". English never returns "accent".
```

### quiz.ts
```ts
export type QuestionKind = "conjugation" | "translate-es-en" | "translate-en-es";
export interface QuizSettings { types: QuestionKind[]; tenses: RowKey[]; level: 5 | 6 | "all"; mode: "timed" | "infinite"; durationSec: number; }
export interface Question {
  id: string;               // crypto.randomUUID()
  kind: QuestionKind; verb: string; subject: SubjectKey | null; tense: RowKey;
  tenseLabelEs: string; tenseLabelEn: string;
  promptMain: string;       // conjugation: verb infinitive; translation: the phrase to translate (with subject pronoun baked in for ES, e.g. "nosotros hablamos")
  chips: string[];          // e.g. ["nosotros", "presente"] or ["gerundio"] or ["ES → EN"]
  answers: string[];        // acceptable answers for the client to check instantly (all variants)
  displayAnswer: string;    // canonical answer to reveal
}
export function generateQuestion(settings: QuizSettings): Question;
```
Rules: pick kind/tense/verb/subject randomly from settings (avoid repeating exact same triple consecutively — caller can't know, so just random). Conjugation: prompt = verb, chips = [subject pronoun, tenseLabelEs], answers = row.spanish, displayAnswer = row.spanish[0]. Translation ES→EN: display "{pronoun} {spanish form}" (commands: "¡habla! (tú)"; base rows: just the form), accept English from ALL rows of same verb+subject whose spanish forms include the displayed form (handles hablamos = present/preterite ambiguity). Translation EN→ES: display row.english[0] (canonical, no "!"), accept spanish forms from ALL rows whose english includes that phrase. Only offer `vos_pos`/`vos_neg` etc. if selected in settings.tenses.

## Persistence layer — session-store.ts (replaces the old Task 3-a APIs)
All functions are async (drop-in for the former fetch calls) and run entirely on `localStorage`:
```ts
// key "tdv-sessions" — StoredSession[] (chronological, capped ~600, quota-shedding writes)
interface StoredSession { id; mode: "timed"|"infinite"; durationSec; score; total; accuracy; bestStreak; avgMsPerQuestion; accentWarnings; misses: MissRecord[]; tally: Record<tense,{c,t,ms?}>; createdAt: ISO }
// key "tdv-freezes" — { frozenFor: "YYYY-MM-DD", createdAt: ISO }[]
export async function saveSession(summary: SessionSummary): Promise<SessionRecord>;      // former POST /api/sessions (same normalization/caps)
export async function fetchSessions(limit=8): Promise<{ recent; stats }>;               // former GET  /api/sessions
export async function fetchFocusStats(): Promise<FocusStatsResponse>;                   // former GET  /api/sessions/stats (trend, hardest verbs/tenses, slowestTense, bestHour, recentMisses, daily incl. racha/freezes/heatmap days)
export async function claimStreakFreeze(): Promise<{ ok; error? }>;                     // former POST /api/streak-freeze (4 validations, same error strings, 1/week)
export function exportPracticeData(): string;                                           // JSON backup blob { app: "tabla-de-verbos", version, sessions, freezes }
export function importPracticeData(json): { ok; imported?; error? };                     // merges, dedupes by id/frozenFor
export function clearPracticeData(): void;                                              // wipes both keys
// import/clear dispatch window event "tdv-data-changed" — practice-mode listens + refreshes live
```
Tables-mode grading (former `/api/check` + `/api/conjugate`) is ported to `src/components/tables/chart-check.ts` (`checkChart`, `conjugateChart`, `buildRevealData` — pure, synchronous, same response shapes).

## Task 3-b — Page shell + Tables mode (src/app/page.tsx + src/components/app/* + src/components/tables/*)
page.tsx ('use client'): sticky glassy header: logo mark (inline SVG: red rounded square w/ cream "«V»" or accent-tilde motif) + "Tabla de Verbos" in font-display italic + tagline "spanish verb mastery" (mono, uppercase, tracking-widest, muted). Segmented mode switcher (Tables | Practice) with framer-motion `layoutId` pill + icons (Table2, Zap). Theme toggle (Sun/Moon). Main: `min-h-[calc(100vh-...)]` flex-col, AnimatePresence mode transitions. Footer (mt-auto, thin, mono small): "53 verbs · 23 forms · 5 subjects" + "Enter = next · accents count". Sticky-footer layout: root div `min-h-screen flex flex-col`, footer `mt-auto`.
TablesMode: control card (verb Combobox — searchable over 53 verbs w/ gloss + level badge; subject segmented control; level filter chips All/Spanish 5/Spanish 6; buttons: Check (primary), Clear, Reveal answers (toggle → switches chart to read-only reference showing all correct forms), Random (dice)). Chart card: grouped sections (Los básicos / Indicativo / Perfecto / Subjuntivo / Imperativo) with ruled-paper background (use `.bg-ruled`), rows = label (es + en gloss) + Spanish input + English input. After Check: green ring + ✓ for correct, red ring + expected answer underneath for wrong; toast summary (use sonner `toast`). Enter moves to next input. Persist state (verb/subject/answers) in localStorage `tdv-tables`. Check calls `checkChart` (tables/chart-check.ts); Reveal computes `buildRevealData` locally (instant, no spinner). Mobile: stacked layout. All interactive ≥44px touch targets. Import PracticeMode from "@/components/practice/practice-mode" (Task 3-c builds it — assume `export default function PracticeMode()`).

## Task 3-c — Practice mode (src/components/practice/*)
`practice-mode.tsx` default-exports `<PracticeMode />`. Screens: **setup → quiz → results** (internal state machine).
- Setup card: question-type toggle cards (Conjugation w/ Sigma/Conjugation icon, ES→EN, EN→ES), tense chips (multi-select, quick presets "Core", "All", "None" — Core = pres/pret/imp/fut/cond), verb level segmented (Sp 5 / Sp 6 / All + count), mode cards: Timed (chips 1/2/5/10 min) vs Infinite, big Start button (primary). Show personal bests + recent sessions from `fetchSessions()` (session-store; skeletons while loading). Persist settings localStorage `tdv-practice`.
- Quiz: header strip = score, streak (flame, animated pop on change), accuracy, and for timed: animated SVG countdown ring turning red <20% + "end" button; infinite: elapsed mm:ss. Question card (framer-motion, key=question.id, slide+fade): chips row (mono uppercase), promptMain in font-display large (5xl-7xl). Answer input: large centered autofocus; accent helper buttons (á é í ó ú ñ ü) insert at caret; Enter submits; Skip (counts wrong). Next question comes from `fetchQuestionDetailed` (types.ts — local `generateQuestion`, prefetched while answering for snappiness). Feedback: exact → green border flash + "¡Correcto!" auto-advance ~600ms; accent → amber "Almost — watch the accents: {displayAnswer}" (counts correct, tracked as accentWarning) auto-advance; wrong → red shake + "Answer: {display}" + Enter to continue. Timed ends automatically at 0; then `saveSession(summary)` (session-store; body per the persistence contract; misses = last 50 wrong) → results.
- Results: big accuracy ring, stat grid (score, best streak, avg time/question, accent warnings), mode/duration line, confetti (canvas-confetti, brand colors [#c2410c-ish red, #d9a441 saffron, #5c8a4e olive]) when accuracy ≥ 0.8 && total ≥ 5, missed-questions review list (max-h-96 overflow-y-auto custom scrollbar), buttons "Practice again" / "Change settings", recent sessions list.

## Design language (everyone)
Warm editorial "language workbook" feel — NOT generic AI-purple-gradient. Cream paper bg, ink text, brick-red primary, saffron/olive accents, mono uppercase micro-labels, serif display headlines, subtle borders (border-border), rounded-xl cards with soft shadow, generous whitespace, dotted/ruled paper textures where fitting, framer-motion micro-interactions (layoutId pill, card slides, shake on wrong, pop on streak). Light + dark must both look right.
