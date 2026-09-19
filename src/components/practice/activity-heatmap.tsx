"use client";

// ─────────────────────────────────────────────────────────────
// ActivityHeatmap — a GitHub-style practice calendar fed by the
// sparse `days` array from fetchFocusStats (session-store). 24 Monday-
// aligned week columns × 7 weekday rows; intensity is relative to
// the (user-configurable) daily goal. Hover a cell for the day's
// question count.
//
// Geometry: cell size + gap are CSS variables (--cell / --gap) so
// the month-label row, weekday labels and the cell grid share the
// exact same column math and stay pixel-aligned at every size.
// ─────────────────────────────────────────────────────────────

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import { MICRO, type DayCount } from "./types";

// ── Grid geometry ────────────────────────────────────────────

const WEEKS = 24;

/** Monday-first weekday index: Mon=0 … Sun=6 */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** local-calendar day key "YYYY-MM-DD" — must match the server's dayKey */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// ── Intensity levels ─────────────────────────────────────────

/** cell tone by question count, relative to the daily goal */
function levelFor(total: number, goal: number): 0 | 1 | 2 | 3 | 4 {
  if (total <= 0) return 0;
  if (total >= goal * 2) return 4;
  if (total >= goal) return 3;
  if (total >= goal * 0.5) return 2;
  return 1;
}

const LEVEL_BG: Record<number, string> = {
  0: "bg-muted/70",
  1: "bg-primary/25",
  2: "bg-primary/45",
  3: "bg-primary/70",
  4: "bg-primary",
};

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

// ── Component ────────────────────────────────────────────────

interface ActivityHeatmapProps {
  /** sparse practiced-day counts (oldest → newest) */
  days: DayCount[] | undefined;
  /** effective daily goal (questions) — drives the intensity scale */
  goal: number;
}

export function ActivityHeatmap({ days, goal }: ActivityHeatmapProps) {
  const model = useMemo(() => buildGrid(days ?? [], goal), [days, goal]);

  const { cells, monthMarks, totalQuestions, practicedDays, bestDay } = model;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      aria-label="practice calendar"
      className="overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-2.5 sm:px-5">
        <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          el calendario
        </p>
        <p className={cn(MICRO, "tabular-nums")}>
          {totalQuestions} pregunta{totalQuestions === 1 ? "" : "s"} ·{" "}
          {practicedDays} día{practicedDays === 1 ? "" : "s"} · {WEEKS}{" "}
          semanas
        </p>
      </div>

      {/* geometry owner: --cell / --gap keep every sub-grid aligned */}
      <div className="scrollbar-thin overflow-x-auto px-4 py-4 sm:px-5 [--cell:10px] [--gap:3px] sm:[--cell:12px] sm:[--gap:4px]">
        <div className="flex w-max gap-1">
          {/* weekday labels — same row pitch as the cell grid */}
          <div
            className="grid shrink-0 pt-[22px]"
            style={{
              gridTemplateRows: `repeat(7, var(--cell))`,
              gap: "var(--gap)",
            }}
            aria-hidden="true"
          >
            {WEEKDAY_LABELS.map((label, i) => (
              <span
                key={label + i}
                className="flex items-center font-mono text-[9px] leading-none text-muted-foreground"
                style={{ height: "var(--cell)" }}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="min-w-0">
            {/* month marks — same column pitch as the cell grid */}
            <div
              className="mb-1 grid"
              style={{
                gridTemplateColumns: `repeat(${WEEKS}, var(--cell))`,
                gap: "var(--gap)",
              }}
              aria-hidden="true"
            >
              {Array.from({ length: WEEKS }, (_, col) => {
                const mark = monthMarks.find((m) => m.col === col);
                return (
                  <span
                    key={col}
                    className="h-[18px] overflow-visible whitespace-nowrap font-mono text-[9px] leading-[18px] text-muted-foreground"
                    style={{ width: "var(--cell)" }}
                  >
                    {mark ? mark.label : ""}
                  </span>
                );
              })}
            </div>

            {/* the cells */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${WEEKS}, var(--cell))`,
                gridTemplateRows: `repeat(7, var(--cell))`,
                gridAutoFlow: "column",
                gap: "var(--gap)",
              }}
              role="img"
              aria-label={`practice over the last ${WEEKS} weeks — ${totalQuestions} questions across ${practicedDays} practiced days, best day ${bestDay}`}
            >
              {cells.map((cell) => (
                <HeatCell key={cell.key} cell={cell} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* legend + best day */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t px-4 py-2.5 sm:px-5">
        <p className={cn(MICRO, "flex items-center gap-1.5")}>
          menos
          {([0, 1, 2, 3, 4] as const).map((lvl) => (
            <span
              key={lvl}
              className={cn("size-2.5 rounded-[3px]", LEVEL_BG[lvl])}
              aria-hidden="true"
            />
          ))}
          más
        </p>
        {bestDay > 0 && (
          <p className={cn(MICRO, "tabular-nums")}>
            mejor día · {bestDay} preguntas
          </p>
        )}
      </div>
    </motion.section>
  );
}

// ── Grid model ───────────────────────────────────────────────

interface HeatCellModel {
  key: string;
  /** "YYYY-MM-DD" — null for hidden future cells */
  date: string | null;
  total: number;
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
  isFuture: boolean;
  /** human label "sep 14" */
  label: string;
  /** stagger delay for the pop-in */
  delay: number;
}

interface MonthMark {
  col: number;
  label: string;
}

function buildGrid(days: DayCount[], goal: number) {
  const totals = new Map<string, number>();
  for (const d of days) totals.set(d.date, d.total);

  const today = new Date();
  const todayK = dayKey(today);
  // first rendered Monday: 24 weeks back from this week's Monday
  const thisMonday = new Date(today);
  thisMonday.setDate(thisMonday.getDate() - mondayIndex(today));
  const start = new Date(thisMonday);
  start.setDate(start.getDate() - (WEEKS - 1) * 7);

  const cells: HeatCellModel[] = [];
  const monthMarks: MonthMark[] = [];
  let totalQuestions = 0;
  let practicedDays = 0;
  let bestDay = 0;
  let prevMonth = -1;

  for (let col = 0; col < WEEKS; col++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(start);
      d.setDate(start.getDate() + col * 7 + row);
      const k = dayKey(d);
      const isFuture = d.getTime() > today.getTime() && k !== todayK;
      const isToday = k === todayK;
      const total = totals.get(k) ?? 0;

      if (total > 0) {
        totalQuestions += total;
        practicedDays++;
        bestDay = Math.max(bestDay, total);
      }
      // month label whenever a column opens a new month
      if (row === 0) {
        const m = d.getMonth();
        if (m !== prevMonth) {
          monthMarks.push({
            col,
            label: d
              .toLocaleDateString("es", { month: "short" })
              .replace(".", ""),
          });
          prevMonth = m;
        }
      }

      cells.push({
        key: `${k}-${col}-${row}`,
        date: isFuture ? null : k,
        total,
        level: isFuture ? 0 : levelFor(total, goal),
        isToday,
        isFuture,
        label: d.toLocaleDateString("es", {
          day: "numeric",
          month: "short",
        }),
        delay: col * 0.014 + row * 0.002,
      });
    }
  }

  return { cells, monthMarks, totalQuestions, practicedDays, bestDay };
}

// ── One cell ─────────────────────────────────────────────────

function HeatCell({ cell }: { cell: HeatCellModel }) {
  const base = cn(
    "rounded-[3px]",
    LEVEL_BG[cell.level],
    cell.isToday &&
      "ring-2 ring-primary ring-offset-1 ring-offset-card",
    cell.isFuture && "opacity-0"
  );

  if (cell.isFuture || !cell.date) {
    return (
      <span
        className={base}
        style={{ width: "var(--cell)", height: "var(--cell)" }}
        aria-hidden="true"
      />
    );
  }

  const tip =
    cell.total > 0
      ? `${cell.total} pregunta${cell.total === 1 ? "" : "s"} · ${cell.label}`
      : `sin práctica · ${cell.label}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.span
          className={cn(base, "cursor-default")}
          style={{ width: "var(--cell)", height: "var(--cell)" }}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: cell.delay,
            type: "spring",
            stiffness: 500,
            damping: 26,
          }}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="font-mono text-[10px]">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}
