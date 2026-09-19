"use client";

// ─────────────────────────────────────────────────────────────
// Results screen — accuracy ring hero, confetti for strong
// sessions, misses review list, actions and recent sessions.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import {
  Flame,
  Loader2,
  Play,
  Settings2,
  Sparkles,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { ROW_META, SUBJECTS, type RowKey } from "@/lib/conjugator/types";
import { cn } from "@/lib/utils";

import { AccuracyRing } from "./accuracy-ring";
import { RecentSessions } from "./recent-sessions";
import {
  MICRO,
  formatDuration,
  kindLabel,
  type MissRecord,
  type SessionSummary,
  type SessionsResponse,
} from "./types";

const CONFETTI_COLORS = ["#b03d2c", "#d9a441", "#5c8a4e", "#e8d5b5"];

interface ResultsScreenProps {
  summary: SessionSummary;
  sessions: SessionsResponse | null;
  sessionsLoading: boolean;
  /** true when this session was a focused miss-drill */
  wasDrill: boolean;
  onPracticeAgain: () => void;
  onDrillMisses: (misses: MissRecord[]) => void;
  onChangeSettings: () => void;
  againLoading: boolean;
}

export function ResultsScreen({
  summary,
  sessions,
  sessionsLoading,
  wasDrill,
  onPracticeAgain,
  onDrillMisses,
  onChangeSettings,
  againLoading,
}: ResultsScreenProps) {
  // fire confetti once for strong sessions (≥ 80% with ≥ 5 questions)
  const celebratedRef = useRef(false);
  useEffect(() => {
    if (celebratedRef.current) return;
    if (summary.accuracy < 0.8 || summary.total < 5) return;
    celebratedRef.current = true;
    try {
      void confetti({
        particleCount: 45,
        spread: 55,
        angle: 60,
        origin: { x: 0, y: 0.95 },
        gravity: 0.9,
        colors: CONFETTI_COLORS,
        disableForReducedMotion: true,
      });
      const t = setTimeout(() => {
        try {
          void confetti({
            particleCount: 45,
            spread: 55,
            angle: 120,
            origin: { x: 1, y: 0.95 },
            gravity: 0.9,
            colors: CONFETTI_COLORS,
            disableForReducedMotion: true,
          });
        } catch {
          // best effort
        }
      }, 160);
      return () => clearTimeout(t);
    } catch {
      // confetti is best-effort — never block the results
    }
  }, [summary]);

  const modeLine = `${
    wasDrill ? "miss drill" : summary.mode === "timed" ? "timed" : "infinite"
  } · ${formatDuration(summary.durationSec)}`;
  const drillVerbCount = new Set(summary.misses.map((m) => m.verb)).size;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      {/* hero: ring + headline stats */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        aria-label="session results"
        className="rounded-2xl border bg-card bg-dotted p-6 shadow-sm sm:p-8"
      >
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:gap-10">
          <AccuracyRing accuracy={summary.accuracy} />
          <div className="w-full flex-1 space-y-4 text-center sm:text-left">
            <div>
              <p className={MICRO}>score</p>
              <p className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
                {summary.score}
                <span className="text-2xl text-muted-foreground/70 sm:text-3xl">
                  {" "}
                  / {summary.total}
                </span>
              </p>
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {modeLine}
            </p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 sm:justify-start">
              <div>
                <p className={MICRO}>best streak</p>
                <p className="mt-1 flex items-center gap-1.5 font-mono text-lg leading-none tabular-nums">
                  <Flame className="size-4 text-primary" aria-hidden="true" />
                  {summary.bestStreak}
                </p>
              </div>
              <div>
                <p className={MICRO}>avg / question</p>
                <p className="mt-1 font-mono text-lg leading-none tabular-nums">
                  {(summary.avgMsPerQuestion / 1000).toFixed(1)}s
                </p>
              </div>
              <div>
                <p className={MICRO}>accent warnings</p>
                <p
                  className={cn(
                    "mt-1 font-mono text-lg leading-none tabular-nums",
                    summary.accentWarnings > 0
                      ? "text-warn"
                      : "text-muted-foreground"
                  )}
                >
                  {summary.accentWarnings}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* misses review */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
        aria-label="review your misses"
      >
        <h3 className="mb-3 font-display text-2xl font-semibold">
          review your misses
        </h3>
        {summary.misses.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 rounded-2xl py-12 text-center shadow-sm">
            <Sparkles className="size-7 text-primary" aria-hidden="true" />
            <p className="font-display text-2xl italic">
              flawless — nada que repasar
            </p>
            <p className="text-sm text-muted-foreground">
              not a single miss this session
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-2xl py-0 shadow-sm">
            <div className="scrollbar-thin max-h-96 divide-y overflow-y-auto">
              {summary.misses.map((miss, i) => (
                <MissRow
                  key={`${miss.verb}-${miss.tense}-${i}`}
                  miss={miss}
                />
              ))}
            </div>
          </Card>
        )}
      </motion.section>

      {/* actions */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.16, ease: "easeOut" }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        {summary.misses.length > 0 ? (
          <>
            <Button
              size="lg"
              className="h-14 flex-1 gap-2.5 rounded-xl text-base font-semibold"
              onClick={() => onDrillMisses(summary.misses)}
              disabled={againLoading}
            >
              <Target className="size-5" aria-hidden="true" />
              drill these misses
              <span className="font-mono text-xs font-normal opacity-75">
                {drillVerbCount} verb{drillVerbCount === 1 ? "" : "s"}
              </span>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 gap-2.5 rounded-xl px-8 text-base"
              onClick={onPracticeAgain}
              disabled={againLoading}
            >
              {againLoading ? (
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="size-5" aria-hidden="true" />
              )}
              practice again
            </Button>
          </>
        ) : (
          <Button
            size="lg"
            className="h-14 flex-1 gap-2.5 rounded-xl text-base font-semibold"
            onClick={onPracticeAgain}
            disabled={againLoading}
          >
            {againLoading ? (
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="size-5" aria-hidden="true" />
            )}
            practice again
          </Button>
        )}
        <Button
          size="lg"
          variant="outline"
          className="h-14 gap-2.5 rounded-xl px-8 text-base"
          onClick={onChangeSettings}
        >
          <Settings2 className="size-5" aria-hidden="true" />
          change settings
        </Button>
      </motion.section>

      {/* recent sessions */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.22, ease: "easeOut" }}
        aria-label="recent sessions"
      >
        <RecentSessions data={sessions} loading={sessionsLoading} />
      </motion.section>
    </div>
  );
}

// ── Miss row ─────────────────────────────────────────────────

const MISS_CHIP =
  "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground";

function MissRow({ miss }: { miss: MissRecord }) {
  const tenseLabel = ROW_META[miss.tense as RowKey]?.labelEs ?? miss.tense;
  const pronoun = miss.subject
    ? SUBJECTS.find((s) => s.key === miss.subject)?.pronoun
    : null;

  return (
    <div className="px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-display text-lg font-semibold leading-none">
          {miss.verb}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {pronoun && <span className={MISS_CHIP}>{pronoun}</span>}
          <span className={MISS_CHIP}>{tenseLabel}</span>
          <span className={MISS_CHIP}>{kindLabel(miss.kind)}</span>
        </span>
      </div>
      <dl className="mt-2 space-y-1 text-sm">
        <MissLine label="given" value={miss.given} />
        <MissLine
          label="you"
          value={miss.userAnswer || "—"}
          valueClass="text-destructive"
        />
        <MissLine
          label="correct"
          value={miss.expected}
          valueClass="font-medium text-success"
        />
      </dl>
    </div>
  );
}

function MissLine({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex gap-3">
      <dt className={cn(MICRO, "w-14 shrink-0 pt-1 text-right")}>{label}</dt>
      <dd className={cn("min-w-0 break-words", valueClass)}>{value}</dd>
    </div>
  );
}
