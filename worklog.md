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
