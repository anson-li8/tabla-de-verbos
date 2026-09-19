# Task 3-a — API Builder (api-builder)

Task: Prisma `PracticeSession` schema + all five API routes
(`/api/conjugate`, `/api/check`, `/api/practice/question`, `/api/verbs`,
`/api/sessions` GET+POST) with zod validation, `force-dynamic`, and the
`{ error: string }` error shape. No server actions.

## Files created/modified

- `prisma/schema.prisma` — User/Post replaced with `PracticeSession`
  (id cuid, mode, durationSec, score, total, accuracy Float 0..1, bestStreak,
  avgMsPerQuestion, accentWarnings @default(0), misses String @default("[]")
  JSON, createdAt). Generator/datasource blocks untouched;
  `DATABASE_URL=file:.../db/custom.db` kept as configured.
  `bun run db:push` → in sync, Prisma Client v6.19.2 regenerated.
- `src/app/api/conjugate/route.ts` — POST: zod `{verb, subject}` (subject enum
  of the 5 keys), verb must be a `VERBS` key (400 `Unknown verb "…"`), returns
  `{verb, subject, rows: conjugate(...)}`.
- `src/app/api/check/route.ts` — POST: grades the 23 rows in TENSE_ROWS order;
  only filled cells (non-empty after trim) produce verdicts; es graded with
  accent detection, en exact-only; `summary.correctCells` counts exact +
  accentOnly. `expected` = canonical + up to 2 alternates joined " / ",
  skipping pure ¡…!/!-variants; accentOnly cells get the properly-accented
  counterpart of the user's input (see deviations).
- `src/app/api/practice/question/route.ts` — POST: partial QuizSettings;
  defaults types `["conjugation"]`, tenses `["pres"]`, level `"all"`, mode
  `"infinite"`, durationSec 120; unknown kinds/tenses filtered; either list
  empty after filtering → 400; returns `generateQuestion(settings)` directly.
- `src/app/api/verbs/route.ts` — GET: 52 verbs `{infinitive, level, gloss}`
  (verbLevel + verbGloss), Spanish-collation alphabetical sort.
- `src/app/api/sessions/route.ts` — GET: `?limit` clamped 1..25 (default 8,
  non-integer → 400), recent by createdAt desc (misses column excluded),
  stats from one `aggregate()` over ALL sessions (bestAccuracy **null** when
  the table is empty — UI only reads stats when totalSessions > 0). POST:
  full validation (mode enum; durationSec ≤ 86400; score ≤ total ≤ 1000 with
  explicit 400 when score > total; bestStreak/accentWarnings ≤ 1000; accuracy
  0..1; avgMsPerQuestion int ≥ 0; misses ≤ 50 items), misses normalized
  (strings trimmed; verb capped 40 chars, other fields 120 — slice, empty/
  null subject → null) and stored as a JSON string; 201 `{ session: {...} }`.

## Verification (all against the running dev server on :3000)

- `POST /api/conjugate` tener/nosotros → 23 rows, TENSE_ROWS order, values
  identical to a direct `conjugate()` run (tuvimos, tuviéramos/tuviésemos,
  ten/¡ten!, no tengáis, tengamos/¡tengamos!…). Bad verb/subject/JSON → 400.
- `POST /api/check` hablar/nosotros with 19 filled cells (right/wrong/empty/
  whitespace/accent-missing mix) → `correctCells 16 / totalCells 19`;
  accent-only counted correct; `hablabamos`→accentOnly expected `hablábamos`;
  `hablaramos`→expected `habláramos`; whitespace-only en omitted from
  verdicts; unfilled rows absent; `tu_pos` es expected `habla` (no ¡…! dupe);
  `tu_neg` en expected `don't talk / don't speak`.
- `POST /api/practice/question`: `{}` → conjugation/pres default question;
  full settings → e.g. translate-es-en `¡está! (tú)` with unioned answers;
  `types:["bogus"]` → 400; `tenses:["bogus"]` → 400; mixed bogus+valid →
  filtered to valid; `level:7` → 400; `durationSec:0` → 400.
- `GET /api/verbs` → exactly 52 (28 sp5 + 24 sp6), all glosses non-empty,
  es-collation sorted.
- `POST /api/sessions` fake sessions → 201; `GET /api/sessions` →
  persistence + stats math verified with 5 rows (totalQuestions 72,
  avgAccuracy 0.79, bestAccuracy 1, bestScore 20, bestStreak 20, desc order);
  `accuracy:5` → 400; `score>total` → 400; bad mode → 400; 51 misses → 400;
  negative bestStreak → 400; `limit=0`→1, `limit=100`→25, `limit=abc`→400.
  Miss normalization verified (64-char verb → 40, 300-char expected → 120,
  `"  ser  "` → `ser`, empty subject → null) incl. raw JSON-string storage
  check via a direct Prisma read.
- All curl-test rows deleted afterward → DB ships empty (clean first-run
  "no sessions yet" state). `GET /api/sessions` now returns
  `{recent:[], stats:{…zeros, bestAccuracy:null}}`.
- `bun run lint` clean; `bunx tsc --noEmit` — no issues in `src/app/api/**`
  or `prisma/` (remaining errors are pre-existing in `examples/`+`skills/`).

## Deviations / decisions (all minor)

1. **accentOnly `expected`**: shows the accented variant that actually matches
   the user's input (found via accent-stripped comparison) rather than always
   `spanish[0]`. Equals `spanish[0]` in the canonical case; strictly better
   when the user typed an alternate variant (e.g. `-se` subjunctive) without
   accents.
2. **POST /api/sessions response**: `misses` is returned as the parsed,
   normalized array (DB still stores the JSON string per spec).
3. **Check-route `answers` schema** is a lenient `z.record(z.string(), {es?, en?})`
   — extra junk keys are stripped by zod; unknown row keys are ignored.
4. Test data cleaned up after verification (empty table at handoff).

## Notes for downstream agents

- The old template `src/app/api/route.ts` (GET /api → "Hello, world!") was
  left untouched — harmless, but Task 4/5 may delete it if desired.
- Observation for QA: the static footer in `src/app/page.tsx` (3-b's file)
  says "53 verbs" but the catalogue is 52 (28 + 24). 3-c's setup screen uses
  live counts (`VERB_COUNTS`), so it's correct.
- `stats.bestAccuracy` is `null` (not 0) when there are no sessions —
  `records-strip.tsx` guards with `totalSessions === 0`, so this is never
  rendered as a number.
