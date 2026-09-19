"use client";

// ─────────────────────────────────────────────────────────────
// PracticeMode — top-level state machine: setup → quiz → results.
// Owns settings (persisted to localStorage "tdv-practice"), the
// records/sessions data and session lifecycle.
// Rendered by Task 3-b's page inside a max-w-6xl container.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { QuizScreen } from "./quiz-screen";
import { ResultsScreen } from "./results-screen";
import { SetupScreen } from "./setup-screen";
import {
  DEFAULT_SETTINGS,
  buildDrillSettings,
  fetchFocusStats,
  fetchQuestion,
  fetchSessions,
  sanitizeSettings,
  saveSession,
  type FocusStatsResponse,
  type MissRecord,
  type Question,
  type QuizSettings,
  type SessionSummary,
  type SessionsResponse,
} from "./types";

type Screen = "setup" | "quiz" | "results";

const SETTINGS_KEY = "tdv-practice";

const screenMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};

export default function PracticeMode() {
  const [screen, setScreen] = useState<Screen>("setup");

  // settings (hydrated from localStorage, persisted on change)
  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // records / recent sessions (GET /api/sessions) + focus
  // analytics (GET /api/sessions/stats) — refreshed together
  const [sessions, setSessions] = useState<SessionsResponse | null>(null);
  const [focusStats, setFocusStats] = useState<FocusStatsResponse | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  // session lifecycle
  const [sessionKey, setSessionKey] = useState(0);
  const [initialQuestion, setInitialQuestion] = useState<Question | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  /** focused settings while a "drill my misses" session is active */
  const [drill, setDrill] = useState<QuizSettings | null>(null);

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
    setDrill(null);
    setStartError(false);
  };

  // fetch the first question (Start / practice again / miss drill) — the
  // quiz prefetches everything after it. `override` replaces the settings
  // for this session; `clearDrill` drops a previously active drill.
  const startSession = useCallback(
    async (override?: QuizSettings, clearDrill = false) => {
      if (starting) return;
      setStarting(true);
      setStartError(false);
      if (clearDrill) setDrill(null);
      const active = override ?? drill ?? settings;
      try {
        const q = await fetchQuestion(active);
        setInitialQuestion(q);
        setSessionKey((k) => k + 1);
        setScreen("quiz");
      } catch {
        setStartError(true);
      } finally {
        setStarting(false);
      }
    },
    [settings, drill, starting]
  );

  // "drill these misses" — focused infinite session on the missed verbs
  const handleDrillMisses = useCallback(
    (misses: MissRecord[]) => {
      const drillSettings = buildDrillSettings(misses, settings);
      if (!drillSettings) return;
      setDrill(drillSettings);
      void startSession(drillSettings);
    },
    [settings, startSession]
  );

  // quiz finished with at least one answered question:
  // save the session, then show the results
  const handleQuizEnd = useCallback(
    async (s: SessionSummary) => {
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
            />
          </motion.div>
        )}

        {screen === "quiz" && initialQuestion && (
          <motion.div key="quiz" {...screenMotion}>
            <QuizScreen
              key={sessionKey}
              initialQuestion={initialQuestion}
              settings={drill ?? settings}
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
              wasDrill={!!drill}
              onPracticeAgain={() => void startSession()}
              onDrillMisses={handleDrillMisses}
              onChangeSettings={() => setScreen("setup")}
              againLoading={starting}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
