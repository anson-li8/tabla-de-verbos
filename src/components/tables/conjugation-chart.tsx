"use client";

import { useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, BookOpen, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
}: {
  forms: string[] | undefined;
  spanish?: boolean;
}) {
  if (!forms || forms.length === 0) {
    return <p className="py-1.5 font-mono text-xs text-muted-foreground">—</p>;
  }
  const [primary, ...alternates] = forms;
  const altText = alternates.slice(0, 3).join(" · ");
  return (
    <div className="min-w-0 py-0.5">
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
  onAnswerChange: (key: RowKey, lang: CellLang, value: string) => void;
  onRequestCheck: () => void;
}

export function ConjugationChart({
  verb,
  subject,
  answers,
  verdicts,
  revealMode,
  revealData,
  onAnswerChange,
  onRequestCheck,
}: ConjugationChartProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  const subjectMeta = SUBJECTS.find((entry) => entry.key === subject);

  // Enter advances: español → english → next row; on the very last
  // input it triggers Check. Order follows the DOM (TENSE_ROWS order).
  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const sheet = sheetRef.current;
      if (!sheet) return;
      const inputs = Array.from(
        sheet.querySelectorAll<HTMLInputElement>("input[data-cell]")
      );
      const index = inputs.indexOf(event.currentTarget);
      const next = inputs[index + 1];
      if (next) {
        next.focus();
        next.select();
      } else {
        onRequestCheck();
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

        <div ref={sheetRef} className="rounded-lg bg-ruled p-3 sm:p-4">
          {/* column labels (desktop) */}
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
                      className="grid gap-2 py-3 md:grid-cols-[minmax(120px,1fr)_1fr_1fr] md:items-center md:gap-x-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">
                          {row.labelEs}
                        </p>
                        <p className="text-[11px] leading-tight text-muted-foreground">
                          {row.labelEn}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 md:contents">
                        {revealMode ? (
                          revealRow ? (
                            <>
                              <AnswerCell spanish forms={revealRow.spanish} />
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
