# Tabla de Verbos — Spanish Verb Mastery

A modern rebuild of the classic *tabladeverbos* conjugation trainer. Three
modes, 52 verbs, 23 forms, 6 subjects (incl. **vosotros**) — everything runs
**100% in the browser**: no server, no API, no database, no account. Your
practice history, streaks and mastery live in `localStorage` on your device.

## Modes

| Mode | What it does |
| --- | --- |
| **Tables** (1) | Classical fill-in conjugation charts — type the 23 forms × 2 languages, check with per-cell feedback, or reveal the reference chart. Mastery tracking per cell. |
| **Practice** (2) | Random quizzes — conjugation, ES→EN and EN→ES translation. Timed challenge or infinite mode, streaks, records, focus analytics (hardest verbs/tenses, pace, best time of day), daily goal & racha with streak-freeze insurance. |
| **Cards** (3) | Self-paced flip flashcards of a verb's full conjugation with pronunciation (Web Speech). |

Extras: verb of the day, A–Z verb picker with mastery sort, activity heatmap,
offline PWA (installable, works with zero connection), keyboard-first UX,
light/dark themes, accent-aware grading (`pensais` → *accent-only* warning).

## Your data

Everything is stored locally (`tdv-*` keys in `localStorage`). The **?** help
dialog has a *tus datos* section to **export** a JSON backup, **import** it on
another device, or **wipe** the history.

## Develop

```bash
bun install        # or npm install
bun run dev        # http://localhost:3000
bun run lint       # eslint
```

## Deploy (static — Netlify, Vercel, GitHub Pages, any host)

The site is a static export — `next build` writes the whole app to `./out`.

**Netlify (recommended):**
1. Push this repo to GitHub.
2. In Netlify: *Add new site → Import an existing project* → pick the repo.
3. The included `netlify.toml` already sets `command = "npm run build"` and
   `publish = "out"` — just deploy. (Or drag-and-drop the `out/` folder at
   app.netlify.com/drop.)

**Anywhere else:** run `npm run build` and upload the `out/` directory.

## Tech

Next.js 16 (App Router, static export) · TypeScript · Tailwind CSS 4 ·
shadcn/ui · Framer Motion · pure-TS conjugation engine (52 verbs, 23 forms)
with accent-aware answer checking · localStorage persistence · service worker.

## Project layout

```
src/
  app/                    page.tsx (single-route SPA), layout.tsx, globals.css
  lib/conjugator/         engine.ts · checker.ts · quiz.ts · types.ts (pure)
  components/tables/      chart, check/reveal grading, mastery, verb picker
  components/practice/    setup/quiz/results, session-store.ts (localStorage)
  components/cards/       flashcards mode
  components/app/         header, help dialog (data manager), theme toggle
public/                   icons, manifest.webmanifest, sw.js (PWA)
```
