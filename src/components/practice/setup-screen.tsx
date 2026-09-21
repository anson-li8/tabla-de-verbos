"use client";

// ─────────────────────────────────────────────────────────────
// Practice setup screen — records strip + session builder form:
// question types, tenses, verb set, session mode, start.
// ─────────────────────────────────────────────────────────────

import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Infinity as InfinityIcon,
  Languages,
  Loader2,
  Play,
  Timer,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ROW_META, type RowKey } from "@/lib/conjugator/types";
import { cn } from "@/lib/utils";

import { ActivityHeatmap } from "./activity-heatmap";
import { FocusPanel } from "./focus-panel";
import { DailyStrip } from "./daily-strip";
import { RecordsStrip } from "./records-strip";
import { useDailyGoal } from "./use-daily-goal";
import {
  CLASSIC_SUBJECTS,
  CORE_TENSES,
  DURATION_OPTIONS,
  MICRO,
  PRACTICE_TENSES,
  VERB_COUNTS,
  type FocusStatsResponse,
  type QuestionKind,
  type QuizSettings,
  type SessionsResponse,
} from "./types";

// ── Local data ───────────────────────────────────────────────

const KIND_CARDS: {
  kind: QuestionKind;
  label: string;
  description: string;
  Icon: LucideIcon;
}[] = [
  {
    kind: "conjugation",
    label: "Conjugation",
    description: "given a verb, subject & tense, type the Spanish form",
    Icon: Languages,
  },
  {
    kind: "translate-es-en",
    label: "ES → EN",
    description: "translate the Spanish phrase to English",
    Icon: ArrowRight,
  },
  {
    kind: "translate-en-es",
    label: "EN → ES",
    description: "translate the English phrase to Spanish",
    Icon: ArrowLeft,
  },
];

const TENSE_PRESETS: { id: string; label: string; tenses: RowKey[] }[] = [
  { id: "core", label: "core", tenses: [...CORE_TENSES] },
  { id: "all", label: "all", tenses: [...PRACTICE_TENSES] },
  { id: "none", label: "none", tenses: [] },
];

const LEVELS: { value: 5 | 6 | "all"; label: string; count: number }[] = [
  { value: 5, label: "español 5", count: VERB_COUNTS.sp5 },
  { value: 6, label: "español 6", count: VERB_COUNTS.sp6 },
  { value: "all", label: "all", count: VERB_COUNTS.all },
];

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ── Component ────────────────────────────────────────────────

interface SetupScreenProps {
  settings: QuizSettings;
  onChange: (settings: QuizSettings) => void;
  onStart: () => void;
  starting: boolean;
  startError: boolean;
  sessions: SessionsResponse | null;
  sessionsLoading: boolean;
  /** focus analytics (trend / toughest verbs / recent misses) */
  focusStats: FocusStatsResponse | null;
  /** claim the streak freeze (seguro de racha) — resolves
   *  { ok, error? } (validated + stored locally) */
  onClaimFreeze: () => Promise<{ ok: boolean; error?: string }>;
  /** start a focused drill built from the recent miss bank */
  onDrillMisses: () => void;
  /** start a focused drill on a single verb */
  onVerbDrill: (verb: string) => void;
  /** start a focused drill on a single tense */
  onTenseDrill: (tense: string) => void;
}

export function SetupScreen({
  settings,
  onChange,
  onStart,
  starting,
  startError,
  sessions,
  sessionsLoading,
  focusStats,
  onClaimFreeze,
  onDrillMisses,
  onVerbDrill,
  onTenseDrill,
}: SetupScreenProps) {
  // user-configurable daily goal (localStorage) — falls back to
  // the server constant until the visitor picks a preset
  const { goal, userGoal, saveGoal } = useDailyGoal(
    focusStats?.daily.goal ?? 20
  );

  const toggleType = (kind: QuestionKind) => {
    const types = settings.types.includes(kind)
      ? settings.types.filter((t) => t !== kind)
      : [...settings.types, kind];
    onChange({ ...settings, types });
  };

  const toggleTense = (tense: RowKey) => {
    const tenses = settings.tenses.includes(tense)
      ? settings.tenses.filter((t) => t !== tense)
      : [...settings.tenses, tense];
    onChange({ ...settings, tenses });
  };

  // vosotros is mixed into the classic 5 — never swaps them out
  const vosotrosOn = settings.subjects?.includes("vosotros") ?? false;
  const toggleVosotros = () => {
    onChange({
      ...settings,
      subjects: vosotrosOn
        ? settings.subjects?.filter((s) => s !== "vosotros")
        : [...(settings.subjects ?? CLASSIC_SUBJECTS), "vosotros"],
    });
  };

  const typesOk = settings.types.length > 0;
  const tensesOk = settings.tenses.length > 0;
  const canStart = typesOk && tensesOk;

  const startButton = (
    <Button
      size="lg"
      onClick={onStart}
      disabled={!canStart || starting}
      className="h-14 w-full gap-2.5 rounded-xl px-8 text-base font-semibold shadow-[0_10px_24px_-10px] shadow-primary/45 transition-shadow hover:shadow-[0_14px_30px_-12px] hover:shadow-primary/55"
    >
      {starting ? (
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      ) : (
        <Play className="size-5" aria-hidden="true" />
      )}
      {starting ? "cargando…" : "empezar"}
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* daily goal + racha (needs at least one session on record) */}
      {focusStats && focusStats.totals.sessions > 0 && (
        <DailyStrip
          daily={focusStats.daily}
          goal={goal}
          userGoal={userGoal}
          onGoalChange={saveGoal}
          onClaimFreeze={onClaimFreeze}
        />
      )}

      {/* personal records */}
      <section aria-label="your records">
        <h2 className={cn(MICRO, "mb-3")}>your records</h2>
        <RecordsStrip
          data={sessions}
          loading={sessionsLoading}
          daily={focusStats?.daily ?? null}
        />
      </section>

      {/* activity calendar (self-hides until the first session) */}
      {focusStats && focusStats.totals.sessions > 0 && (
        <ActivityHeatmap days={focusStats.daily.days} goal={goal} />
      )}

      {/* focus analytics + miss-drill quick start (self-hiding
          until the first session exists) */}
      <FocusPanel
        stats={focusStats}
        loading={sessionsLoading}
        drillLoading={starting}
        onDrillMisses={onDrillMisses}
        onVerbDrill={onVerbDrill}
        onTenseDrill={onTenseDrill}
      />

      {/* session builder */}
      <motion.div variants={listVariants} initial="hidden" animate="show">
        <Card className="gap-0 rounded-2xl bg-dotted py-0 shadow-sm">
          <CardContent className="space-y-8 p-5 sm:p-8">
            {/* question types */}
            <motion.section variants={sectionVariants} aria-label="question types">
              <h3 className={cn(MICRO, "mb-3")}>
                <span
                  aria-hidden="true"
                  className="mr-2 inline-block h-px w-4 translate-y-[-1px] bg-primary/70"
                />
                question types
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {KIND_CARDS.map(({ kind, label, description, Icon }) => (
                  <SelectCard
                    key={kind}
                    selected={settings.types.includes(kind)}
                    onClick={() => toggleType(kind)}
                    Icon={Icon}
                    label={label}
                    description={description}
                    multi
                  />
                ))}
              </div>
            </motion.section>

            {/* tenses */}
            <motion.section variants={sectionVariants} aria-label="tenses">
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <h3 className={MICRO}>
                  <span
                    aria-hidden="true"
                    className="mr-2 inline-block h-px w-4 translate-y-[-1px] bg-primary/70"
                  />
                  tenses
                </h3>
                <div className="flex items-center gap-1.5">
                  {TENSE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        onChange({ ...settings, tenses: [...preset.tenses] })
                      }
                      className="h-11 rounded-full border border-border bg-card px-4 font-mono text-[11px] lowercase tracking-wide text-muted-foreground shadow-xs outline-none transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <span className={cn(MICRO, "ml-auto tabular-nums")}>
                  {settings.tenses.length} of {PRACTICE_TENSES.length} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRACTICE_TENSES.map((tense) => {
                  const on = settings.tenses.includes(tense);
                  return (
                    <button
                      key={tense}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleTense(tense)}
                      className={cn(
                        "inline-flex h-11 items-center rounded-full border px-4 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        on
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      {ROW_META[tense].labelEs}
                    </button>
                  );
                })}
              </div>
            </motion.section>

            {/* verbs */}
            <motion.section variants={sectionVariants} aria-label="verb set">
              <h3 className={cn(MICRO, "mb-3")}>
                <span
                  aria-hidden="true"
                  className="mr-2 inline-block h-px w-4 translate-y-[-1px] bg-primary/70"
                />
                verbs
              </h3>
              <div
                role="radiogroup"
                aria-label="verb set"
                className="grid grid-cols-3 gap-1 rounded-xl border bg-muted/40 p-1"
              >
                {LEVELS.map((level) => {
                  const active = settings.level === level.value;
                  return (
                    <button
                      key={String(level.value)}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() =>
                        onChange({ ...settings, level: level.value })
                      }
                      className="relative flex h-14 flex-col items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 hover:bg-foreground/[0.05]"
                    >
                      {active && (
                        <motion.span
                          layoutId="tdv-practice-level-pill"
                          className="absolute inset-0 rounded-lg border border-border/60 bg-card shadow-sm"
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 32,
                          }}
                        />
                      )}
                      <span
                        className={cn(
                          "relative z-10 font-mono text-[11px] uppercase tracking-[0.08em] sm:text-xs",
                          active
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {level.label}
                      </span>
                      <span
                        className={cn(
                          "relative z-10 mt-0.5 font-mono text-[10px] tabular-nums",
                          active ? "text-primary" : "text-muted-foreground/70"
                        )}
                      >
                        {level.count} verbs
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.section>

            {/* subjects — vosotros opt-in */}
            <motion.section variants={sectionVariants} aria-label="subjects">
              <h3 className={cn(MICRO, "mb-3")}>
                <span
                  aria-hidden="true"
                  className="mr-2 inline-block h-px w-4 translate-y-[-1px] bg-primary/70"
                />
                subjects
              </h3>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed bg-muted/30 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">
                    include vosotros
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Spain&apos;s informal &ldquo;you all&rdquo; — habláis, coméis,
                    vivís.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={vosotrosOn}
                  onClick={toggleVosotros}
                  className={cn(
                    "relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    vosotrosOn
                      ? "border-primary bg-primary"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-card font-mono text-[9px] font-semibold uppercase tracking-wide shadow-sm transition-transform duration-200",
                      vosotrosOn
                        ? "translate-x-7 text-primary"
                        : "translate-x-0 text-muted-foreground"
                    )}
                  >
                    es
                  </span>
                  <span
                    className={cn(
                      "pointer-events-none absolute font-mono text-[9px] font-medium uppercase tracking-[0.12em] transition-opacity",
                      vosotrosOn
                        ? "left-3 text-primary-foreground opacity-100"
                        : "right-3 text-muted-foreground/70 opacity-100"
                    )}
                  >
                    {vosotrosOn ? "on" : "off"}
                  </span>
                </button>
              </div>
            </motion.section>

            {/* session mode */}
            <motion.section variants={sectionVariants} aria-label="session mode">
              <h3 className={cn(MICRO, "mb-3")}>
                <span
                  aria-hidden="true"
                  className="mr-2 inline-block h-px w-4 translate-y-[-1px] bg-primary/70"
                />
                session
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectCard
                  selected={settings.mode === "timed"}
                  onClick={() => onChange({ ...settings, mode: "timed" })}
                  Icon={Timer}
                  label="Timed challenge"
                  description="answer as many as you can before the clock runs out"
                />
                <SelectCard
                  selected={settings.mode === "infinite"}
                  onClick={() => onChange({ ...settings, mode: "infinite" })}
                  Icon={InfinityIcon}
                  label="Infinite"
                  description="unlimited practice until you stop"
                />
              </div>
              <AnimatePresence initial={false}>
                {settings.mode === "timed" && (
                  <motion.div
                    key="duration-chips"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div
                      role="group"
                      aria-label="duration"
                      className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed bg-muted/30 p-3 pl-4"
                    >
                      <span className={cn(MICRO, "mr-1")}>duration</span>
                      {DURATION_OPTIONS.map((sec) => {
                        const on = settings.durationSec === sec;
                        return (
                          <button
                            key={sec}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              onChange({ ...settings, durationSec: sec })
                            }
                            className={cn(
                              "inline-flex h-11 items-center rounded-full border px-4 font-mono text-[11px] tracking-wide transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                              on
                                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            )}
                          >
                            {sec / 60} min
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* start */}
            <motion.section variants={sectionVariants} className="space-y-3">
              {canStart ? (
                startButton
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block w-full">{startButton}</span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {!typesOk
                      ? "select at least one question type"
                      : "select at least one tense"}
                  </TooltipContent>
                </Tooltip>
              )}
              {startError && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <p className="text-sm text-destructive">
                    connection issue — couldn&apos;t load the first question
                  </p>
                  <Button
                    variant="outline"
                    className="h-10"
                    onClick={onStart}
                    disabled={starting}
                  >
                    retry
                  </Button>
                </div>
              )}
            </motion.section>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ── Selectable card (multi toggle / single radio) ────────────

interface SelectCardProps {
  selected: boolean;
  onClick: () => void;
  Icon: LucideIcon;
  label: string;
  description: string;
  multi?: boolean;
}

function SelectCard({
  selected,
  onClick,
  Icon,
  label,
  description,
  multi = false,
}: SelectCardProps) {
  return (
    <motion.button
      type="button"
      role={multi ? "switch" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex w-full flex-col gap-2.5 rounded-xl border p-4 text-left outline-none transition-all duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/50",
        selected
          ? "border-primary bg-primary/[0.05] shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <Icon
          className={cn(
            "size-5 shrink-0",
            selected ? "text-primary" : "text-muted-foreground"
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/40 text-transparent"
          )}
          aria-hidden="true"
        >
          <Check className="size-3" />
        </span>
      </div>
      <div className="space-y-1">
        <span className="block text-sm font-semibold leading-tight">
          {label}
        </span>
        <span className="block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </div>
    </motion.button>
  );
}
