"use client";

// ─────────────────────────────────────────────────────────────
// Compact personal-records strip for the setup screen.
// Best accuracy / best score / longest streak / session count —
// skeletons while loading, inviting empty state when silent-fail
// or no sessions yet.
// ─────────────────────────────────────────────────────────────

import {
  Flame,
  History,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

import { MICRO, type SessionsResponse } from "./types";

interface RecordsStripProps {
  data: SessionsResponse | null;
  loading: boolean;
}

export function RecordsStrip({ data, loading }: RecordsStripProps) {
  const stats = data?.stats;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[86px] rounded-xl" />
        ))}
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

  const cards: { Icon: LucideIcon; label: string; value: string }[] = [
    {
      Icon: Target,
      label: "best accuracy",
      value: `${Math.round(Math.min(1, Math.max(0, stats.bestAccuracy)) * 100)}%`,
    },
    { Icon: Trophy, label: "best score", value: String(stats.bestScore) },
    { Icon: Flame, label: "longest streak", value: String(stats.bestStreak) },
    { Icon: History, label: "sessions", value: String(stats.totalSessions) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ Icon, label, value }) => (
        <div
          key={label}
          className="rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-1.5">
            <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
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
