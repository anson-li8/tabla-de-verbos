"use client";

import { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, BadgeCheck, BookOpen, Check, Volume2, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpeech } from "@/hooks/use-speech";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SUBJECTS,
  TENSE_ROWS,
  verbGlosses,
  verbLevel,
  type RowGroup,
  type RowKey,
  type RowMeta,
  type SubjectKey,
} from "@/lib/conjugator/types";
import { cn } from "@/lib/utils";

import type {
  AnswersMap,
  CellLang,
  RevealData,
  VerdictsMap,
} from "./types";
import { MASTERY_THRESHOLD } from "./use-cell-mastery";

// ── group metadata ───────────────────────────────────────────

const GROUP_META: Record<RowGroup, { es: string; en: string }> = {
  base: { es: "los básicos", en: "the basics" },
  indicative: { es: "indicativo", en: "the indicative" },
  perfect: { es: "los perfectos", en: "the perfect tenses" },
  subjunctive: { es: "el subjuntivo", en: "the subjunctive" },
  imperative: { es: "el imperativo", en: "the imperative" },
};

interface GroupedRows {
  group: RowGroup;
  rows: RowMeta[];
}

/** static grouping of TENSE_ROWS (base → indicative → perfect → subjunctive → imperative) */
const GROUPS: GroupedRows[] = (() => {
  const out: GroupedRows[] = [];
  for (const row of TENSE_ROWS) {
    const last = out[out.length - 1];
    if (last && last.group === row.group) last.rows.push(row);
    else out.push({ group: row.group, rows: [row] });
  }
  return out;
})();

// ── verdict helpers ──────────────────────────────────────────

interface AnyVerdict {
  correct: boolean;
  expected: string;
  accentOnly?: boolean;
}

type VerdictState = "idle" | "correct" | "accent" | "wrong";

function verdictState(verdict?: AnyVerdict): VerdictState {
  if (!verdict) return "idle";
  if (verdict.accentOnly) return "accent";
  return verdict.correct ? "correct" : "wrong";
}

// ── per-group mastery meter (chart header) ──────────────────

/**
 * Five slim segmented bars — one per row group — showing how much
 * of this verb's chart is mastered for the current subject.
 * Complete groups go green; partial fills stay brick-red.
 */
function GroupMasteryBars({ masteredRows }: { masteredRows: Set<RowKey> }) {
  const summary = GROUPS.map((g) => {
    const total = g.rows.length;
    const mastered = g.rows.filter((r) => masteredRows.has(r.key)).length;
    return { group: g.group, label: GROUP_META[g.group].es, mastered, total };
  });
  const ariaLabel = `mastery by group — ${summary
    .map((s) => `${s.label} ${s.mastered}/${s.total}`)
    .join(", ")}`;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5" role="img" aria-label={ariaLabel}>
      <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
        dominio
      </span>
      {summary.map((s) => {
        const pct = s.total > 0 ? (s.mastered / s.total) * 100 : 0;
        const complete = s.mastered === s.total && s.total > 0;
        return (
          <Tooltip key={s.group}>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                className="relative block h-1.5 w-9 cursor-default overflow-hidden rounded-full bg-muted-foreground/15 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out",
                    complete ? "bg-success" : "bg-primary"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-[10px]">
              {s.label} · {s.mastered}/{s.total} rows mastered
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ── cells ────────────────────────────────────────────────────

interface InputCellProps {
  row: RowMeta;
  lang: CellLang;
  value: string;
  verdict?: AnyVerdict;
  onChange: (key: RowKey, lang: CellLang, value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

function InputCell({
  row,
  lang,
  value,
  verdict,
  onChange,
  onKeyDown,
}: InputCellProps) {
  const state = verdictState(verdict);
  const isSpanish = lang === "es";

  return (
    <div className="min-w-0">
      <div className="relative">
        <Input
          data-cell={`${row.key}:${lang}`}
          value={value}
          onChange={(event) => onChange(row.key, lang, event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={isSpanish ? "español" : "english"}
          aria-label={`${row.labelEs} (${row.labelEn}) — ${
            isSpanish ? "Spanish" : "English"
          }`}
          aria-invalid={state === "wrong" || undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={cn(
            "h-11 rounded-lg",
            // editorial empty state — italic serif, warm & quiet
            "placeholder:font-display placeholder:italic placeholder:text-muted-foreground/60",
            isSpanish ? "text-base md:text-lg" : "text-sm md:text-base",
            state === "correct" &&
              "border-success/70 bg-success/10 pr-8 focus-visible:border-success focus-visible:ring-success/30",
            state === "accent" &&
              "border-warn/70 bg-warn/10 pr-8 focus-visible:border-warn focus-visible:ring-warn/30",
            state === "wrong" &&
              "border-destructive/70 bg-destructive/10 focus-visible:border-destructive focus-visible:ring-destructive/30"
          )}
        />
        {state === "correct" && (
          <Check
            className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-success"
            aria-hidden="true"
          />
        )}
        {state === "accent" && (
          <AlertTriangle
            className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-warn"
            aria-hidden="true"
          />
        )}
      </div>
      {state === "wrong" && verdict?.expected && (
        <p
          className="mt-1 truncate font-mono text-[11px] leading-snug text-destructive"
          title={verdict.expected}
        >
          {verdict.expected}
        </p>
      )}
      {state === "accent" && verdict?.expected && (
        <p className="mt-1 truncate font-mono text-[11px] leading-snug text-warn">
          watch the accents — {verdict.expected}
        </p>
      )}
    </div>
  );
}

function AnswerCell({
  forms,
  spanish,
  onSpeak,
}: {
  forms: string[] | undefined;
  spanish?: boolean;
  /** when provided, the primary form can be heard aloud */
  onSpeak?: (text: string) => void;
}) {
  if (!forms || forms.length === 0) {
    return <p className="py-1.5 font-mono text-xs text-muted-foreground">—</p>;
  }
  const [primary, ...alternates] = forms;
  const altText = alternates.slice(0, 3).join(" · ");
  const primaryLine = onSpeak ? (
    <button
      type="button"
      onClick={() => onSpeak(primary)}
      title="click to hear it"
      aria-label={`hear ${primary} in Spanish`}
      className="min-w-0 max-w-full cursor-pointer truncate rounded-sm bg-transparent text-left font-display text-lg font-medium leading-snug underline decoration-primary/35 decoration-1 underline-offset-4 transition-colors hover:decoration-primary focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-primary/30"
    >
      {primary}
    </button>
  ) : (
    <p
      className={cn(
        "truncate",
        spanish
          ? "font-display text-lg font-medium leading-snug"
          : "font-display text-base leading-snug"
      )}
      title={primary}
    >
      {primary}
    </p>
  );
  return (
    <div className="min-w-0 py-0.5">
      {primaryLine}
      {altText && (
        <p
          className="truncate font-mono text-[11px] leading-snug text-muted-foreground"
          title={altText}
        >
          also: {altText}
        </p>
      )}
    </div>
  );
}

function SkeletonCell() {
  return (
    <div className="space-y-2 py-1.5">
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

// ── the chart ────────────────────────────────────────────────

interface ConjugationChartProps {
  verb: string;
  subject: SubjectKey;
  answers: AnswersMap;
  verdicts: VerdictsMap;
  revealMode: boolean;
  /** reveal answers for the *current* verb+subject (null while loading/stale) */
  revealData: RevealData | null;
  /** rows with both cells mastered (≥2 exact-correct each) */
  masteredRows: Set<RowKey>;
  /** how many of the 23 rows are mastered for this verb+subject */
  masteredCount: number;
  onAnswerChange: (key: RowKey, lang: CellLang, value: string) => void;
  onRequestCheck: () => void;
  /** hand this verb to Practice mode for a focused quiz */
  onQuizVerb?: (verb: string) => void;
}

export function ConjugationChart({
  verb,
  subject,
  answers,
  verdicts,
  revealMode,
  revealData,
  masteredRows,
  masteredCount,
  onAnswerChange,
  onRequestCheck,
  onQuizVerb,
}: ConjugationChartProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // browser-native Spanish pronunciation (Web Speech API)
  const { speak, speaking, supported } = useSpeech();

  const subjectMeta = SUBJECTS.find((entry) => entry.key === subject);

  // Keyboard power tools:
  //  · Enter advances: español → english → next row; on the very
  //    last input it triggers Check
  //  · ↑/↓ jump between the same language column across rows
  //  · ←/→ move between cells only at caret boundaries (so normal
  //    text editing still works)
  // Order follows the DOM (TENSE_ROWS order).
  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const { key } = event;
      if (key !== "Enter" && key !== "ArrowUp" && key !== "ArrowDown" && key !== "ArrowLeft" && key !== "ArrowRight") {
        return;
      }
      const input = event.currentTarget;
      const sheet = sheetRef.current;
      if (!sheet) return;

      const inputs = Array.from(
        sheet.querySelectorAll<HTMLInputElement>("input[data-cell]")
      );
      const index = inputs.indexOf(input);
      if (index === -1) return;

      let next: HTMLInputElement | undefined;
      if (key === "Enter") {
        event.preventDefault();
        next = inputs[index + 1];
        if (!next) {
          onRequestCheck();
          return;
        }
      } else if (key === "ArrowUp" || key === "ArrowDown") {
        // vertical arrows do nothing inside a text input — safe to own
        event.preventDefault();
        next = inputs[index + (key === "ArrowDown" ? 2 : -2)];
      } else if (key === "ArrowLeft" && (input.selectionStart ?? 0) === 0 && (input.selectionEnd ?? 0) === 0) {
        event.preventDefault();
        next = inputs[index - 1];
      } else if (
        key === "ArrowRight" &&
        (input.selectionStart ?? 0) === input.value.length &&
        (input.selectionEnd ?? 0) === input.value.length
      ) {
        event.preventDefault();
        next = inputs[index + 1];
      } else {
        return; // caret movement — let the browser handle it
      }

      if (next) {
        next.focus();
        next.select();
      }
    },
    [onRequestCheck]
  );

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-4 pb-4 pt-5 sm:px-6">
        <CardTitle className="flex flex-wrap items-baseline gap-x-3">
          <span className="font-display text-2xl font-semibold italic tracking-tight">
            {verb}
          </span>
        </CardTitle>
        <CardDescription className="font-mono text-[11px] tracking-wide">
          {verbGlosses(verb)}
        </CardDescription>
        <GroupMasteryBars masteredRows={masteredRows} />
        <CardAction className="self-center">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="secondary"
              className="font-mono text-[10px] uppercase tracking-[0.12em]"
            >
              {subjectMeta?.es ?? subject}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              sp {verbLevel(verb)}
            </Badge>
            {masteredCount > 0 && (
              <Badge
                variant="outline"
                className="gap-1 border-success/40 bg-success/10 font-mono text-[10px] tabular-nums text-success"
                title={`${masteredCount} of ${TENSE_ROWS.length} rows answered correctly ${MASTERY_THRESHOLD}+ times in both languages`}
              >
                <BadgeCheck className="size-3" aria-hidden="true" />
                {masteredCount}/{TENSE_ROWS.length} mastered
              </Badge>
            )}
            {supported && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => speak(verb)}
                    aria-label={`hear ${verb} in Spanish`}
                    className={cn(
                      "h-7 gap-1.5 rounded-lg border-primary/30 px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:border-primary/50 hover:bg-primary/5",
                      speaking && "animate-pulse border-primary/60"
                    )}
                  >
                    <Volume2 className="size-3" aria-hidden="true" />
                    oír
                  </Button>
                </TooltipTrigger>
                <TooltipContent>hear {verb} pronounced</TooltipContent>
              </Tooltip>
            )}
            {onQuizVerb && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onQuizVerb(verb)}
                    aria-label={`quiz me on ${verb}`}
                    className="h-7 gap-1.5 rounded-lg border-primary/30 px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                  >
                    <Zap className="size-3" aria-hidden="true" />
                    quiz me
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  practice {verb} in a focused infinite drill
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardAction>
      </CardHeader>

      <div className="p-4 sm:p-6">
        {revealMode && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-accent-foreground"
          >
            <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] sm:text-[11px]">
              reference mode — answers shown
            </p>
          </div>
        )}

        <div ref={sheetRef} className="rounded-xl border border-border/50 bg-accent/20 p-3 sm:p-4">
          {/* column labels — desktop (3-col) + mobile (2-col, matches the
              stacked label-above / two-cells-below row layout) */}
          <div
            className="mb-1 hidden grid-cols-[minmax(120px,1fr)_1fr_1fr] gap-x-4 md:grid"
            aria-hidden="true"
          >
            <span className="pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              form
            </span>
            <span className="pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              español
            </span>
            <span className="pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              english
            </span>
          </div>
          <div
            className="mb-1 grid grid-cols-2 gap-2 px-1.5 md:hidden"
            aria-hidden="true"
          >
            <span className="pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              español
            </span>
            <span className="pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              english
            </span>
          </div>

          {GROUPS.map((group, groupIndex) => (
            <section
              key={group.group}
              aria-label={GROUP_META[group.group].es}
              className={groupIndex > 0 ? "mt-4" : undefined}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.06 * groupIndex }}
                className="sticky top-16 z-10 -mx-3 border-b border-border/70 bg-card/90 px-3 py-2 backdrop-blur-sm sm:-mx-4 sm:px-4"
              >
                <h3 className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {GROUP_META[group.group].es}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {GROUP_META[group.group].en}
                  </span>
                  <span
                    className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground/60"
                    aria-hidden="true"
                  >
                    {group.rows.length} form{group.rows.length === 1 ? "" : "s"}
                  </span>
                </h3>
              </motion.div>

              <div>
                {group.rows.map((row) => {
                  const cellAnswers = answers[row.key];
                  const cellVerdicts = verdicts[row.key];
                  const revealRow = revealMode
                    ? revealData?.[row.key]
                    : undefined;
                  return (
                    <div
                      key={row.key}
                      className="group grid gap-2 border-b border-border/45 px-1.5 py-3 transition-colors duration-150 last:border-b-0 hover:bg-foreground/[0.035] md:grid-cols-[minmax(120px,1fr)_1fr_1fr] md:items-center md:gap-x-4 md:px-2"
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
                          {row.labelEs}
                          {masteredRows.has(row.key) && (
                            <BadgeCheck
                              className="size-3.5 shrink-0 text-success"
                              aria-label="row mastered"
                            />
                          )}
                        </p>
                        <p className="text-[11px] italic leading-tight text-muted-foreground/80">
                          {row.labelEn}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 md:contents">
                        {revealMode ? (
                          revealRow ? (
                            <>
                              <AnswerCell
                                spanish
                                forms={revealRow.spanish}
                                onSpeak={supported ? speak : undefined}
                              />
                              <AnswerCell forms={revealRow.english} />
                            </>
                          ) : (
                            <>
                              <SkeletonCell />
                              <SkeletonCell />
                            </>
                          )
                        ) : (
                          <>
                            <InputCell
                              row={row}
                              lang="es"
                              value={cellAnswers?.es ?? ""}
                              verdict={cellVerdicts?.es}
                              onChange={onAnswerChange}
                              onKeyDown={handleInputKeyDown}
                            />
                            <InputCell
                              row={row}
                              lang="en"
                              value={cellAnswers?.en ?? ""}
                              verdict={cellVerdicts?.en}
                              onChange={onAnswerChange}
                              onKeyDown={handleInputKeyDown}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Card>
  );
}
