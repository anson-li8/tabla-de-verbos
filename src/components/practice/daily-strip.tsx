"use client";

// ─────────────────────────────────────────────────────────────
// DailyStrip — the setup screen's engagement bar: the racha
// (consecutive practiced days) on the left, today's progress
// toward the daily question goal on the right. The goal is
// user-configurable via the "meta" popover (persisted by the
// caller through useDailyGoal). Fed by the `daily` block of
// GET /api/sessions/stats.
// ─────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import { Flame, PencilLine } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";
import { DAILY_GOAL_OPTIONS, type DailyStats } from "./types";

interface DailyStripProps {
  daily: DailyStats;
  /** effective goal (user pick, else the server constant) */
  goal: number;
  /** the user's explicit pick, if any — highlights the preset */
  userGoal: number | null;
  onGoalChange: (goal: number) => void;
}

export function DailyStrip({
  daily,
  goal,
  userGoal,
  onGoalChange,
}: DailyStripProps) {
  const { todayQuestions, streakDays, activeToday } = daily;
  const goalMet = todayQuestions >= goal;
  const pct = Math.min(100, Math.round((todayQuestions / goal) * 100));
  const streakAlive = activeToday || streakDays > 0;
  const dateLabel = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <motion.aside
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      aria-label="daily practice goal"
      className={cn(
        "relative overflow-hidden rounded-xl border shadow-sm",
        goalMet
          ? "border-success/30 bg-gradient-to-r from-success/[0.10] via-accent/30 to-transparent"
          : "border-primary/15 bg-gradient-to-r from-primary/[0.08] via-accent/30 to-transparent"
      )}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 px-4 py-4 sm:px-5">
        {/* racha */}
        <div className="flex items-center gap-3.5">
          <motion.span
            initial={{ scale: 0.6, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full border",
              streakAlive
                ? "border-primary/25 bg-primary/10 text-primary"
                : "border-border bg-secondary/60 text-muted-foreground/70"
            )}
          >
            <Flame className="size-5" aria-hidden="true" />
          </motion.span>
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              la racha · {dateLabel}
            </p>
            <p className="mt-0.5 leading-tight">
              {streakAlive ? (
                <span className="font-display text-xl font-semibold italic">
                  {streakDays}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    día{streakDays === 1 ? "" : "s"} seguidos
                  </span>
                </span>
              ) : (
                <span className="font-display text-sm italic text-muted-foreground">
                  sin racha — empieza hoy
                </span>
              )}
            </p>
          </div>
        </div>

        {/* today's goal */}
        <div className="min-w-[220px] flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              hoy · meta {goal}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="change the daily goal"
                    title="change the daily goal"
                    className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground/70 outline-none transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <PencilLine className="size-3" aria-hidden="true" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    tu meta diaria
                  </p>
                  <div
                    role="radiogroup"
                    aria-label="daily goal"
                    className="mt-2 flex gap-1.5"
                  >
                    {DAILY_GOAL_OPTIONS.map((preset) => {
                      const active =
                        (userGoal ?? daily.goal) === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => onGoalChange(preset)}
                          className={cn(
                            "inline-flex h-9 items-center rounded-full border px-3.5 font-mono text-xs tabular-nums transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            active
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          )}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                    preguntas por día · se guarda en este navegador
                  </p>
                </PopoverContent>
              </Popover>
            </p>
            <p className="font-mono text-xs tabular-nums">
              {goalMet ? (
                <span className="font-semibold text-success">
                  ¡meta cumplida!
                </span>
              ) : (
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {todayQuestions}
                  </span>
                  <span className="text-muted-foreground/70"> / {goal}</span>
                </span>
              )}
            </p>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`daily goal — ${todayQuestions} of ${goal} questions`}
          >
            <motion.div
              className={cn(
                "h-full rounded-full",
                goalMet ? "bg-success" : "bg-primary"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, pct)}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            />
          </div>
          {!activeToday && streakDays > 0 && (
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-warn">
              practice today to keep the racha alive
            </p>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
