"use client";

// ─────────────────────────────────────────────────────────────
// Compact personal-records strip for the setup screen.
// Best accuracy / best score / longest streak / day racha /
// session count — skeletons while loading, inviting empty state
// when silent-fail or no sessions yet.
// ─────────────────────────────────────────────────────────────

import {
  CalendarCheck2,
  Flame,
  History,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { MICRO, type DailyStats, type SessionsResponse } from "./types";

interface RecordsStripProps {
  data: SessionsResponse | null;
  loading: boolean;
  /** daily aggregates — adds the "day racha" record when present */
  daily?: DailyStats | null;
}

export function RecordsStrip({ data, loading, daily }: RecordsStripProps) {
  const stats = data?.stats;
  const hasDayRacha = !!daily && (stats?.totalSessions ?? 0) > 0;
  const cols = hasDayRacha ? "sm:grid-cols-3 lg:grid-cols-5" : "lg:grid-cols-4";

  if (loading) {
    return (
      <div
        className={cn("grid grid-cols-2 gap-3", cols)}
        role="status"
        aria-label="loading your records"
      >
        {["best accuracy", "best score", "longest streak", "sessions"].map(
          (label) => (
            <div
              key={label}
              className="rounded-xl border bg-card p-4 shadow-sm"
              aria-hidden="true"
            >
              <p className={MICRO}>{label}</p>
              <Skeleton className="mt-2.5 h-7 w-14" />
            </div>
          )
        )}
      </div>
    );
  }

  if (!stats || stats.totalSessions === 0) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-dashed bg-card/60 p-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Trophy className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg italic leading-snug">
            no sessions yet
          </p>
          <p className="text-sm text-muted-foreground">
            your records will appear here after your first session
          </p>
        </div>
      </div>
    );
  }

  const cards: {
    Icon: LucideIcon;
    label: string;
    value: string;
    accent?: boolean;
    /** span the full mobile row (avoids an orphaned 5th card) */
    full?: boolean;
  }[] = [
    {
      Icon: Target,
      label: "best accuracy",
      value: `${Math.round(Math.min(1, Math.max(0, stats.bestAccuracy)) * 100)}%`,
    },
    { Icon: Trophy, label: "best score", value: String(stats.bestScore) },
    { Icon: Flame, label: "longest streak", value: String(stats.bestStreak) },
    ...(hasDayRacha
      ? [
          {
            Icon: CalendarCheck2,
            label: "day racha",
            value: `${daily!.bestStreakDays}d`,
            accent: true,
          },
        ]
      : []),
    {
      Icon: History,
      label: "sessions",
      value: String(stats.totalSessions),
      full: hasDayRacha,
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-3", cols)}>
      {cards.map(({ Icon, label, value, accent, full }) => (
        <div
          key={label}
          className={cn(
            "group relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
            accent
              ? "border-primary/25 bg-gradient-to-br from-primary/[0.06] to-transparent"
              : "hover:border-primary/30",
            full && "col-span-2 sm:col-span-1"
          )}
        >
          {/* corner tick that brightens on hover */}
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent transition-all duration-300 group-hover:from-primary/40 group-hover:via-primary/60 group-hover:to-transparent"
            )}
          />
          <div className="flex items-center gap-1.5">
            <Icon
              className={cn(
                "size-3.5 transition-colors duration-200 group-hover:text-primary",
                accent ? "text-primary" : "text-muted-foreground"
              )}
              aria-hidden="true"
            />
            <p className={MICRO}>{label}</p>
          </div>
          <p className="mt-2 font-display text-2xl font-semibold leading-none tabular-nums">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
