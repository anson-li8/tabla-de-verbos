# Task 3-c — Practice Mode UI (ui-practice)

Task: build the complete Practice experience (`src/components/practice/**`) as a
setup → quiz → results state machine, default-exporting `PracticeMode` from
`practice-mode.tsx` for Task 3-b's page.

## Files created (all under `src/components/practice/`)

- `types.ts` — client-side types (`Question`, `QuizSettings`, `SessionSummary`,
  `MissRecord`, `SessionsResponse`, …), constants (`PRACTICE_TENSES` — the 16
  curated tenses, `CORE_TENSES`, `DURATION_OPTIONS`, `DEFAULT_SETTINGS`,
  `MICRO` label class), `sanitizeSettings()` for localStorage hydration,
  formatters (`formatMs`, `formatCountdownMs`, `formatDuration`, `timeAgo`,
  `kindLabel`, `answerLang`) and fetchers (`fetchQuestion`, `fetchSessions`,
  `saveSession`) with 10s abort timeouts + response validation.
- `practice-mode.tsx` — **default export `PracticeMode`** (no props). Owns the
  screen state machine, settings persistence (`localStorage "tdv-practice"`,
  sanitized on load), sessions data (GET on mount, silent fail, refetch after
  save), and session lifecycle: Start fetches the first question (spinner in
  button, retry line on error) then mounts `QuizScreen key={sessionKey}`.
- `setup-screen.tsx` — records strip + form card: 3 question-type toggle cards
  (Languages / ArrowRight / ArrowLeft icons), 16 tense chips with core/all/none
  presets + "N of 16 selected" counter, verb-level segmented control
  (español 5 / español 6 / all with 29/24/53 counts, framer-motion layoutId
  pill), Timed/Infinite mode cards (duration chips 1/2/5/10 min animate in when
  timed selected), big Start button (h-14, Play icon, "empezar", disabled +
  tooltip when no types/tenses).
- `quiz-screen.tsx` — sticky stats strip (top-16 under page header): countdown
  ring + mm:ss (destructive under 20%), questions/score/streak (flame pop via
  keyframe remount)/acc, End button with AlertDialog "finish early?". Question
  card: motion.div keyed by id (slide x + fade), mono chips + kind icon,
  promptMain in font-display text-4xl→6xl, big centered input (readOnly when
  answered — keeps focus for Enter), accent keys insert at caret, submit arrow
  button, skip (counts wrong), instant `checkAnswer` feedback (exact → green +
  "¡correcto!" + 550ms auto-advance; accent → amber + displayAnswer + 900ms;
  wrong → shake + "answer: …" + press enter/continue button), prefetches next
  question, timestamp-based 250ms clock, "saving session…" state while parent
  POSTs, retry UI on fetch failure.
- `results-screen.tsx` — hero: animated accuracy ring (success ≥80% / primary
  ≥50% / destructive below) + score, mode line, best streak, avg s/question,
  accent warnings; confetti (brand colors, two corner bursts, ~90 particles,
  gravity 0.9, ref-guarded against StrictMode double-fire,
  disableForReducedMotion) when accuracy ≥ 0.8 && total ≥ 5; misses review
  (max-h-96 scrollbar-thin, given/you/correct lines, flawless empty state);
  practice again / change settings buttons; recent sessions strip.
- `timer-ring.tsx`, `accuracy-ring.tsx`, `accent-keys.tsx`,
  `records-strip.tsx` (4 stat cards / skeletons / empty state),
  `recent-sessions.tsx` (up to 6 rows, mono meta "timed · 2 min · 5m ago" +
  "12/15 · 80% · streak 7").

## Notes for downstream agents

- API contracts consumed: `POST /api/practice/question` `{types, tenses, level,
  mode, durationSec}` → `Question`; `GET /api/sessions?limit=8` →
  `{recent, stats}`; `POST /api/sessions` with the full `SessionSummary` body
  (misses capped at last 50). All fetch failures are handled gracefully
  (retry UI / silent fallback) — the UI stays usable even before Task 3-a's
  routes exist.
- Settings persisted shape = `QuizSettings` (key `tdv-practice`), validated
  with `sanitizeSettings` so stale/unknown values fall back to defaults.
- The quiz strip is `sticky top-16` (matches 3-b's `h-16` sticky header, z-30
  below its z-40).
- `bun run lint` passes clean; `tsc --noEmit` clean for `src/` (only
  pre-existing errors in `examples/`/`skills/` remain).
- Deliberate deviations: answered input is `readOnly` instead of `disabled`
  (keeps focus so Enter works, mobile keyboards stay open); a "continue →"
  button appears after wrong answers for touch users (spec assumed keyboard);
  "questions" stat shows the answered count in both modes (timed mode has no
  fixed question target); recent-sessions list lives on the results screen
  (setup shows the 4-card records strip per the task brief).
