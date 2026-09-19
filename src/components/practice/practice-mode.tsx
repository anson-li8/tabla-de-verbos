"use client";

// ─────────────────────────────────────────────────────────────
// PracticeMode — top-level state machine: setup → quiz → results.
// Owns settings (persisted to localStorage "tdv-practice"), the
// records/sessions data and session lifecycle.
// Rendered by Task 3-b's page inside a max-w-6xl container.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { QuizScreen } from "./quiz-screen";
import { ResultsScreen } from "./results-screen";
import { SetupScreen } from "./setup-screen";
import {
  DEFAULT_SETTINGS,
  buildDrillSettings,
  fetchFocusStats,
  fetchQuestionDetailed,
  fetchSessions,
  sanitizeSettings,
  saveSession,
  PRACTICE_TENSES,
  type FocusStatsResponse,
  type MissRecord,
  type Question,
  type QuizSettings,
  type SessionSummary,
  type SessionsResponse,
} from "./types";
import { ALL_VERBS, ROW_META, type RowKey } from "@/lib/conjugator/types";

type Screen = "setup" | "quiz" | "results";

const SETTINGS_KEY = "tdv-practice";

const screenMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};

interface PracticeModeProps {
  /** verb handed over from Tables mode ("quiz me on this verb") — consumed once */
  quizVerb?: string | null;
  /** page-level callback: the handed-over verb has been picked up */
  onQuizVerbConsumed?: () => void;
}

export default function PracticeMode({
  quizVerb,
  onQuizVerbConsumed,
}: PracticeModeProps) {
  const [screen, setScreen] = useState<Screen>("setup");

  // settings (hydrated from localStorage, persisted on change)
  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // records / recent sessions (GET /api/sessions) + focus
  // analytics (GET /api/sessions/stats) — refreshed together
  const [sessions, setSessions] = useState<SessionsResponse | null>(null);
  const [focusStats, setFocusStats] = useState<FocusStatsResponse | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  // mirror of `sessions` on a ref — lets handleQuizEnd read the
  // PRE-save stats (personal baseline) without stale-closure risk
  const sessionsRef = useRef<SessionsResponse | null>(null);

  // session lifecycle
  const [sessionKey, setSessionKey] = useState(0);
  const [initialQuestion, setInitialQuestion] = useState<Question | null>(null);
  /** true when the session's first question came from the local
   *  (offline) generator rather than the API */
  const [initialOffline, setInitialOffline] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  /** personal pace baseline (ms/question) captured BEFORE the
   *  just-finished session is saved — powers the pace insight */
  const [baselineAvgMs, setBaselineAvgMs] = useState<number | null>(null);

  /** focused settings while a drill session is active */
  const [drill, setDrill] = useState<QuizSettings | null>(null);
  /** chip label shown on every quiz question ("miss drill · 3 verbs") */
  const [drillLabel, setDrillLabel] = useState<string | null>(null);
  /** short label for the results mode line ("miss drill" / "verb drill") */
  const [drillShort, setDrillShort] = useState<string | null>(null);

  const clearDrill = useCallback(() => {
    setDrill(null);
    setDrillLabel(null);
    setDrillShort(null);
  }, []);

  // hydrate persisted settings
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings(sanitizeSettings(JSON.parse(raw)));
    } catch {
      // corrupted or unavailable — keep defaults
    }
    setSettingsLoaded(true);
  }, []);

  // persist settings
  useEffect(() => {
    if (!settingsLoaded) return;
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // storage unavailable — non-fatal
    }
  }, [settings, settingsLoaded]);

  const refreshSessions = useCallback(async () => {
    try {
      // focus stats are a nice-to-have — never let their failure
      // take the records strip down with them
      const [sessionsRes, focusRes] = await Promise.all([
        fetchSessions(),
        fetchFocusStats().catch(() => null),
      ]);
      setSessions(sessionsRes);
      sessionsRef.current = sessionsRes;
      setFocusStats(focusRes);
    } catch {
      // silent — records strip falls back to its empty state
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  const handleSettingsChange = (next: QuizSettings) => {
    setSettings(next);
    clearDrill();
    setStartError(false);
  };

  // fetch the first question (Start / practice again / drills) — the
  // quiz prefetches everything after it. `override` replaces the settings
  // for this session; `clearDrill` drops a previously active drill.
  const startSession = useCallback(
    async (override?: QuizSettings, clearDrillBefore = false) => {
      if (starting) return;
      setStarting(true);
      setStartError(false);
      if (clearDrillBefore) clearDrill();
      const active = override ?? drill ?? settings;
      try {
        const { question, offline } = await fetchQuestionDetailed(active);
        setInitialQuestion(question);
        setInitialOffline(offline);
        setSessionKey((k) => k + 1);
        setScreen("quiz");
      } catch {
        setStartError(true);
      } finally {
        setStarting(false);
      }
    },
    [settings, drill, starting, clearDrill]
  );

  // "drill these misses" — focused infinite session on the missed verbs
  const handleDrillMisses = useCallback(
    (misses: MissRecord[]) => {
      const drillSettings = buildDrillSettings(misses, settings);
      if (!drillSettings) return;
      const verbs = drillSettings.verbs ?? [];
      setDrill(drillSettings);
      setDrillLabel(`miss drill · ${verbs.length} verb${verbs.length === 1 ? "" : "s"}`);
      setDrillShort("miss drill");
      void startSession(drillSettings);
    },
    [settings, startSession]
  );

  // "quiz me on this verb" — focused infinite session on a single verb
  const startVerbDrill = useCallback(
    (verb: string) => {
      if (!ALL_VERBS.includes(verb)) return;
      const drillSettings: QuizSettings = {
        ...settings,
        verbs: [verb],
        mode: "infinite",
      };
      setDrill(drillSettings);
      setDrillLabel(`verb drill · ${verb}`);
      setDrillShort("verb drill");
      void startSession(drillSettings);
    },
    [settings, startSession]
  );

  // "drill this tense" — focused infinite session on a single tense
  const startTenseDrill = useCallback(
    (tense: string) => {
      if (!(PRACTICE_TENSES as string[]).includes(tense)) return;
      const drillSettings: QuizSettings = {
        ...settings,
        verbs: undefined,
        tenses: [tense as RowKey],
        mode: "infinite",
      };
      setDrill(drillSettings);
      setDrillLabel(
        `tense drill · ${ROW_META[tense as RowKey]?.labelEs ?? tense}`
      );
      setDrillShort("tense drill");
      void startSession(drillSettings);
    },
    [settings, startSession]
  );

  // a verb handed over from Tables mode (verb-of-the-day "quiz me")
  // starts a verb drill automatically — consumed exactly once
  useEffect(() => {
    if (!quizVerb) return;
    onQuizVerbConsumed?.();
    startVerbDrill(quizVerb);
  }, [quizVerb]);

  // quiz finished with at least one answered question:
  // capture the personal pace baseline from the PRE-save stats,
  // save the session, then show the results
  const handleQuizEnd = useCallback(
    async (s: SessionSummary) => {
      const prior = sessionsRef.current?.stats ?? null;
      // baseline needs a meaningful history: ≥ 2 prior sessions and
      // ≥ 10 prior questions — otherwise the comparison is noise
      setBaselineAvgMs(
        prior && prior.totalSessions >= 2 && prior.totalQuestions >= 10
          ? prior.avgMsPerQuestion
          : null
      );
      try {
        await saveSession(s);
      } catch {
        // silent — results still render, session just isn't saved
      }
      setSummary(s);
      setScreen("results");
      setSessionsLoading(true);
      await refreshSessions();
    },
    [refreshSessions]
  );

  // quiz ended without answering anything — straight back to setup
  const handleEmptyEnd = useCallback(() => {
    setScreen("setup");
  }, []);

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {screen === "setup" && (
          <motion.div key="setup" {...screenMotion}>
            <SetupScreen
              settings={settings}
              onChange={handleSettingsChange}
              onStart={() => void startSession(undefined, true)}
              starting={starting}
              startError={startError}
              sessions={sessions}
              sessionsLoading={sessionsLoading}
              focusStats={focusStats}
              onDrillMisses={() =>
                handleDrillMisses(focusStats?.recentMisses ?? [])
              }
              onVerbDrill={startVerbDrill}
              onTenseDrill={startTenseDrill}
            />
          </motion.div>
        )}

        {screen === "quiz" && initialQuestion && (
          <motion.div key="quiz" {...screenMotion}>
            <QuizScreen
              key={sessionKey}
              initialQuestion={initialQuestion}
              initialOffline={initialOffline}
              settings={drill ?? settings}
              drillLabel={drillLabel}
              onEnd={(s) => void handleQuizEnd(s)}
              onEmptyEnd={handleEmptyEnd}
            />
          </motion.div>
        )}

        {screen === "results" && summary && (
          <motion.div key="results" {...screenMotion}>
            <ResultsScreen
              summary={summary}
              sessions={sessions}
              sessionsLoading={sessionsLoading}
              drillShort={drillShort}
              baselineAvgMs={baselineAvgMs}
              onPracticeAgain={() => void startSession()}
              onDrillMisses={handleDrillMisses}
              onVerbDrill={startVerbDrill}
              onChangeSettings={() => setScreen("setup")}
              againLoading={starting}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
