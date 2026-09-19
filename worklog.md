# Project Worklog — Tabla de Verbos (Modern Spanish Verb Trainer)

## Project Vision
Rebuild the classic "tabladeverbos" Spanish verb chart app as a modern, editorial-feeling web app with:
1. **Tables mode** (classical): searchable verb picker + subject, fill-in conjugation chart (23 forms), check answers with per-cell feedback, reveal/reference mode.
2. **Practice mode** (new): one-by-one random questions — (a) conjugation (random verb+subject+tense), (b) translation ES→EN, (c) translation EN→ES. Timed challenge (user-set timer, max correct/accuracy) or Infinite mode. Streaks, accuracy stats, session history persisted in SQLite via Prisma.

## Architecture
- Next.js 16 App Router, single route `/` (client SPA with two mode tabs).
- Conjugation engine ported from original JS to TypeScript at `src/lib/conjugator/` (pure logic, shared by API + client).
- APIs (all under `/api`, no server actions): `/api/conjugate` (POST), `/api/check` (POST), `/api/practice/question` (POST), `/api/verbs` (GET), `/api/sessions` (GET/POST).
- Prisma SQLite: `PracticeSession` model.
- Design: warm paper/editorial aesthetic — Fraunces (display) + Inter (body) + IBM Plex Mono (labels), Spanish-brick-red primary, cream background, no blue/indigo. Light+dark themes. Framer Motion animations.

## Full spec & contracts
See `/home/z/my-project/SPEC.md` — ALL agents must read it before working.

## Task log

---
Task ID: 1
Agent: main-orchestrator
Task: Foundation — spec, design system, shared types & verb data

Work Log:
- Analyzed uploaded legacy app (app.js, constants.js, verbinfo.js, solution_constructor.js) — 53 verbs, conjugation engine for 23 forms x 5 subjects.
- Wrote /home/z/my-project/SPEC.md with all contracts (engine, checker, quiz, API, UI components).
- Installed canvas-confetti.
- Rewrote src/app/globals.css (warm paper palette, light+dark, success/warn tokens, ruled-paper utility, custom scrollbars).
- Rewrote src/app/layout.tsx (Fraunces + Inter + IBM Plex Mono via next/font, ThemeProvider, metadata).
- Created src/components/theme-provider.tsx and public/icon.svg.
- Created src/lib/conjugator/types.ts (SubjectKey, RowKey, row metadata, VerbAttrs types).
- Created src/lib/conjugator/data.ts (all 53 verbs transcribed from verbinfo.js, fixed legacy "contruy"→"construy" typo bug).

Stage Summary:
- Design system + shared data layer ready for all downstream agents.
- Pending: engine port (Task 2), APIs (3-a), Tables UI (3-b), Practice UI (3-c), integration (4), QA (5).

---
Task ID: 3-b
Agent: ui-tables
Task: App shell (page.tsx) + Tables mode (classical verb-chart practice)

Work Log:
- Rewrote `src/app/page.tsx` as 'use client' shell: sticky glassy header (logo mark + Fraunces-italic wordmark + mono uppercase tagline), ModeSwitcher (Tables/Practice segmented control w/ framer-motion `layoutId` pill, Table2/Zap icons), ThemeToggle (next-themes, hydration-safe via `useSyncExternalStore` mounted flag), main with `AnimatePresence mode="wait"` fade/slide transitions, computed footer ("53 verbs · 23 forms · 5 subjects" / "enter to advance · accents count"), sticky-footer layout (`min-h-screen flex flex-col` + `mt-auto` footer).
- Built `src/components/app/logo-mark.tsx`: hand-crafted inline SVG — brick-red rounded square (var(--primary)) with cream stroke «v» monogram, theme-token driven.
- Built TablesMode state machine: verb/subject/level/answers/verdicts/reveal + loading flags; localStorage persistence (`tdv-tables`) with validated hydration (verb ∈ ALL_VERBS, subject ∈ SUBJECT_KEYS, level ∈ all|5|6, answers sanitized row-by-row) and persist-on-change; verb/subject changes clear answers+verdicts; editing a cell clears only that cell's verdict.
- Check flow: POST /api/check → per-cell verdicts (green tint + Check icon for correct; red tint + mono expected answer below for wrong/empty; amber tint + "watch the accents — {expected}" for accentOnly), toast summary ("X / Y correct — Z%", "¡Perfecto!" on all-correct + Check-button success pulse via useAnimationControls), destructive toast + retry hint on network failure; Check disabled in reveal mode.
- Reveal flow: POST /api/conjugate (refetches when verb/subject change while in reference mode, cancellation-guarded) → read-only chart with primary answer in font-display + "also: …" alternates (first 3, mono xs muted), skeleton cells while loading, saffron "reference mode — answers shown" banner, stale-data guard via revealKey.
- Verb picker: Popover+Command combobox, accent-insensitive search over verb + all English glosses, grouped "español 5"/"español 6" with level badges, `scrollbar-thin` max-h-72 list, trigger-width popover; when current verb falls outside the level filter it's kept + flagged with a warn "sp N" badge (tooltip explains).
- Subject picker (5 segmented buttons, short labels on mobile) + level filter chips (all / sp 5 / sp 6); Random uses the current level pool; all controls ≥44px touch targets, mono uppercase micro-labels.
- Chart card: header (verb italic display + gloss + subject/level badges), `bg-ruled` paper sheet, sticky-in-card group headers (los básicos / indicativo / los perfectos / el subjuntivo / el imperativo + English hints, fade-in on mount, bg-card/90 backdrop-blur so rows slide under), desktop column labels (form/español/english), 23 rows in TENSE_ROWS order — label cell (labelEs + labelEn) + Spanish/English inputs, `grid-cols-[minmax(120px,1fr)_1fr_1fr]` on md, stacked label-above-side-by-side inputs on mobile (`md:contents` trick), h-11 inputs (Spanish text-lg).
- Enter flow: querySelectorAll over `input[data-cell]` in DOM order → Enter focuses+selects next (es→en→next row), Enter on last input triggers Check.
- API contracts consumed exactly as spec'd: POST /api/check `{verb,subject,answers}` → verdicts+summary; POST /api/conjugate `{verb,subject}` → rows (defensive: optional-chaining + array guards).
- `bun run lint` clean (fixed react-hooks/set-state-in-effect via useSyncExternalStore; inlined static GROUPS instead of useMemo factory); `tsc --noEmit` shows only the expected TS2307 for `@/components/practice/practice-mode` (Task 3-c, parallel).

Stage Summary:
- Files created: `src/app/page.tsx` (rewritten), `src/components/app/logo-mark.tsx`, `src/components/app/mode-switcher.tsx`, `src/components/app/theme-toggle.tsx`, `src/components/tables/types.ts`, `src/components/tables/verb-picker.tsx`, `src/components/tables/subject-picker.tsx`, `src/components/tables/conjugation-chart.tsx`, `src/components/tables/tables-mode.tsx`.
- Tables mode fully functional against the spec'd API contracts; state persists across reloads/mode switches via localStorage.
- Page compiles except the intentional `import PracticeMode from "@/components/practice/practice-mode"` (Task 3-c's file, not yet landed at time of writing — per instructions do NOT create it). Once 3-c delivers the default export, the page compiles end-to-end.
- No blue/indigo; warm paper/brick/saffron token palette only; light+dark verified via token usage; responsive mobile-first; a11y: aria-labels/aria-pressed/aria-invalid, semantic header/main/footer/sections, sr-only covered by shadcn primitives.

---
Task ID: 2
Agent: engine-porter
Task: Port conjugation engine (engine.ts) + quiz generator (quiz.ts) from legacy upload/*.js, with verification script

Work Log:
- Read SPEC.md, upload/solution_constructor.js, upload/constants.js, upload/verbinfo.js, types.ts, checker.ts.
- Created src/lib/conjugator/engine.ts — faithful 1:1 port of getSolution as a pure function: all legacy constants (reflexive_pronouns incl. vosotros "os", 6-entry pres_endings, haber tables, -ra/-se imp_subj_endings, e_subs), addAccent (last unaccented vowel), stemChange (oneLetter flag for gerund/3rd-person pret), getYo, getEllos (i-removal + a/e/u→y with q/g guard, specialForms.pret override), getPresSubj (yo→él mapping, nosotros/vosotros un-booting í→i plus ie→e/i→e/ue→o (non-IR) or ie→i/i→i/ue→u (IR), "adquir" special, AR orthographic c→qu/g→gu/z→c), the reír→reímos rule, pret orthographic z→c/g→gu/c→qu + caer/creer "í" endings, future/conditional stems, reflexive "me - hablado".replace("-", haber) trick, reflexive command pronoun relocation (siéntate/siéntese/síntense-style substring hacks), vosotros +/- (hablad, vestíos, no + pres subj), nosotros command (ámonos/émonos), alternative participle propagation (frito/freído appended everywhere the participle appears).
- ROW STRUCTURE CHANGE vs original: the two duplicated "vos" rows become "vos_pos" (affirmative, e.g. hablad/vestíos) and "vos_neg" (no habléis) — spanish answers include bare + ¡…! forms; imp_subj keeps -ra/-se; plu_perf_subj keeps both haber variants; every value is a string[] (deduped, first = canonical).
- English generation ported from the legacy RegExp templates to plain strings, unioned across ALL translation sets: be/go/have/multi-word "he"-agreement (i am / he is / you are, he goes to bed, he has fun, he gets dressed, he speaks), imp "used to" + was/were gerund, be-verb preterite "were", perfects, "would've" variant, "that …" subjunctives, command variants incl. "(you all) …" for vosotros; canonical = first item (commands canonical without "!").
- Created src/lib/conjugator/quiz.ts — getVerbPool (SP5/SP6/all), generateQuestion: uniform random kind/tense(filtered to known RowKeys)/verb/subject, crypto.randomUUID ids, throws on empty types/tenses; conjugation questions (promptMain=verb, chips=[pronoun,labelEs]); ES→EN (prompt "nosotros hablamos" / "¡habla! (tú)" style, answers = union of english from all rows of same verb+subject sharing any Spanish form — hablamos accepts "we speak" AND "we spoke"); EN→ES (prompt = canonical english phrase, answers = union of spanish from all rows containing that phrase); guard falls back to a conjugation question on empty answers.
- Design decision (documented): command rows (tu_pos/tu_neg/ud/uds/vos_pos/vos_neg/nos) are subject-independent in the engine, so their questions carry subject=null and chips=[labelEs] (the label "tú +"/"usted"/"vosotros −" already names the person); inf/ger/part also subject=null (rows built internally with "el").
- Created scripts/verify-engine.ts — runnable bun script, collects failures, prints diff list + final "PASS n/n", exit≠0 on failure. Covers: all 70 specified Spanish cases (+ "ríamos" negative check, alt-participle in compounds, reflexive gerund/perfect/imp_subj extras, full ir chart), all 17 specified English cases (+ canonical-order checks), 5-sample-verb structure (23 rows, TENSE_ROWS order, ROW_META match, non-empty), full sweep: every verb × subject × tense conjugateOne ≡ conjugate row + no-throw + 23 non-empty rows, 50 random questions (shape, unique ids, displayAnswer accepted via checkAnswer), invalid-settings throws, unknown-tense filtering, base/command subject=null chips, and the hablamos present/preterite disambiguation end-to-end in both directions.
- Results: `bun scripts/verify-engine.ts` → PASS 13398/13398 (stable across runs); `bun run lint` → clean; `bunx tsc --noEmit` → no errors in engine.ts/quiz.ts/scripts (remaining repo errors are other agents' pending files: page.tsx awaiting practice-mode, examples/, skills/). Extra stress run: 5,980 rows (52 verbs × 5 subjects × 23 tenses) — every spanish/english variant is an "exact" checkAnswer match, 0 violations.

Stage Summary:
- engine.ts + quiz.ts done and verified; conjugate/conjugateOne/generateQuestion/getVerbPool ready for API routes (/api/conjugate, /api/practice/question) and both UI modes.
- Known faithful-to-original quirks preserved on purpose: construir preterite 3rd person ("constrió/constrieron" — original never applies the -uir y-spelling to non-u-final stems) and addAccent accenting the last stem vowel of imp_subj for e→i stem-changing -ir verbs; neither is user-facing in the verify list.
- Deviations from spec (documented above): command-row questions use subject=null + chips=[labelEs] instead of a random subject pronoun (labels carry the person; avoids misleading "yo"+"tú +" chips); spanish/english arrays are order-preserving deduped (duplicated translation sets like tener's two "have" sets no longer double-list answers).
- Ready for Task 3-a (APIs), 3-b (Tables), 3-c (Practice).

---
Task ID: 3-c
Agent: ui-practice
Task: Practice mode — full setup → quiz → results experience (src/components/practice/**)

Work Log:
- Created src/components/practice/types.ts — client-side types (Question, QuizSettings, SessionSummary, MissRecord, SessionRecord/Stats/SessionsResponse), constants (PRACTICE_TENSES = the 16 curated practice rows, CORE_TENSES, DURATION_OPTIONS 1/2/5/10 min, DEFAULT_SETTINGS, MICRO mono-label class), sanitizeSettings() for localStorage hydration, formatters (formatMs/formatCountdownMs mm:ss with floor vs ceil, formatDuration "5 min"/"12:34", timeAgo "just now"/"5m ago"/"3d ago", kindLabel, answerLang) and fetchers (fetchQuestion/fetchSessions/saveSession) with AbortSignal.timeout(10s) + response validation against the 3-a contracts.
- Created src/components/practice/practice-mode.tsx — default export `PracticeMode` (no props, consumed by 3-b's page). Screen state machine setup/quiz/results inside AnimatePresence mode="wait"; settings persisted to localStorage "tdv-practice" (validated hydration, persist-on-change); GET /api/sessions on mount (silent fail); Start flow fetches the first question with spinner in the button + "connection hiccup — retry" fallback, then mounts QuizScreen keyed by sessionKey; on quiz end (total>0) awaits POST /api/sessions (quiz shows "saving session…" state) then results + sessions refetch; empty end returns to setup; "practice again" reuses the same settings.
- Created src/components/practice/setup-screen.tsx — records strip (RecordsStrip) + dotted-paper form card with staggered framer-motion section entrances: three question-type toggle cards (Languages/ArrowRight/ArrowLeft + descriptions, multi-select), 16 tense chips (labelEs from ROW_META) with core/all/none presets + "N of 16 selected" counter, verb-set segmented control (español 5 / español 6 / all with 29/24/53 counts from SP5/SP6/ALL lengths, motion layoutId pill), Timed-challenge/Infinite mode cards with duration chips animating in for timed, big h-14 Start button ("empezar", Play icon, disabled + tooltip when no question type or no tense selected).
- Created src/components/practice/quiz-screen.tsx — sticky top strip (top-16 below 3-b's h-16 header): animated SVG countdown ring (40px, primary→destructive under 20% remaining) + mono mm:ss for timed / elapsed clock for infinite, questions/score/streak (Flame pops via keyed spring remount, primary-colored when hot)/acc stats, End button with AlertDialog "finish early?" confirm. Question card: motion.div keyed by question.id (x+44 slide-in 250ms, quick fade/slide exit), chips row (pronoun + tenseLabelEs or "ES → EN"/"EN → ES" + tense) + subtle kind icon, promptMain as the hero in font-display text-4xl/5xl/6xl centered, h-14 centered text-2xl input (autofocus, autocomplete/spellcheck off) with arrow submit button, accent keys (á é í ó ú ñ ü, 44px, insert at caret via selectionStart + rAF refocus), skip → counts as wrong and reveals. Instant checkAnswer flow: exact → success border + "¡correcto!" (Fraunces italic) + 550ms auto-advance; accent → warn styling + "so close — accents: {displayAnswer}" (counts correct, accentWarnings++) + 900ms; wrong → shake keyframes + "answer: {displayAnswer}" + "press enter to continue" (+ continue button for touch). Enter handled via input keydown while asking and a window listener after answers (input goes readOnly to keep focus); empty submit shakes instead. Question prefetching (next kept in state, blocking fetch + retry card as fallback); timestamp-based countdown (Date.now math in a 250ms interval, zero drift); auto-finish at 0; latest-ref pattern for finish/advance so timers never call stale closures.
- Created src/components/practice/results-screen.tsx — hero with animated stroke-drawing accuracy ring (success ≥80% / primary 50–79% / destructive <50%, big Fraunces % inside) + score "34 / 40", mono mode line ("timed · 5 min" / "infinite · 12:34"), best streak (Flame), avg s/question, accent warnings (warn); canvas-confetti (brand colors #b03d2c/#d9a441/#5c8a4e/#e8d5b5, two corner bursts ~90 particles, gravity 0.9, try/catch, ref-guarded against StrictMode double-fire, disableForReducedMotion) when accuracy ≥ 0.8 && total ≥ 5; "review your misses" card (max-h-96 overflow-y-auto scrollbar-thin; per-miss verb + pronoun/tense/kind chips + given/you(—)/correct lines; "flawless — nada que repasar" Sparkles empty state); practice again (same settings) + change settings buttons; recent-sessions strip (up to 6 rows, mono meta "timed · 2 min · 5m ago" + "12/15 · 80% · streak 7").
- Created helpers: timer-ring.tsx (CSS-transitioned dashoffset ring), accuracy-ring.tsx (framer-motion stroke draw on mount), accent-keys.tsx (focus-preserving caret insert), records-strip.tsx (4 stat cards — best accuracy/best score/longest streak/sessions, skeletons while loading, dashed inviting empty state on silent-fail/no data), recent-sessions.tsx.
- QA: `bun run lint` → clean (zero errors/warnings); `bunx tsc --noEmit` → clean for src/ (only pre-existing errors in examples/ + skills/); dev.log shows page compiling again after practice-mode landed (GET / 200).

Stage Summary:
- Files created: src/components/practice/types.ts, practice-mode.tsx, setup-screen.tsx, quiz-screen.tsx, results-screen.tsx, timer-ring.tsx, accuracy-ring.tsx, accent-keys.tsx, records-strip.tsx, recent-sessions.tsx (10 files, ~2.2k lines).
- PracticeMode default-exported and rendering inside 3-b's max-w-6xl container; consumes exactly the spec'd API contracts (POST /api/practice/question, GET/POST /api/sessions) and degrades gracefully (retry UI / silent empty states) until Task 3-a's routes land.
- Deliberate deviations (documented in /agent-ctx/3-c-ui-practice.md): answered input uses readOnly instead of disabled (keeps focus so Enter works and mobile keyboards stay open); a "continue →" button appears post-answer for touch users; the timed strip's "questions" stat shows answered count (timed has no fixed question budget); recent-sessions list lives on results (setup shows the 4-card records strip per the task brief); confetti + timers ref-guarded for React StrictMode double-effects.
- No blue/indigo, warm token palette only (primary/warn/success/destructive/accent), light+dark safe, ≥44px touch targets, aria-live feedback region, aria-labels on icon buttons, responsive mobile-first throughout.

---
Task ID: 3-a
Agent: api-builder
Task: Prisma schema (PracticeSession) + all API routes (/api/conjugate, /api/check, /api/practice/question, /api/verbs, /api/sessions GET+POST)

Work Log:
- Replaced prisma/schema.prisma User/Post with PracticeSession (id cuid, mode, durationSec, score, total, accuracy Float, bestStreak, avgMsPerQuestion, accentWarnings @default(0), misses String @default("[]") JSON, createdAt). Kept generator/datasource blocks; DATABASE_URL unchanged (file:…/db/custom.db). `bun run db:push` → in sync, Prisma Client v6.19.2 regenerated.
- POST /api/conjugate: zod {verb, subject}; verb must be a VERBS key (400 `Unknown verb "…"`); returns {verb, subject, rows} from conjugate(). curl tener/nosotros → 23 rows in TENSE_ROWS order, values identical to a direct engine run (tuvimos, tuviéramos/tuviésemos, ten/¡ten!, no tengáis…). Bad verb/subject/JSON → 400; GET → 405.
- POST /api/check: grades the 23 rows; only filled cells (non-empty after trim) produce verdicts (empty/whitespace/unfilled rows omitted entirely); es via checkAnswer w/ accent detection, en exact-only; summary.correctCells counts exact + accentOnly. `expected` = canonical + up to 2 alternates joined " / ", skipping pure ¡…!/!-variants (tu_pos es → "habla" not "habla / ¡habla!"; tu_neg en → "don't talk / don't speak"); accentOnly cells get the properly-accented counterpart of the user's input (hablabamos → "hablábamos"; hablaramos → "habláramos").
- curl /api/check mixed test (hablar/nosotros, 19 filled cells: right/wrong/empty/whitespace/accent-missing): verdicts math verified — correctCells 16 / totalCells 19 (accent-only counted correct; "let us talk" correctly ≠ "let's talk"); pres_perf unfilled row absent from verdicts; answers omitted entirely → {verdicts:{}, summary 0/0}.
- POST /api/practice/question: partial QuizSettings accepted; defaults types ["conjugation"], tenses ["pres"], level "all", mode "infinite", durationSec 120; unknown kinds/tenses filtered; either list empty after filtering → 400; returns generateQuestion() JSON directly. Verified: {} → default conjugation/pres; full settings → translate-es-en "¡está! (tú)" w/ unioned answers; mixed bogus+valid filters; types:["bogus"] → 400; tenses:["bogus"] → 400; level 7 → 400; durationSec 0 → 400.
- GET /api/verbs: 52 verbs (28 sp5 + 24 sp6) {infinitive, level, gloss}, Spanish-collation alphabetical (localeCompare "es"), all glosses non-empty.
- GET /api/sessions?limit=8: limit clamped 1..25 (0→1, 100→25, "abc"→400, absent→8); recent by createdAt desc with misses column excluded; stats from one aggregate() across ALL sessions — totalSessions, bestAccuracy = _max.accuracy (null when table empty; records-strip guards on totalSessions===0), bestScore/bestStreak/avgAccuracy/totalQuestions zero-defaulted. Verified math with 5 sessions: totalQuestions 72, avgAccuracy 0.79, bestAccuracy 1, bestScore 20, bestStreak 20, desc order confirmed.
- POST /api/sessions: full zod validation (mode enum; durationSec ≤ 86400; score ≤ total ≤ 1000 with explicit 400 "score (11) cannot exceed total (10)"; bestStreak/accentWarnings ≤ 1000; accuracy 0..1; avgMsPerQuestion int ≥ 0; misses ≤ 50 items). Misses normalized — strings trimmed, verb capped 40 chars, other fields 120 (verified 64-char verb → 40, 300-char expected → 120, "  ser  " → "ser", empty subject → null) — stored as JSON string (verified via raw Prisma read); returns 201 { session: {…} } with misses as the parsed normalized array.
- Error handling everywhere: consistent { error: string } shape — 400 (invalid JSON / zod fail w/ `Invalid <path>: <message>` / unknown verb / empty filtered lists / bad limit), 500 (db or generate failure, try/catch). All routes `export const dynamic = "force-dynamic"`; zod v4.3.5; db via `@/lib/db`; no server actions.
- Cleaned up all 6 curl-test session rows after verification → DB ships empty ("no sessions yet" first-run state).
- `bun run lint` → clean; `bunx tsc --noEmit` → no issues in src/app/api/** or prisma/ (remaining errors are pre-existing in examples/ + skills/ only).

Stage Summary:
- Files: prisma/schema.prisma (rewritten), src/app/api/conjugate/route.ts, src/app/api/check/route.ts, src/app/api/practice/question/route.ts, src/app/api/verbs/route.ts, src/app/api/sessions/route.ts (pre-existing src/app/api/route.ts template left untouched).
- All five endpoints live on :3000 and curl-verified end-to-end incl. every error path; contracts match 3-b's tables/types.ts (CheckApiResponse/ConjugateApiResponse/VerdictsMap) and 3-c's practice/types.ts fetchers (Question/SessionSummary/SessionsResponse) exactly.
- Deviations (minor, documented in /agent-ctx/3-a-api-builder.md): (1) accentOnly `expected` = the accented variant matching the user's input rather than always spanish[0] (equals spanish[0] in the canonical case, better for alternate variants); (2) POST /api/sessions returns misses as the parsed array (DB still stores the JSON string); (3) test data deleted after verification for a clean first run.
- Observation for QA: page.tsx footer hardcodes "53 verbs" but the catalogue is 52 (3-c's setup uses live counts and is correct) — 3-b's file, flagged not fixed.
- Ready for Task 4 (integration) + 5 (QA): both UI modes are fully backed by working APIs.

---
Task ID: 4
Agent: main-orchestrator
Task: Integration — wire-up verification, lint, engine spot-checks

Work Log:
- Verified all 4 build tasks landed (engine + quiz + verify script; page shell + Tables UI; Practice UI; Prisma + 5 API routes).
- Spot-checked construir preterite personally (construyó/construyeron/construyera — correct; engine agent's "quirk" remark was a false alarm).
- Corrected stale "53 verbs" comment → 52 (28 sp5 + 24 sp6).
- Ran scripts/verify-engine.ts → PASS 13397/13397. bun run lint → clean. tsc --noEmit → clean (src/).

Stage Summary:
- All modules compile, lint clean, engine fully verified.

---
Task ID: 5
Agent: main-orchestrator
Task: Browser QA with agent-browser + fixes + design review

Work Log:
- Full agent-browser pass over Tables mode: 23-row chart renders in 5 groups; fill + CHECK → per-cell success/destructive/warn rings with expected-answer notes; accent-only verdict ("habia hablado" → warn + "watch the accents — había hablado"); REVEAL reference mode with alternates ("también: tuviese"); verb picker search/switch; subject switch auto-refetches reveal (tener/ellos → tienen/tuvieron/tuvieran); Enter-to-advance flow; localStorage persistence (tdv-tables restored verb/subject/answers, tdv-practice settings).
- Full Practice pass: setup (3 type toggles, 16 tense chips + presets, level segmented, timed 1/2/5/10 + infinite); started timed 1-min session → answered correct ("you will die", "caben"), wrong ("teno" → "answer: tienes — press enter to continue"), accent-only ("cabria" → "so close — accents: cabría", counted correct + accent warning), skip (reveals answer, counts as miss), accent helper keys insert at caret ("adquir" + í → adquirí); timer auto-finish at 0 → session saved to SQLite → results screen with accuracy ring, misses review (verb/subject/tense/given/your answer/correct), recent sessions list.
- Sticky footer verified: sticks to viewport bottom on short pages (1600px-tall viewport test), pushed down naturally on long chart pages. Mobile 390px layout verified.
- CRITICAL BUG FOUND & FIXED: dev server's postcss daemon had a stale CSS cache — the entire rewritten design system (brick red, Fraunces, ruled paper, success/warn tokens) was not being served; app rendered with old black/white tokens and .font-display/.font-mono utilities missing. Killed the stuck dev server (PIDs from 03:04) and restarted (note: background processes started with plain nohup get reaped by the harness ~40s later — must use `(setsid bun run dev > /dev/null 2>&1 < /dev/null &)` subshell form). After restart CSS is fresh: .font-display { var(--font-fraunces) }, .font-mono { var(--font-plex-mono) }, --primary #a53328.
- VLM design review (pre-fix): caught the sans-serif prompts (led to stale-CSS discovery). VLM review (post-fix): "effectively achieves warm editorial workbook look", polish 8/10; flagged empty-looking records cards (actually skeletons during fetch — records populate: best accuracy/score/streak/session counts) and dev-only Next.js overlays (not app UI).
- UX fix: "¡Perfecto!" toast now only fires when ALL 46 cells are filled and correct; partial all-correct fills get "Flawless so far — X/Y filled cells correct — fill all 46 for a perfect score".
- Cleaned 2 QA test sessions from DB (fresh "no sessions yet" first-run state for the user).
- Final state: no page errors, no console errors, all APIs 200, lint clean, dev server healthy on :3000.

Stage Summary:
- App fully browser-verified end-to-end: both modes, all question kinds, timer + infinite, accent flow, persistence, dark mode, responsive, sticky footer.
- Key risk resolved: dev-server CSS cache staleness (restart procedure documented above for future agents).
- Remaining polish ideas for future rounds (from VLM): soften quiz input focus ring double-border; dark-mode paper texture; records strip skeletons could be labeled "loading records…".

---
Task ID: 6
Agent: main-orchestrator
Task: Post-launch — 15-minute recurring webDevReview cron job

Work Log:
- Created scheduled task (kind=webDevReview, every 15 minutes) with the mandatory task description (assess status, agent-browser QA, fix bugs or advance new requirements, improve styling detail, add features, update this worklog).

Stage Summary:
- Continuous improvement loop armed.

---
Task ID: 7 (cron review round 1)
Agent: cron-webDevReview
Task: Continuous improvement round 1 — QA, miss-drill feature, verb profile, keyboard shortcuts, styling polish

## Current project status / assessment
- App fully functional and browser-verified (both modes, all question kinds, timed/infinite, persistence, dark mode, responsive). Engine 13398/13398 assertions, lint clean, tsc clean, APIs healthy, DB clean (0 sessions at round start).
- Dev server on :3000 healthy. NOTE: Turbopack's dev CSS cache goes stale after globals.css edits — a plain restart is NOT always enough. Reliable refresh procedure (used twice this round): `pkill -f "next dev"; sleep 2; rm -rf .next/dev; (setsid bun run dev > /dev/null 2>&1 < /dev/null &)` then wait ~12s. Verify by grepping the served CSS chunk for your change. (Gotcha: don't misread lab() fallback values as stale — oklab L ≈ 0.93 × lab L.)

## Goals / completed modifications / verification results
1. FEATURE — "drill my misses": focused infinite practice session on the verbs/tenses/kinds you just missed.
   - quiz.ts: QuizSettings gains optional `verbs: string[]` (overrides level pool, unknown verbs filtered, falls back to level when empty). Verified: 6/6 questions from a [hablar,tener] pool; bogus list falls back.
   - /api/practice/question: accepts + zod-validates verbs (≤60).
   - practice/types.ts: buildDrillSettings(misses, base) — unique missed verbs (≤12), missed tenses/kinds, forced infinite mode; not persisted to localStorage (stripped by sanitizeSettings).
   - practice-mode.tsx: `drill` state; startSession(override?, clearDrill?); SetupScreen start clears drill (BUG FOUND & FIXED in QA: onStart originally didn't pass clearDrill → drill leaked into normal sessions); "practice again" repeats the active drill; "change settings" returns to setup.
   - results-screen.tsx: "drill these misses · N verbs" primary button (Target icon) when misses exist; modeLine shows "miss drill · mm:ss"; quiz-screen shows saffron "miss drill · N verbs" chip on every question.
   - Browser-verified end-to-end: 3 wrong answers → results → drill starts with chip → questions stay in pool (estar/entender/caber) → end → "miss drill" mode line → practice again repeats drill → change settings → new session clean.
2. FEATURE — verb profile strip (Tables mode): new src/components/tables/verb-profile.tsx — classification chips derived from VERBS attrs (-ar/-er/-ir, reflexive, stem e→ie/e→i/o→ue, irregular yo/boot/present/imperfect/preterite/future/gerund/participle/subjunctive/command/nos, green "regular" chip when fully regular) + deduped English meanings in italic Fraunces. Wired into tables-mode between controls and chart. Verified for tener (yo → teng-o, preterite: tuve…, future: tendr-) and dedup fix for tener's double "to have".
3. FEATURE — keyboard shortcuts: 1/2 (or t/p) switch modes; ignored while typing in inputs/textareas/selects/contentEditable, with modifiers, or when an AlertDialog is open. Footer hint "press 1 / 2 to switch modes" (desktop only). Verified both directions.
4. STYLING — (a) records strip skeletons now labeled (best accuracy/best score/longest streak/sessions + role=status "loading your records"); (b) quiz answer input focus ring softened (2px, phase-tinted — was a 3px default ring that read as a double border); (c) dark-mode paper grain: faint 26px warm dot grid on body (html.dark body, fixed attachment), light mode stays clean cream — verified both; (d) CHECK button icon CircleCheck → Check (VLM read the circle-check as a smiley); (e) dark --muted-foreground 0.68 → 0.72 for stronger secondary-text contrast.
5. QA — agent-browser pass over all of the above + VLM design review of the new surfaces. VLM false positives checked & dismissed (tense chips do NOT overflow — verified bounding boxes + no doc overflow at 390px; dark "all" chip contrast measured ~6.4:1, passes AA). VLM positives fixed (icon, skeletons). VLM praised perfil strip ("very clean, well-aligned") and dark grain ("excellent depth without being distracting").
6. Final state: verify-engine PASS 13398/13398, lint clean, tsc clean, no browser console/page errors, all APIs 200, QA test sessions cleaned from DB (0 rows), light + dark verified, dev.log clean.

## Unresolved issues / risks / next-round priorities
- Turbopack stale-CSS gremlin (procedure above) — any future globals.css edit MUST verify the served chunk, not just restart.
- Next-round candidate features (in priority order): (1) setup-screen "drill recent misses" quick-start fed by a misses-inclusive GET /api/sessions variant or aggregate misses endpoint; (2) progress sparkline/heatmap of accuracy over time on the results/setup screens; (3) per-verb mastery stats (hardest verbs leaderboard); (4) print/share results card; (5) verb-of-the-day on Tables landing.
- Minor polish backlog: records→question-types section gap could tighten; italic meanings baseline micro-offset in perfil strip (negligible).

---
Task ID: 8 (cron review round 2)
Agent: cron-webDevReview
Task: Continuous improvement round 2 — status assessment, QA, miss-bank analytics (focus panel + drill quick-start), verb of the day, styling polish

## Current project status / assessment
- App fully stable at round start: both modes browser-verified end-to-end (rounds 1–7), engine PASS 13397/13397 (NOTE: round-1 worklog's "13398" was a typo — the script is git-unchanged since commit 7a9eea4 and its true stable count is 13397; engine + verify script untouched this round), lint clean, tsc clean, dev server healthy on :3000, DB empty (0 sessions).
- Round-2 QA pass found NO bugs: Tables chart + check/reveal/random flows, Practice setup → quiz (all 3 question kinds, correct/wrong/skip feedback, accent keys) → end-session dialog → results → drill-these-misses all work; localStorage persistence intact; no console/page errors; APIs all 200.
- Test data seeded during QA (1 session w/ 3 misses) then cleaned back to fresh first-run state (0 sessions) at round end.

## Goals / completed modifications / verification results
1. FEATURE — miss-bank analytics endpoint `GET /api/sessions/stats` (new route src/app/api/sessions/stats/route.ts):
   - Returns: `trend` (last 14 sessions oldest→newest: accuracy/score/total/mode/createdAt), `trendDelta` (recent-half − older-half accuracy in pts, null < 4 sessions), `hardestVerbs` (top 8 by miss count across last 100 sessions w/ lastMissedAt — first-seen wins because rows iterate newest-first), `recentMisses` (≤ 30 chronological misses from last 15 sessions), `totals`.
   - Safe JSON parse of the misses column (bad rows skipped); consistent { error } 500 shape; force-dynamic.
   - curl-verified against live data (1 session: trend 1 pt, trendDelta null, 3 hardest verbs, 3 recentMisses, totals {1,3}); later re-verified with 2 and 3 sessions (trend grew correctly).
2. FEATURE — FocusPanel on Practice setup (new src/components/practice/focus-panel.tsx, wired via practice-mode + setup-screen):
   - Animated SVG accuracy sparkline: draw-in line (motion.path pathLength), staggered dot pop-in, low-opacity area fill, dashed 50% midline (only with >1 pt), date-range caption, single-point renders as lone dot; aria-label describes current accuracy; pluralized "last N session(s)".
   - Trend badge: improving +X pts (success) / steady (muted) / slipping −X pts (destructive) at ±5 pt thresholds.
   - "toughest verbs" chips (top 6, ×count, #1 destructive-tinted, title = last missed timeAgo) with "no misses on record — ¡impecable!" empty branch.
   - "drill my misses · N verbs · infinite" quick-start → reuses handleDrillMisses(focusStats.recentMisses) → buildDrillSettings; graceful "every recent answer was correct — nothing to drill" note when recentMisses is empty.
   - Skeleton loading state (role=status); hidden entirely while no sessions exist (records strip owns the empty state).
   - practice-mode: fetches sessions + focus stats in one Promise.all (focus failure degrades to null without killing records); both refreshed after every session end.
   - Browser-verified end-to-end: panel renders → drill quick-start launches "MISS DRILL · 3 VERBS" session → all questions stayed in the missed pool {despedir, tener, elegir} → results → back to setup → panel refreshed with new trend point.
3. FEATURE — verb of the day on Tables landing (new src/components/tables/verb-of-day.tsx):
   - Deterministic daily pick (local-midnight day index % 52 — full catalogue cycle every 52 days); warm saffron gradient strip + oversized watermark of the verb's first 3 letters; Sunrise badge; date caption; gloss; 3 live "yo" teaser forms (presente/pretérito/futuro) computed client-side via shared engine conjugateOne (try/catch-guarded).
   - "study this verb" button loads it into the chart (reuses handleVerbChange → clears answers); flips to disabled "on the chart" state when current. Browser-verified (caer loaded, combobox + profile strip updated).
4. STYLING — records strip cards micro-lift (hover:-translate-y-0.5 + transition-all); verb-of-day breathing room (py-4, gap-y-3.5); both new surfaces follow the warm editorial system (Fraunces/mono micro-labels, warm tokens, no blue/indigo).
5. QA — agent-browser full pass over both new features + VLM design reviews: verb-of-day "fits the aesthetic perfectly… like a highlighted section of a physical notebook"; focus card "a high-quality addition that respects the app's design system"; sparkline "renders cleanly" in light AND dark; mobile 390px "wraps/stacks gracefully", no horizontal overflow in either mode; ≥44px targets maintained. Fixed during QA: JSX comment missing closing brace (build error, caught + fixed immediately), "last 1 sessions" pluralization, midline hidden for single-point trend.
6. Final state: lint clean, tsc clean (src/), engine PASS 13397/13397, all APIs 200, no browser errors, DB cleaned to 0 sessions (fresh first-run), light theme restored, dev.log clean (only the transient fixed build error in history).

## Unresolved issues / risks / next-round priorities
- Deviation note: MultiEdit tool proved non-atomic this round (a failed multi-edit left partial edits + mangled a JSX comment "{/* … */" → build error). Future agents: after ANY failed MultiEdit, re-read the file before retrying, and check dev.log for parse errors.
- Next-round candidate features (priority order): (1) shareable/printable results card (canvas render of the session summary); (2) per-tense accuracy breakdown on results (needs per-question tense tally — could extend SessionSummary.misses or a new analytics field); (3) streak calendar/heatmap (needs daily aggregates from sessions table); (4) practice "daily goal" (e.g. 20 questions/day with progress); (5) verb-of-the-day could link into Practice ("quiz me on caer").
- Minor polish backlog: focus sparkline could gain hover tooltips per point (currently static); toughest-verb chips could be clickable to drill that single verb; records→focus→builder vertical rhythm is good but focus card could get bg-dotted on wide screens for texture parity.
- Utility scripts added for future QA rounds: scripts/check-db.ts (dump sessions w/ miss verbs), scripts/clean-sessions.ts (deleteMany) — safe to reuse.

---
Task ID: 9 (cron review round 3)
Agent: cron-webDevReview
Task: Continuous improvement round 3 — status assessment, QA, per-tense breakdown, daily goal/racha, cross-mode verb drills, interactive analytics chips, share results

## Current project status / assessment
- App fully stable at round start (rounds 1–8 complete): both modes browser-verified, engine PASS 13397/13397, lint clean, tsc clean, dev server healthy on :3000, DB cleaned to 0 sessions.
- Round-3 QA pass (agent-browser, named session) found NO app bugs: Tables render + check/reveal, Practice setup → quiz → timed auto-finish → results → drill flow all work; no console errors. One leftover QA session found in DB (cleaned).
- QA-environment hazard discovered & resolved: the shared unnamed agent-browser session ("default", left over from earlier rounds) was still attached and a concurrent client typed stray keystrokes into the app mid-QA, creating a phantom "dar 3/4" session (userAnswer "darab"). NOT an app bug — closed all browser sessions (`agent-browser close --all`), cleaned DB, re-verified everything in a fresh named session. Future agents: ALWAYS set `export AGENT_BROWSER_SESSION=...` and close stray sessions before QA.

## Goals / completed modifications / verification results
1. FEATURE — per-tense accuracy breakdown ("tense by tense" on results):
   - Prisma: `tally String @default("{}")` column added to PracticeSession (JSON map tense → { c, t }); db:push'd. NOTE: the running dev server keeps the old Prisma client in memory — after ANY schema change, restart with `pkill -f "next dev"; sleep 2; rm -rf .next/dev; (setsid bun run dev > /dev/null 2>&1 < /dev/null &)` (symptom: INSERT generated without the new column → 500).
   - POST /api/sessions: optional zod `tally` record (string key ≤120 → {c, t} ints 0..1000); normalizeTally clamps c ≤ t, drops t=0 entries, caps 40 keys; stored as JSON; returned parsed. curl-verified: {c:5,t:3}→{c:3,t:3}, t=0 dropped, negative c → 400.
   - quiz-screen: `tallyRef` counts every answered question toward question.tense (exact/accent → c+1; wrong/skip → t only); folded into SessionSummary at finish.
   - results-screen: new "tense by tense" section (shows when ≥4 tally questions): animated framer-motion width bars sorted WEAKEST-FIRST, tone by threshold (success ≥80% / primary ≥50% / destructive), mono label + "62% 5/8" readout, role=progressbar, scrollbar-thin max-h-72, staggered delays.
2. FEATURE — daily goal + racha (day streak):
   - GET /api/sessions/stats: new `daily` block — goal 20 (constant, exported), todayQuestions (local-calendar day buckets from a 2000-row scan of createdAt+total), streakDays (consecutive practiced days ending today OR yesterday — racha stays alive), bestStreakDays (longest run), activeToday. DST-safe day keys (YYYY-MM-DD local, parsed at noon).
   - New src/components/practice/daily-strip.tsx on setup top (hidden until first session): flame badge (spring pop-in), "LA RACHA · SEP 19" + "N días seguidos" in Fraunces italic, animated progress bar toward the 20-question goal, success tint + "¡meta cumplida!" when met, warn hint "practice today to keep the racha alive" when streak not yet active today. Verified end-to-end (7/20 → 35% bar; todayQuestions aggregated across sessions correctly: 31 after 2 sessions).
3. FEATURE — cross-mode verb drills ("quiz me on this verb"):
   - verb-of-day: new Zap "quiz me" outline button (primary-tinted, always enabled) next to "study this verb".
   - page.tsx: `quizVerb` state; TablesMode onQuizVerb → setQuizVerb + switch to practice; PracticeMode consumes it in a [quizVerb]-deps effect (calls onQuizVerbConsumed() so page clears it → exactly-once semantics), auto-starting an infinite verb drill.
   - practice-mode: generalized drill system — `drill` + `drillLabel` (quiz chip) + `drillShort` (results mode line) + clearDrill(); startVerbDrill(verb) (verbs:[verb], infinite), startTenseDrill(tense) (tenses:[tense], verbs cleared, infinite); handleDrillMisses now labels "miss drill · N verbs". QuizScreen chip driven by drillLabel prop (covers verb/tense/miss drills); ResultsScreen mode line driven by drillShort ("verb drill · 01:18").
   - Browser-verified: quiz-me on caer → "VERB DRILL · CAER" chip, all questions stayed in the caer pool across conjugation + EN→ES + ES→EN kinds; results mode line "VERB DRILL · 01:18".
4. FEATURE — interactive analytics chips (focus panel + miss rows):
   - GET /api/sessions/stats: new `hardestTenses` (top 4 by weakest aggregated tally accuracy, min 5 answers, tie-break by attempts) — curl-verified against seeded data.
   - focus-panel: toughest-verb chips are now buttons (hover lift + primary border, active:scale-95, title/aria "drill …") → startVerbDrill; NEW "shakiest tenses" chip row (labelEs + pct%) → startTenseDrill. Verified: chips sorted weakest-first (pretérito 17% → imperfecto 80% → presente 83%), click → "TENSE DRILL · PRETÉRITO" session with pretérito-only questions.
   - results-screen miss rows: verb is now a dotted-underline button → startVerbDrill(verb). Verified click → verb drill starts.
5. FEATURE — shareable results: share button on results actions row (Web Share API when available, clipboard.writeText fallback + "Copied to clipboard" toast + 2.2s "copied" state). Text: "Tabla de Verbos — sesión de práctica / 34/40 correct · 85% accuracy / racha máxima 7 · mode line". Browser-verified (copied + toast).
6. QA: engine PASS 13397/13397; tsc clean (src/); lint clean; no console/page errors; APIs all 200; dark mode verified programmatically (theme class + daily-strip computed colors: title L≈92, labels L≈67.5, bar visible); mobile 390px — programmatic overflow scan returned [] in both modes; VLM design review run (initial 6.5/10 — flags investigated: "dark mode broken" was my failed toggle click (verified working after proper toggle), sparkline single-dot is by-design with 1 session, "chips cut off" was screenshot viewport crop (no real overflow)); all test data cleaned (0 sessions), light theme restored.

## Unresolved issues / risks / next-round priorities
- MultiEdit proved non-atomic AGAIN (a failed multi-edit left a mangled line `const isses, setMisses]…` in quiz-screen.tsx — repaired via python line edit + full re-read). Future agents: use small single Edits; after ANY failed edit, re-read the file before retrying.
- Dev server must be restarted after prisma schema changes (stale in-memory client) — procedure in section above.
- The daily goal (20) is a constant exported from the stats route — natural next step: user-configurable goal persisted in localStorage.
- Next-round candidate features (priority order): (1) streak calendar/heatmap (daily aggregates now exist — needs a `days` array in the stats response + a calendar grid component); (2) share/print results as an image card (canvas render of the summary); (3) per-question timing analytics (avgMsPerQuestion exists per session; per-tense timing could reveal slow tenses); (4) verb-of-the-day archive ("yesterday's verbs"); (5) records strip could include best day-streak.
- QA screenshot artifacts: /home/z/my-project/qa/r3-*.png (10 files).

---
Task ID: 10 (cron review round 4)
Agent: cron-webDevReview
Task: Continuous improvement round 4 — status assessment, QA, activity heatmap, configurable daily goal, day-racha record, share-as-image results card, styling polish

## Current project status / assessment
- App fully stable at round start (rounds 1–9 complete): engine PASS (13,397+ randomized cases), lint clean, tsc clean (src/), dev server healthy on :3000, DB at 0 sessions.
- Round-4 QA pass (named session `r4-qa`, all stray sessions closed first) found NO app bugs: Tables fill → check → per-cell green/red verdicts + toast feedback ("5/5 filled cells correct"), Practice setup → timed quiz → feedback states → finish-early dialog → results, share button, dark/light themes, mobile 390px (page never overflows; zero offenders beyond right edge in both modes), no console errors.
- QA-harness lesson (NOT an app bug): the mode-switcher buttons render lowercase "check"/"practice" text visually uppercased via CSS — case-SENSITIVE textContent matching in eval clicks silently no-ops. Also `agent-browser set viewport W H` (not `viewport`/`device` — device emulation needs macOS), and toasts auto-dismiss in ~4s so sample them immediately after clicking.

## Goals / completed modifications / verification results
1. FEATURE — activity heatmap ("el calendario"):
   - GET /api/sessions/stats: `daily.days` — sparse `{date: "YYYY-MM-DD", total}[]` over the last 24 weeks (HEATMAP_DAYS=168, only practiced days, oldest→newest, DST-safe via setDate).
   - New src/components/practice/activity-heatmap.tsx: 24 Monday-aligned week columns × 7 rows (L M X J V S D), 5 intensity levels relative to the goal (0 / <½ / ½ / met / 2×), shadcn Tooltip per cell ("14 preguntas · 26 jul"), today ring-2, month marks, legend + "mejor día", staggered spring pop-in, overflow-x-auto with tiny cells on mobile.
   - Geometry uses CSS vars `--cell`/`--gap` on one owner div so month row, weekday labels and cell grid share identical column math — initial attempt had misaligned month labels (two differently-sized grids); fixed and VERIFIED programmatically (label row width == cell grid width == 309px, first-label x == first-cell x, all 7 weekday deltas = 0).
2. FEATURE — user-configurable daily goal:
   - New src/components/practice/use-daily-goal.ts: localStorage "tdv-daily-goal", presets DAILY_GOAL_OPTIONS=[10,20,30,50] in types.ts, lazy useState initializer (hydration-safe: goal only feeds components that render after client data loads; passed the react-hooks/set-state-in-effect lint rule without effects).
   - DailyStrip: pencil button next to "hoy · meta N" opens a Popover radiogroup (10/20/30/50); pick persists + live-updates strip, progress bar, aria labels AND the heatmap intensity scale.
   - VERIFIED: goal 10 → "hoy · meta 10", stored "10", progressbar aria "22 of 10", "¡meta cumplida!"; survives reload; reset to 20 after test.
3. FEATURE — "day racha" record card:
   - RecordsStrip: optional `daily` prop adds a 5th card (CalendarCheck2 icon, "4d" value, primary-tinted gradient + accent border). Grid now `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`; the sessions card spans the full mobile row (col-span-2 sm:col-span-1) so 5 cards never orphan. Loading skeleton labels unchanged (4 → fine).
4. FEATURE — share results as image:
   - New src/components/practice/share-card.ts: canvas 1080×1350 PNG — cream paper + dot texture, editorial frame with brick corner ticks, masthead, "sesión de práctica", giant accuracy % (color matches ring semantics ≥80 green / ≥50 brick / else red), score, stats row (racha/tiempo/modo), date footer. Resolves next/font families via CSS vars (--font-fraunces/--font-plex-mono/--font-inter) + document.fonts.load.
   - results-screen: icon button (ImageDown) top-right of the hero card with tooltip; busy spinner; success/failure toasts.
   - VERIFIED: agent-browser `download` captured a real 1080×1350 PNG; VLM review 10/10 (fonts render, no clipping, "highly shareable"); toast "Results card saved" fires.
5. POLISH — focus panel + records:
   - FocusPanel card now `bg-dotted` (texture parity with builder/results hero).
   - Sparkline: every point has an invisible r=13 hit circle with a shadcn Tooltip — "Sep 2 · 78% · 7/9" (date · accuracy · score/total). Sparkline prop changed from `accuracies` to full `points: FocusTrendPoint[]`.
   - Records cards: group hover — icon turns primary, gradient top-rule appears, translate+shadow (existing), accent card gets a subtle primary gradient.
6. QA/verification: lint clean; tsc clean (src/); engine PASS (total varies ±few across runs — randomized quiz tests, e.g. 13397/13399/13400 — all pass); dev.log clean compiles; dark + light themes verified; mobile 390px + desktop 1280px verified (VLM desktop 9/10 "no visual bugs", mobile programmatic checks all pass); all test data cleaned (0 sessions); scripts/seed-days.ts added (seeds 22 sessions across 55 days — reuse for heatmap QA, then clean-sessions).

## Unresolved issues / risks / next-round priorities
- MultiEdit STILL non-atomic: a "failed" multi-edit this round silently applied its first edit (duplicate Tooltip import in focus-panel) → compile error seen by the browser before I noticed. Mitigation used: single small Edits + re-read after ANY failure + `bun run lint` before browser QA. Keep doing this.
- agent-browser console shows CUMULATIVE history for the session (stale errors from mid-edit states persist in the log) — judge errors by dev.log + fresh page loads, not old console lines.
- Heatmap day keys use the SERVER's local timezone (dayKey over createdAt) while grid alignment uses the BROWSER's clock — same-machine use is exact; a remote-server TZ mismatch could shift cells by one day near midnight. Acceptable for this self-hosted app (streak logic has the same property).
- Next-round candidate features (priority order): (1) per-question timing analytics (avgMsPerQuestion exists per session; per-tense timing would reveal slow tenses — add to stats hardestTenses or results); (2) verb-of-the-day archive ("yesterday's verbs" — derive deterministically from date, no schema change needed); (3) practice reminders/pacing hint ("best time to practice" from hour-of-day aggregates); (4) tables mode: per-cell keyboard navigation (arrow keys between inputs) for power users; (5) share card could include the tense-by-tense breakdown bars.
- QA screenshot artifacts: /home/z/my-project/qa/r4-*.png (16 files) + qa/r4-13-share-card.png (the generated 1080×1350 card itself).

---
Task ID: 11 (cron review round 5)
Agent: cron-webDevReview
Task: Continuous improvement round 5 — status assessment, QA, per-tense timing analytics, chart keyboard navigation, verb-of-the-day archive, polish

## Current project status / assessment
- App fully stable at round start (rounds 1–10 complete): engine PASS (~13,400 randomized), lint clean, tsc clean (src/), dev server healthy on :3000, DB at 0 sessions.
- Round-5 QA pass (named session `r5-qa`) found NO app bugs: Tables fill → check feedback, Practice timed session → finish-early → results, no console errors, mobile 390px + desktop 1280px clean.
- One data-hygiene finding (NOT an app bug): the seed script wrote tally rows with c > t directly to the DB (bypassing API validation), surfacing "126%" in the stats chips. Fixed by (a) clamping in the seed and (b) adding a DEFENSIVE clamp (c ≤ t) in the stats-route tense aggregation so display can never exceed 100% even with malformed rows.
- Seed-script quirk fixed: daysAgo=0 rows were created 3h IN THE FUTURE (now clamped to a minute ago) — they showed up as "newer than everything" in check-db.

## Goals / completed modifications / verification results
1. FEATURE — per-tense timing analytics ("how slow is each tense"):
   - types.ts: TallyEntry + HardestTense gained optional `ms` (backward compatible — pre-timing sessions simply lack it); new `tallyAvgMs()` helper.
   - quiz-screen: submit/skip now compute `dtMs = Date.now() - questionStartRef.current` once and pass it to `tallyAnswer(correct, dtMs)` which accumulates `ms` per tense alongside c/t.
   - POST /api/sessions: zod tally entries accept optional `ms` int 0..7,200,000 (2h/tense ceiling); normalizeTally rounds + clamps; curl-verified: negative ms → 400, absurd ms → 400, c>t clamped, t=0 dropped, valid ms persisted verbatim.
   - GET /api/sessions/stats: parseTally surfaces ms; tense aggregation sums ms (with the new defensive c-clamp); hardestTenses entries carry `ms` when any session tracked it.
   - results-screen TallyBar: label column became two lines — tense name + `⏱ X.Xs/q` (Clock3 icon, tabular-nums, title "average time per question"), only when ms exists. VLM review: "timing displayed clearly… no layout issues with the two-line labels".
   - focus-panel "shakiest tenses" chips now show `pct% · ⏱ X.Xs` inline (muted) plus full "avg X.Xs per question" in the tooltip.
   - VERIFIED end-to-end in-browser: answered 5 real questions (deliberately slow on one) → results showed 1.0s/q, 0.9s/q, 7.3s/q; DB session avg 3.0s; stats chips show "pretérito 66% 5.4s" etc. on desktop AND mobile 390px.
2. FEATURE — chart keyboard navigation (power users):
   - conjugation-chart handleInputKeyDown extended: ↑/↓ jump between the same-language column across rows (±2 in DOM order, always captured — vertical arrows do nothing in text inputs); ←/→ navigate ONLY at caret boundaries (position 0 / value.length — mid-text arrows keep moving the caret); Enter unchanged (advance; last cell → check). Footer hint updated to "arrows + enter to fill the chart".
   - VERIFIED in-browser: inf:es →↓→ ger:es →↑→ inf:es; typed "to give" then → at end → ger:es; caret mid-text (pos 2) + → moved caret 2→3 staying in cell; Enter advanced es→en.
3. FEATURE — verb-of-the-day archive ("últimos días"):
   - verb-of-day.tsx: new `recentVerbs(6)` (deterministic, modular-safe for back < catalogue), rendered as a slim second row inside the aside (border-t, mono label + 6 chips with gloss/date tooltips). Chip for the verb currently on the chart is disabled + primary-tinted with a check; others hover → primary border and load the verb on click.
   - VERIFIED in-browser: 6 chips (dar, caber, reír, conducir, andar, seguir), click "dar" → chart verb switched to dar; mobile 390px fully visible, VLM "clean… no cut-offs".
4. POLISH: chart section headers now show "N forms" counts (3/5/4/4/7) right-aligned in the sticky group header; footer keyboard hint updated; seed script hardened (clamp + no future timestamps).
5. QA/verification: lint clean; tsc clean (src/); engine PASS 13399/13399; no console errors; mobile + desktop verified; all test data cleaned (0 sessions); scripts/seed-days.ts updated in place (now emits valid c ≤ t tally with ms + sane timestamps).

## Unresolved issues / risks / next-round priorities
- Timing data only exists for sessions saved from this round forward (older rows have no ms — the UI hides the timing line gracefully; verified via seeded ms-less rows rendering without the clock line).
- avgMsPerQuestion on the results hero double-counts nothing but reflects submit+skip time only (time spent reading feedback is excluded by design — questionStartRef resets when the next question renders).
- Next-round candidate features (priority order): (1) slowest-tense insight line in the focus panel ("you're 2× slower on pretérito — drill it?") derived from the new ms data; (2) share card with tense-by-tense mini bars (canvas already has room between divider and stats row); (3) hour-of-day practice heatmap or "best practice time" hint; (4) tables-mode per-cell streak/attempt counter (needs schema or localStorage); (5) PWA manifest + offline shell (verbs/conjugation are client-computable, only session save needs the network).
- QA screenshot artifacts: /home/z/my-project/qa/r5-*.png (5 files).

---
Task ID: 12 (cron review round 6)
Agent: cron-webDevReview
Task: Continuous improvement round 6 — status assessment, QA, focus-panel insights (pace + time-of-day), share-card tense bars, PWA + offline questions, tables-mode cell mastery, styling polish

## Current project status / assessment
- App fully stable at round start (rounds 1–11 complete): both modes browser-verified, engine PASS 13399/13399, lint clean, tsc clean (src/), dev server healthy on :3000, DB at 0 sessions, all stray agent-browser sessions closed first (named session `r6-qa` used throughout).
- Round-6 QA pass found NO app bugs: Tables fill → check → toasts, Practice timed/infinite → skip → end-early → results → share, dark mode, mobile 390px (0 overflow offenders both modes), no console errors.
- Two DEV-ENVIRONMENT hazards discovered & resolved this round (NOT app bugs — see risks below): stale Tailwind utility generation in Turbopack, and the new service worker serving stale CSS in dev.

## Goals / completed modifications / verification results
1. FEATURE — focus-panel "insights" strip (pace + best time of day):
   - GET /api/sessions/stats: new `slowestTense` {tense, avgMs, overallAvgMs, factor} — the meaningfully-slowest tense (≥5 timed answers, ≥1.35× the overall avg, ≥1.5s slower, needs ≥2 tracked tenses for contrast); new `bestHour` {bucket, avgAccuracy, sessions} — morning (5–12) / afternoon (12–18) / evening (18–05, midnight-wrapping) buckets, best needs ≥2 sessions AND ≥8pts gap over the runner-up. curl-verified with seeded data (pret 1.5× / 5.4s vs 3.5s; morning 82% over 24 sessions).
   - practice/types.ts: SlowestTense + BestHour interfaces, hourBucketLabelEs(); focus-panel.tsx: new Insights section (mono "insights" label + staggered rows): Gauge icon + "pretérito takes you 1.5× longer than average — 5.4s vs 3.5s per question" + "drill it" button (starts a tense drill — browser-verified); Sunrise/Sun/Timer icon + "you're sharpest in la mañana — 82% avg over 24 sessions".
2. FEATURE — share card per-tense mini bars:
   - share-card.ts: optional `tenses: {label, pct}[]` (≤4); card height is now dynamic (1560 with bars, 1350 compact); new "TIEMPOS VERBALES" section between divider and stats row — mono uppercase label left, 330px rounded bar track middle (accuracyColor semantics: ≥80 green / ≥50 brick / else red), tabular pct right; stats row + footer shift down when bars present. results-screen passes the 4 weakest tenses (tallyRows is already weakest-first). Browser-verified via download (149KB PNG) + VLM review 9/10 ("4 bars, no overlap, vertical rhythm excellent, nothing clipped").
3. FEATURE — PWA + offline practice:
   - public/manifest.webmanifest (standalone, cream theme #f7f0e1, education categories); icons generated via sharp from icon.svg → public/icons/icon-{192,512}.png + maskable variants (brick background, 10% padding, scripts/gen-icons.ts reusable).
   - public/sw.js (CACHE tdv-shell-v2): navigations network-first→cached shell→offline page; immutable assets (hashed fonts, /icons, svgs, manifest) cache-first; OTHER static network-first→cache fallback (dev-safe — see risks); /api/* network-only. src/components/sw-register.tsx registers after load (silent failures).
   - layout.tsx: manifest + appleWebApp metadata, Viewport themeColor (light #f7f0e1 / dark #110d0b = oklch(0.165 0.008 55) converted), viewportFit cover.
   - OFFLINE QUESTIONS: fetchQuestion in practice/types.ts falls back to the shared pure `generateQuestion(settings)` when POST /api/practice/question is unreachable — the whole quiz works offline. Browser-verified by intercepting window.fetch (rejecting the question endpoint): quiz started, generated "ellos freían" locally, answer graded locally, correct/miss recorded.
4. FEATURE — Tables-mode per-cell mastery (localStorage):
   - New src/components/tables/use-cell-mastery.ts: useSyncExternalStore-backed store (server snapshot empty → hydration-safe; lint-clean vs the new react-hooks/set-state-in-effect rule). Key `verb|subject|row|lang` → {c, t}; MASTERY_THRESHOLD=2 exact-correct (accent warnings excluded); map capped at 4000 entries; defensive clamping of localStorage data.
   - tables-mode.tsx: recordVerdicts folded into handleCheck; computes masteredRows (BOTH es+en ≥2) + masteredCount. conjugation-chart.tsx: header badge "N/23 mastered" (success-tinted, BadgeCheck icon, tooltip explains the rule) + per-row BadgeCheck next to the label. VERIFIED: check hablar/yo inf row twice → storage {c:2,t:2}, badge "1/23 mastered", row check icon.
5. STYLING (mandatory focus):
   - Chart inputs: italic Fraunces placeholders at muted/60 (editorial empty state) — verified computed style "italic Fraunces" in light AND dark.
   - Chart rows: label hierarchy (semibold name + italic lighter sub-label), subtle row hover bg (hover:bg-foreground/[0.035] — gentle warm tint), rounded rows.
   - Section labels: signature brick dash prefix (4px rule, primary/70) before "question types / tenses / verbs / session" (setup) and "toughest verbs / shakiest tenses / insights" (focus panel, via new shared MicroLabel component src/components/practice/micro-label.tsx).
   - empezar CTA: brick-tinted raised shadow (shadow-primary/45, deepens on hover). Level pills: hover bg. Footer: stats in mono medium, shortcut hints in italic Fraunces (two-tier hierarchy).
   - VLM review of all styled screens: placeholders ✓ hierarchy ✓ dashes ✓ shadow ✓ "no visual defects".
6. QA/verification: lint clean; tsc clean (src/); engine PASS 13400/13400; all APIs 200 (verbs/sessions/stats/manifest/sw); full timed-session flow re-verified after all changes (quiz → answer → results, zero page errors); mobile 390px 0 offenders both modes; dark mode VLM pass (contrast, tints, layout); DB cleaned to 0 sessions; mastery test data cleared; light theme restored.

## Unresolved issues / risks / next-round priorities
- **NEW dev hazard — stale Tailwind utilities**: classes added to EXISTING files' string literals may not be generated into the dev CSS even after `rm -rf .next` + restart (observed with placeholder:/hover:/shadow- utilities; classes present in DOM but rules missing from CSS). FIX that worked: `touch` the modified .tsx files, wait ~5s, reload. Suspect Turbopack's incremental scan cache keyed by mtime. If styles silently don't apply: verify with computed styles, then touch + reload.
- **NEW dev hazard — service worker caching in dev**: sw.js v1 used cache-first for ALL /_next/static — dev chunk URLs are stable (not content-hashed), so the SW served stale CSS forever. Fixed in sw.js v2 (network-first for non-immutable assets); old tdv-shell-v1 caches purge on activate. When debugging styles, remember the SW: unregister + clear caches if needed (`navigator.serviceWorker.getRegistrations()…unregister()` + `caches.keys()…delete()`).
- MultiEdit corruption gremlin struck AGAIN (stray `n` inserted in a Badge JSX line). Rule stands: after ANY MultiEdit, re-read the file before moving on.
- New eslint-plugin-react-hooks v6 rules are strict: `static-components` (no capitalized component variables created during render — use a module-level component with internal branches) and `set-state-in-effect` (use useSyncExternalStore for localStorage reads, like use-cell-mastery.ts and use-daily-goal.ts do).
- agent-browser notes: the quiz input is NOT inside a <form> (submit via keydown Enter dispatched on the input); empty answers no-op (fill non-empty); button textContent matching is case-sensitive ("Practice" vs lowercase display).
- Next-round candidate features (priority order): (1) offline indicator — a small badge when the SW controls the page & the last question came from the local generator; (2) mastery-aware verb picker — dim/check verbs with all rows mastered for the current subject; (3) install prompt hint (beforeinstallprompt) for the new PWA; (4) pace insight on the results screen (avgMs vs personal overall avg); (5) cross-tab mastery sync via BroadcastChannel (low priority — single-tab use is fine).
- scripts/gen-icons.ts kept (regenerates PWA icons from icon.svg); scripts/seed-hours.ts (temp) deleted.
- QA screenshot artifacts: /home/z/my-project/qa/r6-*.png (19 files) + qa/r6-07-share-card.png (the generated card).

---
Task ID: 7
Agent: main-orchestrator
Task: Round 7 — status assessment, agent-browser QA, 7 new features (offline indicator, mastery-aware verb picker, PWA install hint, results pace insight, streak milestones, keyboard help dialog, chart quiz-me button) + styling detail pass

Work Log:
- Assessed baseline: dev server healthy on :3000, lint clean, tsc clean (src/ — pre-existing tsc errors in examples/ & skills/ scaffolding are NOT app code), engine PASS 13397/13397.
- QA pass with agent-browser (named session, fresh browser at the end to avoid stale console buffers): Tables fill → check (border-success feedback confirmed), full timed session → results → session saved, all APIs + PWA assets 200. NO app bugs found — proceeded to features.
- QA harness notes: buttons render lowercase in DOM (CSS-uppercased) — click via textContent==='check' or aria-label; question prompts ARE the h2 text (initially misread "you constructed" as a UI label — it was the question); fetch-logging patch (window.__qaAnswers of full objects, matched by promptMain) powers automated correct-answer streaks.

## Goals / completed modifications / verification results
1. FEATURE — offline indicator (quiz):
   - types.ts: new QuestionFetch + fetchQuestionDetailed() returning {question, offline} (API vs local-generator fallback); fetchQuestion() kept as wrapper.
   - quiz-screen: offlineQuestion state + browser online/offline event listeners; showOffline = either. Animated height banner inside the sticky stats strip: WifiOff warn icon + "offline — questions generated on your device, nothing is lost". CRITICAL BUG FOUND & FIXED during QA: the prefetched-question advance path didn't carry the offline flag (nextOfflineRef added; advance() consumes it together with the question; prefetch .then stores it). VERIFIED: fetch-reject interception → banner shows from start, persists across prefetched questions, session still ends with results.
2. FEATURE — pace insight (results screen):
   - GET /api/sessions: stats gained question-weighted avgMsPerQuestion (null when no sessions; third findMany of {avgMsPerQuestion,total} summed in the route; SessionStats type updated).
   - practice-mode: sessionsRef mirrors sessions state; handleQuizEnd captures the PRE-save personal baseline (gate: ≥2 prior sessions AND ≥10 prior questions) → baselineAvgMs prop.
   - results-screen: paceInsight() → "1.4× faster than your 4.0s avg" (success, TrendingDown) / "× slower" (warn, TrendingUp) / "right at your average" (muted, Minus), under AVG / QUESTION. VERIFIED live: 6/6 session, 2.9s/q vs 4.0s baseline → "1.4× faster".
3. FEATURE — mastery-aware verb picker (Tables):
   - verb-picker: new subject + mastery props; one-pass masteredCounts Map (row counts only when BOTH es+en cells ≥ MASTERY_THRESHOLD, scoped to current subject); per-verb mono "n/23" counter (success + BadgeCheck at 23), tooltip explains the rule, footer line "charts mastered for {pronoun}: X/52". VERIFIED with seeded localStorage: hablar 2/23, hacer 1/23, footer renders.
4. FEATURE — "quiz me" on the chart header (Tables):
   - conjugation-chart: onQuizVerb prop → small brick-tinted Zap "quiz me" button (Tooltip: focused infinite drill) in CardAction next to the mastery badge; tables-mode passes onQuizVerb through. VERIFIED: click → Practice mode, "VERB DRILL · CAER" session starts.
5. FEATURE — PWA install hint:
   - NEW src/components/app/install-hint.tsx: captures beforeinstallprompt (requires event.prompt function); dismissible (localStorage tdv-install-dismissed, checked inside the event handler — never nags after dismissal; react-hooks/set-state-in-effect-safe); appinstalled clears it. Slim banner under the header, Download icon, install + X buttons. VERIFIED via synthetic event dispatch: shows, X dismisses (stored "1"), re-dispatch stays hidden.
6. FEATURE — keyboard help dialog:
   - NEW src/components/app/help-dialog.tsx: "atajos de teclado" Dialog with kbd-styled ShortcutRows (1/2 modes, ?, Enter submit/walk+check, ↑↓ rows, ←→ cells) + accents & offline notes. page.tsx: header Keyboard icon button + "?" shortcut (ignores inputs, modifiers, open dialogs incl. role=dialog); footer hint "? for shortcuts". VERIFIED: opens via button AND "?" key.
7. FEATURE — streak milestone toasts:
   - quiz-screen: streakToast at every correct multiple of 5 (5 "¡sigue así!", 10 "¡en fuego!", 15+ "imparable"); flame pulses (animate-pulse + primary) and streak number tints at ≥5. VERIFIED: 6-correct automated run → "¡racha de 5!" toast rendered.
8. STYLING (mandatory):
   - Verb picker: signature brick dash before group headings (español 5/6) — computed 12×1px oklab(0.49 0.13 0.07/0.7) VERIFIED; ChevronsUpDown rotates 180° while open (transition-transform).
   - Accent keys: press feedback active:scale-90 (transition covers transform).
   - Timer: countdown pulses (animate-pulse) in danger zone alongside destructive color.
   - Quiz input: italic Fraunces placeholder at 60% (computed VERIFIED, matches chart placeholders); question h2 text-balance.
   - Live ACC in the stat strip tints by band after ≥5 questions (≥80% success / <50% destructive / else primary).
9. QA/verification: lint clean; tsc clean (src/); engine PASS 13398/13398; all features browser-verified as noted; mobile 390px both modes 0 overflow offenders; dark-mode screenshots taken (r7-14/15) + 0 overflow; fresh-browser relaunch = ZERO console errors (the mid-round compile error was the MultiEdit stray-n corruption — fixed immediately; stale daemon console buffer had kept echoing it); DB cleaned to 0 sessions; fresh browser profile = clean localStorage for the user.

## Unresolved issues / risks / next-round priorities
- VLM image review was NOT possible this round (z-ai CLI + SDK both 401 "missing X-Token" — credentials not provisioned). Fell back to computed-style DOM verification for all styling claims. Next round: retry VLM for a visual pass.
- MultiEdit corruption gremlin struck ONCE again (stray `n` in verb-picker tooltip line 211) — caught by reading the file after every MultiEdit; keep that rule sacred.
- agent-browser console command shows the daemon-wide cumulative buffer — old errors keep appearing even in fresh tabs. To prove zero-errors: `agent-browser close` (full browser restart) then open + console.
- StrictMode double-invokes the prefetch effect in dev → duplicate /api/practice/question calls per question (harmless, dev-only, explains the extra fetch logs in QA).
- Next-round candidate features (priority): (1) mastery-aware "random" — bias RANDOM toward un-mastered verbs/subjects in Tables; (2) practice-mode streak milestone confetti burst (toasts exist, no confetti at 5/10); (3) verb-picker "hide mastered" toggle + sort-by-mastery option; (4) cross-tab mastery sync via BroadcastChannel (still low priority); (5) offline queue for unsaved sessions (currently sessions answered offline are lost — only generated locally, save fails silently).
- QA artifacts: /home/z/my-project/qa/r7-*.png (17 files).

---
Task ID: 8 (cron review round 8)
Agent: cron-webDevReview
Task: Continuous improvement round 8 — status assessment, agent-browser QA, wrong-answer auto-advance BUG FIX, mastery-aware random, verb-picker sort/filter, streak confetti, offline session queue, Web-Speech pronunciation, styling polish

## Current project status / assessment
- Baseline at round start: dev server healthy on :3000 (HTTP 200), lint clean, tsc clean (src/), engine PASS 13400/13400, DB 0 sessions, dev.log clean. Named session `r8-qa` used (all stray sessions closed first).

## Goals / completed modifications / verification results
1. BUG FOUND & FIXED — wrong answers auto-advanced (~300ms) without Enter:
   - Symptom: after a wrong answer, "answer: X" flashed for a split second and the quiz skipped ahead on its own; "press enter to continue" never persisted (verified with 100ms DOM polling + a window keydown capture counter showing only ONE Enter event).
   - Root cause: the submitting Enter bubbles to window; React adds the phase-change window keydown listener (advance-after-answer) fast enough that the SAME still-bubbling native event hits it → advance() fires immediately.
   - Fix: `handleInputKeyDown` in quiz-screen.tsx now calls `e.stopPropagation()` before `submit()` in the "asking" branch only (post-answer Enter still bubbles to the window listener, so the intended flow is untouched).
   - VERIFIED: wrong answer → feedback + "PRESS ENTER TO CONTINUE" persists indefinitely → explicit Enter advances; correct answers still auto-advance (550ms); accent path unaffected; full timed session → results end-to-end re-verified.
2. FEATURE — mastery-aware RANDOM (Tables):
   - use-cell-mastery.ts: new pure `countMasteredRows(mastery, verb, subject, rowKeys)` helper (shared with the picker).
   - handleRandom now builds all verb × subject pairs (excluding the current verb), weights each `un-mastered rows + 1` (no mastery data → uniform; fully-mastered pair ≈ 24× less likely), weighted-random pick; random button gained a Tooltip ("Weighted toward charts you haven't mastered yet").
   - VERIFIED: seeded mastery in localStorage + reload → 6 random clicks never re-picked the current verb; verb+subject both change.
3. FEATURE — verb-picker mastery sort + hide-mastered:
   - New controls row under the search input: `sort: a–z | needs work` + `hide mastered` (EyeOff icon). "needs work" = stable sort by mastered count ASC (least-mastered first, alphabetical ties); hide-mastered filters fully-mastered charts (23/23) for the current subject; dedicated empty states (search miss vs. "every verb is mastered — turn off hide mastered"); footer count adapts to the filtered list; focus-visible rings on all three controls; local `search` state for correct empty-state switching.
   - VERIFIED: hablar 5/23 → counter "5/23", needs-work sort moves it to LAST in its group (idx 27); full 23/23 seed + hide-mastered → 51 verbs, hablar hidden, footer "1/51".
4. FEATURE — streak milestone confetti (Practice):
   - New src/components/practice/celebrate.ts: `streakBurst(n)` — 5: center pop (40 particles); 10: double side cannons (55 each); 15+: side cannons + delayed center burst; brand colors, disableForReducedMotion, try/catch-guarded, zIndex 60. Called from streakToast at every multiple of 5.
   - VERIFIED: confetti canvas caught live 0.75s after the streak-10 answer; streak counter 6→10 with correct/skip flows intact (a wrong answer mid-test reset it, as designed).
5. FEATURE — offline session queue:
   - New src/components/practice/session-queue.ts: enqueueSession/queuedSessionCount/flushQueue (localStorage "tdv-session-queue", cap 20, oldest-first flush, stops at first failure).
   - practice-mode.tsx: saveSession failure → enqueue (banner count state); flush attempts on mount + window "online" event; after flush → refreshSessions + 5s "synced N offline session(s)" notice. SetupScreen: warn banner (CloudUpload + "N sessions waiting to sync" + "try now" retry button) + success notice, both animated.
   - VERIFIED end-to-end via fetch interception: end session while "offline" → parked (queueLen 888 chars) → setup shows "1 session waiting to sync" → back online + "try now" → "synced 1 offline session — your records are up to date", queue empty, row in SQLite (15 questions / 11 score).
6. FEATURE — pronunciation via Web Speech API (TTS SDK is 401 — "missing X-Token", same as round 7; pivoted to browser-native):
   - New src/hooks/use-speech.ts: useSpeech() — es-ES lang, rate 0.92, best-voice pick (es-ES → any es → null) with voiceschanged refresh, cancel-on-unmount, `supported` flag (speechSynthesis in window), all try/catch-guarded.
   - Quiz: "escuchar" pill button under the prompt — speaks promptMain for conjugation + ES→EN (hidden for EN→ES pre-answer; post-answer it speaks the Spanish displayAnswer for conjugation + EN→ES); speaking state pulses primary.
   - Tables chart header: "oír" outline button (speaks the verb, Tooltip); REVEAL mode: every Spanish answer form is now an underlined button (decoration-primary/35, hover full) that speaks it.
   - Verb-of-day: ghost speaker icon next to the actions (speaks the day's verb).
   - Results misses: each miss row gains a compact speaker (speaks the Spanish side — expected for conjugation/EN→ES, given for ES→EN).
   - VERIFIED: buttons render in all four surfaces in a speechSynthesis-capable browser (headless Chromium), clicks no-op safely with zero voices, zero console/page errors; in real browsers with Spanish voices it speaks.
7. STYLING (mandatory):
   - Toasts: rounded-md → rounded-xl + ToastTitle now `font-display text-base font-semibold italic` ("Flawless so far" renders in Fraunces italic — VERIFIED live on the check-flow toast).
   - Focus-visible rings on the three new picker controls; escuchar/oír/speak buttons all have focus-visible + hover + speaking states.
8. QA/verification: engine PASS 13397/13397 (varies ±few across runs — randomized quiz tests, all pass); lint clean; tsc clean (src/); mobile 390px 0 overflow offenders BOTH modes (dark+light); dark mode verified (bg lab(4.04…), toggle works both directions); fresh-browser relaunch = ZERO console errors; DB cleaned to 0 sessions; QA localStorage seeds cleared; light theme + desktop restored; dev.log clean.

## Unresolved issues / risks / next-round priorities
- QA-harness lesson (re-learned): reading DOM synchronously after batched state updates returns STALE values (6 random clicks all "returned" the old verb — the final state was correct; always re-read after a delay or event). Also radix toasts ≠ [data-sonner-toast] (wrong selector family — use `[data-radix-toast-viewport] li` or ol li[data-state]).
- The wrong-answer fix relies on stopPropagation halting native propagation at React's root — verified working in Chromium; if a future React version changes discrete-event effect timing, re-test the wrong-answer wait behavior.
- Web Speech quality depends on the user's OS/browser voices (no Spanish voice → silent no-op with the button still present). Acceptable: all major platforms ship Spanish voices; the buttons pulse on `speaking` state for feedback.
- TTS/z-ai SDK still 401 (rounds 7-8) — a server-side audio feature remains blocked until credentials exist.
- Next-round candidate features (priority): (1) quiz "slow mode" — reveal-mode study flashcards from the verb catalogue (self-paced browse of all 23 forms with the new speak buttons); (2) per-tense progress sparkline on Tables (chart-header mini bar of mastered/23 per group); (3) streak-freeze/restore ("practice streak insurance" — a streak survives one missed day once per week); (4) share card: include the escuchar idea — a QR/link for a public practice profile (needs an endpoint; currently single-user); (5) verb picker: jump-to-first-letter sections (A–Z rail) for faster browsing.
- QA artifacts: /home/z/my-project/qa/r8-*.png (5 files).

---
Task ID: 13 (cron review round 9)
Agent: cron-webDevReview
Task: Continuous improvement round 9 — status assessment, QA, hydration bug fix, Flashcards study mode (new 3rd app mode), A–Z verb-picker rail, per-group mastery bars, streak freeze (seguro de racha), styling pass

## Current project status / assessment
- Baseline at round start: dev server healthy on :3000 (HTTP 200), lint clean, tsc clean (src/), engine PASS 13397/13397, DB 0 sessions — consistent with round 8's handoff.
- QA pass (named agent-browser session `r9-qa`) found ONE real bug: the Next.js dev overlay showed "1 Issue — Recoverable Error / Hydration failed". Component stack pointed at VerbOfDay's speech button: server rendered [study, quiz] buttons, client hydration rendered [hear, study, quiz] because `useSpeech().supported` was computed DURING render (`typeof window !== "undefined" && "speechSynthesis" in window` → false on server, true on client). NO other bugs: Tables fill → check (border-success verified), full timed Practice session → results → session saved (2/3 · 67% in DB), zero console errors, mobile 390px 0 overflow both modes, dark mode OK.

## Goals / completed modifications / verification results
1. BUG FIX — hydration mismatch (speech buttons):
   - src/hooks/use-speech.ts: new `useSpeechSupported()` using the React-docs useSyncExternalStore pattern (noop subscribe, client snapshot `"speechSynthesis" in window`, server snapshot `false`) — false during SSR AND the hydration render, flips after mount. `useSpeech()` now derives `supported` from it; plain `speechSupported()` kept for event handlers only. Fixes all four consumers at once (verb-of-day, conjugation-chart, quiz-screen, results-screen).
   - VERIFIED: fresh load → no "1 Issue" badge, zero console/hydration errors, "hear caer in Spanish" button still appears post-hydration.
2. FEATURE — Flashcards study mode (NEW third app mode, round-8's #1 candidate):
   - NEW src/components/cards/flashcards-mode.tsx: self-paced deck of one verb's 23 forms. 3D flip card (framer-motion rotateY + preserve-3d + backfaceVisibility, inline styles for the 3D bits), front = group + tense + pronoun chip + one language, back = both languages + escuchar (Web Speech). Direction toggle (EN→ES default / ES→EN front), shuffle (fisher–yates, event-driven only), random verb, reset deck, seen-tracking ("N vistas"), 23-segment clickable progress rail with tense tooltips (hidden < sm), full keyboard support (←/→ deck with wrap, Space/Enter flip, S speak), localStorage prefs "tdv-flashcards" (verb/subject/direction/shuffled) via ONE lazily-initialized state object (loadPrefs — lint-clean, no set-state-in-effect; Cards never SSRs since it's not the default mode). Hidden face gets aria-hidden + inert (React 19 boolean inert) so invisible buttons aren't tabbable.
   - mode-switcher.tsx: AppMode + "cards" (Layers icon) with per-mode Tooltip hints ("fill-in conjugation charts — key 1" etc.).
   - page.tsx: renders FlashcardsMode for mode "cards"; shortcut 3/C (input/dialog/popover-guarded — also added [data-radix-popper-content-wrapper] guard); footer "press 1 / 2 / 3".
   - help-dialog.tsx: new rows for Space flip, ←/→ deck walk, S speak; mode row now "1 · tables — 2 · practice — 3 · cards (T / P / C also work)".
   - VERIFIED in-browser: arrow navigation (card 4 = presente ✓), Space flip + seen counter, direction toggle (front shows Spanish ✓), shuffle (first card = tú imperative ✓), prefs persist across reload (direction "es", shuffled true restored), escuchar renders (speechSynthesis-capable headless), 0 overflow at 390px AND 1280px, zero console errors, dark mode screenshot taken.
3. FEATURE — A–Z quick-jump rail (verb picker):
   - verb-picker.tsx: module-level AzRail component (nav of letter buttons, absolute right-1 inside a new relative wrapper around CommandList; list gets pr-6 so items never slide under the rail). Letters computed from the SAME set cmdk shows (verb+gloss contains normalized search; respects level filter + hide-mastered) — accent-normalized first letters (reír → R). jumpToLetter: first [data-verb] item (new attribute on CommandItem) whose normalized verb starts with the letter → scrollIntoView block:start. Rail hidden when ≤1 letter.
   - VERIFIED: rail shows exactly A C D E F M O P Q R S T V (15 letters); click V → vivir scrolls to list top; search "re" → letters shrink to the matching set (A C D F M O Q R S V — gloss matches included, e.g. "fired" contains "re").
4. FEATURE — per-group mastery bars (Tables chart header):
   - conjugation-chart.tsx: module-level GroupMasteryBars — 5 slim segmented bars (base 3 / indicative 5 / perfect 4 / subjunctive 4 / imperative 7) under the header description; fill = mastered rows / group rows from the existing masteredRows Set; complete group → bg-success, partial → bg-primary; per-bar Tooltip + focus ring; container role="img" with full aria-label summary.
   - VERIFIED with seeded localStorage mastery (hablar: inf/ger/part + pres mastered): bars 100%+success, 20%+primary, 0%, 0%, 0%; aria-label "los básicos 3/3, indicativo 1/5, …".
5. FEATURE — streak freeze / seguro de racha (round-8 candidate #3):
   - prisma/schema.prisma: NEW StreakFreeze model { id, frozenFor, createdAt }; db:push OK. NOTE: the RUNNING dev server kept the old Prisma client in memory → /api/sessions/stats 500 until restart (killed + setsid restart fixed it — future schema changes need a dev-server restart).
   - NEW POST /api/streak-freeze: validates (yesterday has no sessions) ∧ (day-before-yesterday has sessions) ∧ (yesterday not already frozen) ∧ (no freeze claimed in rolling 7 days) → 409/409/409/429 on violations; creates the freeze row for yesterday's local midnight.
   - stats route: loads ALL freezes (frozenKeys — permanent bridges); streak loop `hasPracticeOrFreeze` skips frozen days WITHOUT counting (continuity only); NEW daily fields: freezeOffer (live streak missed exactly yesterday, not frozen, no recent claim), freezableStreak (the run a freeze would restore — shown in the offer text since streakDays is already 0 when broken), frozenYesterday. bestStreakDays stays pure practice-run.
   - daily-strip.tsx: "protegida" snowflake chip next to the racha label when frozenYesterday; animated offer banner ("you missed yesterday — your 3-day racha can still be saved. (one freeze per week)" + "reclamar el seguro" button with claiming spinner + error line); wired through setup-screen (onClaimFreeze prop) and practice-mode (POST + refreshSessions).
   - VERIFIED end-to-end: seeded day-2/3/4 sessions → stats {streakDays: 0, freezeOffer: true, freezableStreak: 3} → UI offer renders → click claim → {PROTEGIDA + "3 días seguidos" + offer gone} → API streakDays 0→3 → repeat POST rejected 409; rate-limit path also verified (429 shape).
6. STYLING (mandatory):
   - Flashcard front: oversized deck-position watermark ("01"…"23", Fraunces black italic, accent-foreground/5.5%) — deliberately NOT the verb (would spoil EN→ES recall).
   - Flip card: whileHover scale 1.015 + whileTap 0.99; front keeps the accent paper gradient + dotted texture family; back = card bg with primary border + shadow-lg.
   - Mode switcher buttons gained Tooltip shortcut hints; help dialog reorganized for 3 modes.
   - Freeze banner: primary-tinted inset with Snowflake accents, animated height reveal.
7. QA/verification: lint clean; tsc clean (src/ — examples/ & skills/ scaffolding errors are pre-existing non-app code); engine PASS 13405/13405; fresh-browser relaunch = ZERO console errors + zero hydration issues + no dev-overlay badge; mobile 390px 0 overflow offenders in ALL THREE modes; dark mode screens (practice mobile, cards desktop) taken; ALL test data cleaned (0 sessions, 0 freezes, mastery seed cleared); both QA browser sessions closed; light theme + desktop viewport restored; dev.log clean.

## Unresolved issues / risks / next-round priorities
- eslint-plugin-react-hooks v6 strikes again — TWO new strict rules hit this round: `react-hooks/refs` (no `speechRef.current = speech` during render — dropped the ref, callbacks now depend on speech directly) and `set-state-in-effect` (localStorage hydration effect flagged even though tables-mode's identical pattern passes — likely rule-internal heuristics; used the use-daily-goal lazy-initializer pattern instead, single `useState(loadPrefs)` state object). Cards-mode is lazy-init-safe ONLY because it never SSRs (not the default mode) — if Cards ever becomes the default route render, revisit.
- Prisma schema changes require a dev-server RESTART (running server keeps the old client → 500s). Future rounds: after `bun run db:push`, always `pkill -f "next dev"` + setsid restart.
- agent-browser ref IDs go stale across reloads — prefer CSS/eval-based element targeting after any reload.
- Freezes are PERMANENT bridges in streak math but claims are rate-limited to 1/week — a user who stops for 2+ days cannot bridge (by design); the offer UI only appears for exactly-one-missed-day.
- Next-round candidate features (priority): (1) flashcards "star/leech" marking — flag forms that need extra review and a "review starred" deck (pure localStorage); (2) per-card self-grade ("lo sabía / no lo sabía") feeding a spaced-repetition-lite ordering; (3) cross-mode handoff — "study this verb in cards" from Tables/chart + verb-of-day; (4) share card QR/public profile (needs endpoint — still blocked on single-user); (5) VLM visual review was NOT run this round (rounds 7-9 all fell back to DOM verification — retry when credentials exist).
- QA artifacts: /home/z/my-project/qa/r9-*.png (8 files). Utility: scripts/seed-freeze-scenario.ts (seeds day-2/3/4 sessions for freeze-offer QA — clean-sessions + deleteMany StreakFreeze after use).
