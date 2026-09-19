"use client";

// ─────────────────────────────────────────────────────────────
// FocusPanel — setup-screen analytics card fed by
// GET /api/sessions/stats: an animated accuracy sparkline over
// the last 14 sessions, the toughest-verbs chips and a one-tap
// "drill my misses" quick start. Hidden until the first session
// exists (the records strip owns the true empty state).
// ─────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Loader2,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { ROW_META, type RowKey } from "@/lib/conjugator/types";
import { cn } from "@/lib/utils";

import { MICRO, timeAgo, type FocusStatsResponse } from "./types";

// ── Sparkline geometry ───────────────────────────────────────

const W = 280;
const H = 72;
const PAD_X = 7;
const PAD_TOP = 9;
const PAD_BOTTOM = 11;

function sparklinePoints(accuracies: number[]): [number, number][] {
  const n = accuracies.length;
  return accuracies.map((a, i) => [
    n <= 1 ? W / 2 : PAD_X + (i * (W - 2 * PAD_X)) / (n - 1),
    PAD_TOP + (1 - Math.min(1, Math.max(0, a))) * (H - PAD_TOP - PAD_BOTTOM),
  ]);
}

// ── Trend badge ──────────────────────────────────────────────

function TrendBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const up = delta >= 5;
  const down = delta <= -5;
  const Icon: LucideIcon = up
    ? ArrowUpRight
    : down
      ? ArrowDownRight
      : ArrowRight;
  const rounded = Math.round(delta);
  const label = up
    ? `improving +${rounded} pts`
    : down
      ? `slipping ${rounded} pts`
      : "steady";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]",
        up && "border-success/30 bg-success/10 text-success",
        down && "border-destructive/30 bg-destructive/10 text-destructive",
        !up && !down && "border-border bg-secondary/60 text-muted-foreground"
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}

// ── Sparkline ────────────────────────────────────────────────

function Sparkline({
  accuracies,
  labels,
}: {
  accuracies: number[];
  labels: { first: string; last: string };
}) {
  const pts = sparklinePoints(accuracies);
  const lineD = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  return (
    <figure className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <p className={MICRO}>
          accuracy — last {accuracies.length}{" "}
          session{accuracies.length === 1 ? "" : "s"}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`accuracy over the last ${accuracies.length} session${
          accuracies.length === 1 ? "" : "s"
        }, currently ${Math.round(accuracies[accuracies.length - 1] * 100)}%`}
        className="mt-1 h-auto w-full text-primary"
      >
        {/* midline at 50% — only useful with a real spread of points */}
        {pts.length > 1 && (
          <line
            x1={PAD_X}
            x2={W - PAD_X}
            y1={PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) / 2}
            y2={PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) / 2}
            className="stroke-border"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
        )}
        {/* area fill under the line */}
        {pts.length > 1 && (
          <motion.path
            d={`${lineD} L${pts[pts.length - 1][0].toFixed(1)},${H - 2} L${pts[0][0].toFixed(1)},${H - 2} Z`}
            className="fill-primary/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }}
          />
        )}
        {/* the line itself — draws in */}
        <motion.path
          d={lineD}
          fill="none"
          className="stroke-primary"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
        {/* data points */}
        {pts.map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r={i === pts.length - 1 ? 3.5 : 2.2}
            className={
              i === pts.length - 1
                ? "fill-primary stroke-background"
                : "fill-background stroke-primary/70"
            }
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 0.15 + i * 0.05,
              type: "spring",
              stiffness: 400,
              damping: 22,
            }}
          />
        ))}
      </svg>
      <figcaption className="flex items-center justify-between font-mono text-[10px] tabular-nums text-muted-foreground/80">
        <span>{labels.first}</span>
        <span>{labels.last}</span>
      </figcaption>
    </figure>
  );
}

// ── Panel ────────────────────────────────────────────────────

interface FocusPanelProps {
  stats: FocusStatsResponse | null;
  loading: boolean;
  drillLoading: boolean;
  onDrillMisses: () => void;
  /** start a focused drill on a single verb (chip tap) */
  onVerbDrill: (verb: string) => void;
  /** start a focused drill on a single tense (chip tap) */
  onTenseDrill: (tense: string) => void;
}

export function FocusPanel({
  stats,
  loading,
  drillLoading,
  onDrillMisses,
  onVerbDrill,
  onTenseDrill,
}: FocusPanelProps) {
  if (loading) {
    return (
      <Card
        className="rounded-2xl py-0 shadow-sm"
        role="status"
        aria-label="loading your focus stats"
      >
        <CardContent className="space-y-4 p-5 sm:p-6">
          <Skeleton className="h-4 w-24" />
          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  // no sessions yet — records strip already shows the empty state
  if (!stats || stats.totals.sessions === 0) return null;

  const { trend, trendDelta, hardestVerbs, hardestTenses, recentMisses } = stats;
  const drillVerbs = new Set(recentMisses.map((m) => m.verb));
  const dayLabel = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      aria-label="focus — your progress"
    >
      <Card className="rounded-2xl py-0 shadow-sm">
        <CardContent className="space-y-5 p-5 sm:p-6">
          {/* header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Target className="size-3.5" aria-hidden="true" />
              focus
            </h2>
            <TrendBadge delta={trendDelta} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:gap-8">
            {/* sparkline */}
            <Sparkline
              accuracies={trend.map((p) => p.accuracy)}
              labels={{
                first: dayLabel(trend[0].createdAt),
                last: dayLabel(trend[trend.length - 1].createdAt),
              }}
            />

            {/* toughest verbs + shakiest tenses */}
            <div className="min-w-0 space-y-5">
              <div>
                <p className={MICRO}>toughest verbs</p>
                {hardestVerbs.length === 0 ? (
                  <p className="mt-2.5 flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles
                      className="size-4 shrink-0 text-success"
                      aria-hidden="true"
                    />
                    no misses on record — ¡impecable!
                  </p>
                ) : (
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {hardestVerbs.slice(0, 6).map((v, i) => (
                      <li key={v.verb}>
                        <button
                          type="button"
                          onClick={() => onVerbDrill(v.verb)}
                          title={`missed ${v.count}× · last ${timeAgo(
                            v.lastMissedAt
                          )} · tap to drill this verb`}
                          aria-label={`drill the verb ${v.verb} — missed ${v.count} times`}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-all outline-none hover:border-primary/50 hover:bg-primary/[0.05] focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-95",
                            i === 0
                              ? "border-destructive/30 bg-destructive/[0.06]"
                              : "border-border bg-secondary/50"
                          )}
                        >
                          <span className="font-medium">{v.verb}</span>
                          <span
                            className={cn(
                              "tabular-nums",
                              i === 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                            )}
                          >
                            ×{v.count}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {hardestTenses.length > 0 && (
                <div>
                  <p className={MICRO}>shakiest tenses</p>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {hardestTenses.map((t) => {
                      const label =
                        ROW_META[t.tense as RowKey]?.labelEs ?? t.tense;
                      const pct = Math.round((t.c / t.t) * 100);
                      return (
                        <li key={t.tense}>
                          <button
                            type="button"
                            onClick={() => onTenseDrill(t.tense)}
                            title={`${t.c}/${t.t} correct — tap to drill this tense`}
                            aria-label={`drill ${label} — ${pct}% accuracy over ${t.t} answers`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2.5 py-1 font-mono text-[11px] transition-all outline-none hover:border-primary/50 hover:bg-primary/[0.05] focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-95"
                          >
                            <span className="font-medium">{label}</span>
                            <span className="tabular-nums text-muted-foreground">
                              {pct}%
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* drill quick-start */}
          {recentMisses.length > 0 ? (
            <Button
              variant="outline"
              size="lg"
              onClick={onDrillMisses}
              disabled={drillLoading}
              className="h-12 w-full gap-2.5 rounded-xl border-primary/30 bg-primary/[0.04] text-sm font-semibold hover:border-primary/50 hover:bg-primary/[0.08]"
            >
              {drillLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Target className="size-4 text-primary" aria-hidden="true" />
              )}
              drill my misses
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {drillVerbs.size} verb{drillVerbs.size === 1 ? "" : "s"} · infinite
              </span>
              <ArrowRight
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </Button>
          ) : (
            <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-success" aria-hidden="true" />
              every recent answer was correct — nothing to drill
            </p>
          )}
        </CardContent>
      </Card>
    </motion.section>
  );
}
