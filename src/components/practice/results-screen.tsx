"use client";

// ─────────────────────────────────────────────────────────────
// Results screen — accuracy ring hero, confetti for strong
// sessions, misses review list, actions and recent sessions.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import {
  Clock3,
  Flame,
  ImageDown,
  Loader2,
  Minus,
  Play,
  Settings2,
  Share2,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Volume2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ROW_META, SUBJECTS, type RowKey } from "@/lib/conjugator/types";
import { useToast } from "@/hooks/use-toast";
import { useSpeech } from "@/hooks/use-speech";
import { cn } from "@/lib/utils";

import { AccuracyRing } from "./accuracy-ring";
import { RecentSessions } from "./recent-sessions";
import { downloadShareCard } from "./share-card";
import {
  MICRO,
  formatDuration,
  kindLabel,
  tallyAccuracy,
  tallyAvgMs,
  tallyTotal,
  type MissRecord,
  type SessionSummary,
  type SessionsResponse,
  type TallyEntry,
} from "./types";

const CONFETTI_COLORS = ["#b03d2c", "#d9a441", "#5c8a4e", "#e8d5b5"];

interface ResultsScreenProps {
  summary: SessionSummary;
  sessions: SessionsResponse | null;
  sessionsLoading: boolean;
  /** short drill label for the mode line ("miss drill" / "verb drill") */
  drillShort?: string | null;
  /** personal pace baseline (ms/question) captured BEFORE this
   *  session was saved — null when history is too thin to compare */
  baselineAvgMs?: number | null;
  onPracticeAgain: () => void;
  onDrillMisses: (misses: MissRecord[]) => void;
  /** start a focused drill on a single verb (miss-row verb buttons) */
  onVerbDrill: (verb: string) => void;
  onChangeSettings: () => void;
  againLoading: boolean;
}

export function ResultsScreen({
  summary,
  sessions,
  sessionsLoading,
  drillShort,
  baselineAvgMs,
  onPracticeAgain,
  onDrillMisses,
  onVerbDrill,
  onChangeSettings,
  againLoading,
}: ResultsScreenProps) {
  const { toast } = useToast();
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [cardBusy, setCardBusy] = useState(false);
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
    drillShort ?? (summary.mode === "timed" ? "timed" : "infinite")
  } · ${formatDuration(summary.durationSec)}`;
  const drillVerbCount = new Set(summary.misses.map((m) => m.verb)).size;

  // ── pace insight: this session vs the personal baseline ──
  const pace = paceInsight(summary.avgMsPerQuestion, baselineAvgMs ?? null);

  // sorted per-tense rows — weakest first, only tenses actually answered
  const tallyRows = Object.entries(summary.tally ?? {})
    .filter(([, e]) => e.t > 0)
    .sort((a, b) => tallyAccuracy(a[1]) - tallyAccuracy(b[1]));
  const showBreakdown = tallyRows.length > 0 && tallyTotal(summary.tally) >= 4;

  // ── render + download the branded results card (PNG) ──
  const handleSaveImage = async () => {
    if (cardBusy) return;
    setCardBusy(true);
    const ok = await downloadShareCard({
      score: summary.score,
      total: summary.total,
      accuracy: summary.accuracy,
      bestStreak: summary.bestStreak,
      avgMsPerQuestion: summary.avgMsPerQuestion,
      modeLine,
      // up to 4 per-tense bars, weakest first — mirrors the on-screen
      // "tense by tense" section (tallyRows is already weakest-first)
      tenses: tallyRows.slice(0, 4).map(([tense, entry]) => ({
        label: ROW_META[tense as RowKey]?.labelEs ?? tense,
        pct: Math.round(tallyAccuracy(entry) * 100),
      })),
    });
    setCardBusy(false);
    if (ok) {
      toast({
        title: "Results card saved",
        description: "check your downloads — share it anywhere",
      });
    } else {
      toast({
        title: "Couldn't render the card",
        description: "your browser blocked the canvas download",
        variant: "destructive",
      });
    }
  };

  // ── share the session summary (Web Share → clipboard fallback) ──
  const handleShare = async () => {
    const pct = Math.round(summary.accuracy * 100);
    const text = [
      "Tabla de Verbos — sesión de práctica",
      `${summary.score}/${summary.total} correct · ${pct}% accuracy`,
      `racha máxima ${summary.bestStreak} · ${modeLine}`,
    ].join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Tabla de Verbos", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2200);
      toast({
        title: "Copied to clipboard",
        description: "paste your results anywhere to share them",
      });
    } catch {
      // user dismissed the share sheet or the clipboard was blocked —
      // quiet failure is fine (this button is a nicety)
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      {/* hero: ring + headline stats */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        aria-label="session results"
        className="relative rounded-2xl border bg-card bg-dotted p-6 shadow-sm sm:p-8"
      >
        {/* download the branded results card */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => void handleSaveImage()}
              disabled={cardBusy}
              aria-label="download your results as an image"
              title="download results card"
              className="absolute right-4 top-4 z-10 inline-flex size-10 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-xs backdrop-blur transition-colors outline-none hover:border-primary/40 hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 sm:right-6 sm:top-6"
            >
              {cardBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ImageDown className="size-4" aria-hidden="true" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">save results as image</TooltipContent>
        </Tooltip>
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
                {pace && (
                  <p
                    className={cn(
                      "mt-1.5 flex items-center gap-1 font-mono text-[10px] leading-none",
                      pace.tone === "good"
                        ? "text-success"
                        : pace.tone === "slow"
                          ? "text-warn"
                          : "text-muted-foreground"
                    )}
                    role="status"
                  >
                    {pace.tone === "good" ? (
                      <TrendingDown className="size-3 shrink-0" aria-hidden="true" />
                    ) : pace.tone === "slow" ? (
                      <TrendingUp className="size-3 shrink-0" aria-hidden="true" />
                    ) : (
                      <Minus className="size-3 shrink-0" aria-hidden="true" />
                    )}
                    {pace.label}
                  </p>
                )}
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

      {/* per-tense breakdown */}
      {showBreakdown && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
          aria-label="tense by tense breakdown"
        >
          <h3 className="mb-3 font-display text-2xl font-semibold">
            tense by tense
          </h3>
          <Card className="space-y-4 rounded-2xl p-5 shadow-sm sm:p-6">
            <div className="scrollbar-thin max-h-72 space-y-3.5 overflow-y-auto pr-1">
              {tallyRows.map(([tense, entry], i) => (
                <TallyBar
                  key={tense}
                  tense={tense}
                  entry={entry}
                  index={i}
                />
              ))}
            </div>
            <p className={cn(MICRO, "text-center")}>
              weakest first — tap a verb below to drill it
            </p>
          </Card>
        </motion.section>
      )}

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
                  onVerbDrill={onVerbDrill}
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
        <Button
          variant="outline"
          onClick={() => void handleShare()}
          aria-label="share these results"
          className="h-14 gap-2.5 rounded-xl px-6 text-base"
        >
          {shareState === "copied" ? (
            <Sparkles className="size-5 text-success" aria-hidden="true" />
          ) : (
            <Share2 className="size-5" aria-hidden="true" />
          )}
          {shareState === "copied" ? "copied" : "share"}
        </Button>
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

// ── Pace insight ──────────────────────────────────────────

/** compare this session's pace against the personal baseline →
 *  a short line + tone, or null when there's nothing to say */
function paceInsight(
  sessionAvgMs: number,
  baselineAvgMs: number | null
): { label: string; tone: "good" | "slow" | "even" } | null {
  if (
    !baselineAvgMs ||
    baselineAvgMs <= 0 ||
    sessionAvgMs <= 0 ||
    !Number.isFinite(sessionAvgMs)
  ) {
    return null;
  }
  const ratio = sessionAvgMs / baselineAvgMs;
  const vs = (baselineAvgMs / 1000).toFixed(1);
  if (ratio <= 0.9) {
    return {
      label: `${(1 / ratio).toFixed(1)}× faster than your ${vs}s avg`,
      tone: "good",
    };
  }
  if (ratio >= 1.15) {
    return {
      label: `${ratio.toFixed(1)}× slower than your ${vs}s avg`,
      tone: "slow",
    };
  }
  return { label: `right at your ${vs}s average`, tone: "even" };
}

// ── Miss row ─────────────────────────────────────────────────

const MISS_CHIP =
  "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground";

function MissRow({
  miss,
  onVerbDrill,
}: {
  miss: MissRecord;
  onVerbDrill: (verb: string) => void;
}) {
  const tenseLabel = ROW_META[miss.tense as RowKey]?.labelEs ?? miss.tense;
  const pronoun = miss.subject
    ? SUBJECTS.find((s) => s.key === miss.subject)?.pronoun
    : null;
  const { speak, supported } = useSpeech();
  // the Spanish side of the miss: the correct form for
  // conjugation / EN→ES, the prompt phrase for ES→EN
  const spanishText =
    miss.kind === "translate-es-en" ? miss.given : miss.expected;

  return (
    <div className="px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          onClick={() => onVerbDrill(miss.verb)}
          title={`drill ${miss.verb}`}
          aria-label={`drill the verb ${miss.verb}`}
          className="font-display text-lg font-semibold leading-none underline decoration-dotted decoration-1 underline-offset-4 transition-colors outline-none hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {miss.verb}
        </button>
        <span className="flex flex-wrap items-center gap-1.5">
          {pronoun && <span className={MISS_CHIP}>{pronoun}</span>}
          <span className={MISS_CHIP}>{tenseLabel}</span>
          <span className={MISS_CHIP}>{kindLabel(miss.kind)}</span>
        </span>
        {supported && spanishText && (
          <button
            type="button"
            onClick={() => speak(spanishText)}
            title={`hear ${spanishText}`}
            aria-label={`hear ${spanishText} in Spanish`}
            className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-ring/50"
          >
            <Volume2 className="size-3.5" aria-hidden="true" />
          </button>
        )}
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

// ── Per-tense accuracy bar ─────────────────────────────

function TallyBar({
  tense,
  entry,
  index,
}: {
  tense: string;
  entry: TallyEntry;
  index: number;
}) {
  const label = ROW_META[tense as RowKey]?.labelEs ?? tense;
  const acc = tallyAccuracy(entry);
  const pct = Math.round(acc * 100);
  const tone =
    acc >= 0.8
      ? "bg-success"
      : acc >= 0.5
        ? "bg-primary"
        : "bg-destructive";
  const textTone =
    acc >= 0.8
      ? "text-success"
      : acc >= 0.5
        ? "text-primary"
        : "text-destructive";

  const avgMs = tallyAvgMs(entry);

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <div className="w-32 shrink-0 sm:w-36">
        <p
          className="truncate font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground"
          title={label}
        >
          {label}
        </p>
        {avgMs !== null && (
          <p
            className="mt-0.5 flex items-center gap-1 font-mono text-[10px] leading-none tabular-nums text-muted-foreground/80"
            title="average time per question"
          >
            <Clock3 className="size-3 shrink-0" aria-hidden="true" />
            {(avgMs / 1000).toFixed(1)}s/q
          </p>
        )}
      </div>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} — ${entry.c} of ${entry.t} correct`}
      >
        <motion.div
          className={cn("h-full rounded-full", tone)}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, pct)}%` }}
          transition={{
            duration: 0.7,
            delay: 0.15 + index * 0.07,
            ease: "easeOut",
          }}
        />
      </div>
      <p className="w-20 shrink-0 text-right font-mono text-xs tabular-nums">
        <span className={textTone}>{pct}%</span>
        <span className="text-muted-foreground/70"> {entry.c}/{entry.t}</span>
      </p>
    </div>
  );
}
