"use client";

// ─────────────────────────────────────────────────────────────
// Compact list of recent sessions (results screen).
// Renders nothing when there is no history to show.
// ─────────────────────────────────────────────────────────────

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  MICRO,
  formatDuration,
  timeAgo,
  type SessionRecord,
  type SessionsResponse,
} from "./types";

interface RecentSessionsProps {
  data: SessionsResponse | null;
  loading: boolean;
}

export function RecentSessions({ data, loading }: RecentSessionsProps) {
  const recent = (data?.recent ?? []).slice(0, 6);

  if (loading) {
    return (
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (recent.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <p className={MICRO}>recent sessions</p>
        <p className={cn(MICRO, "tabular-nums")}>
          {data?.stats.totalSessions ?? recent.length} total
        </p>
      </div>
      <div className="scrollbar-thin max-h-80 divide-y overflow-y-auto">
        {recent.map((session) => (
          <SessionRow key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: SessionRecord }) {
  const timed = session.mode === "timed";
  const pct = Math.round(Math.min(1, Math.max(0, session.accuracy)) * 100);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          {timed ? "timed" : "infinite"} · {formatDuration(session.durationSec)}{" "}
          · {timeAgo(session.createdAt)}
        </p>
        <p className="mt-0.5 font-mono text-sm tabular-nums">
          {session.score}/{session.total} · {pct}% · streak{" "}
          {session.bestStreak}
        </p>
      </div>
      <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {(session.avgMsPerQuestion / 1000).toFixed(1)}s / q
      </p>
    </div>
  );
}
