"use client";

// ─────────────────────────────────────────────────────────────
// VerbOfDay — a slim editorial spotlight strip for the Tables
// landing: one deterministic verb per day (cycles through the
// whole catalogue), with a live conjugation teaser computed by
// the shared engine and a one-tap "study this verb" action.
// ─────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import { ArrowRight, Check, Sunrise, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

import { conjugateOne } from "@/lib/conjugator/engine";
import { ALL_VERBS, verbGlosses } from "@/lib/conjugator/types";

/** deterministic daily pick — local midnight, full catalogue cycle */
function todaysVerb(): string {
  const dayIndex = Math.floor(new Date().setHours(0, 0, 0, 0) / 86_400_000);
  return ALL_VERBS[dayIndex % ALL_VERBS.length];
}

/** the previous `count` daily picks, newest first (deterministic) */
function recentVerbs(count: number): { verb: string; date: Date }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayIndex = Math.floor(today.getTime() / 86_400_000);
  const out: { verb: string; date: Date }[] = [];
  for (let back = 1; back <= count; back++) {
    const idx = ((dayIndex - back) % ALL_VERBS.length + ALL_VERBS.length) % ALL_VERBS.length;
    out.push({
      verb: ALL_VERBS[idx],
      date: new Date(today.getTime() - back * 86_400_000),
    });
  }
  return out;
}

interface TeaserForm {
  label: string;
  value: string;
}

function buildTeaser(verb: string): TeaserForm[] {
  const pick = (tense: "pres" | "pret" | "fut", label: string): TeaserForm => {
    try {
      const { spanish } = conjugateOne(verb, "yo", tense);
      return { label, value: spanish[0] ?? "—" };
    } catch {
      return { label, value: "—" };
    }
  };
  return [
    pick("pres", "presente"),
    pick("pret", "pretérito"),
    pick("fut", "futuro"),
  ];
}

interface VerbOfDayProps {
  /** the verb currently loaded in the chart */
  current: string;
  /** load a verb into the chart (clears answers) */
  onPick: (verb: string) => void;
  /** hand the verb to Practice mode for a focused quiz */
  onQuiz: (verb: string) => void;
}

export function VerbOfDay({ current, onPick, onQuiz }: VerbOfDayProps) {
  const verb = todaysVerb();
  const gloss = verbGlosses(verb);
  const isCurrent = verb === current;
  const teaser = buildTeaser(verb);
  const archive = recentVerbs(6);
  const dateLabel = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <motion.aside
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      aria-label={`verb of the day — ${verb}`}
      className="relative overflow-hidden rounded-xl border border-accent-foreground/15 bg-gradient-to-r from-accent/80 via-accent/45 to-transparent shadow-sm"
    >
      {/* faint oversized watermark — echoes the day's verb */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 -top-7 select-none font-display text-[88px] font-black italic leading-none text-accent-foreground/[0.06]"
      >
        {verb.slice(0, 3)}
      </span>

      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3.5 px-4 py-4 sm:px-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
          <Sunrise className="size-5" aria-hidden="true" />
        </span>

        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-accent-foreground/75">
            el verbo del día · {dateLabel}
          </p>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2.5 leading-tight">
            <span className="font-display text-xl font-semibold italic">
              {verb}
            </span>
            <span className="font-display text-sm italic text-muted-foreground">
              to {gloss}
            </span>
          </p>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <dl className="hidden items-center gap-4 md:flex">
            {teaser.map((form) => (
              <div key={form.label} className="text-right">
                <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/80">
                  yo · {form.label}
                </dt>
                <dd className="font-mono text-sm leading-tight">{form.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex items-center gap-2.5">
            <Button
              variant={isCurrent ? "outline" : "default"}
              size="sm"
              onClick={() => onPick(verb)}
              disabled={isCurrent}
              aria-label={
                isCurrent
                  ? `${verb} is already on the chart`
                  : `study ${verb} in the chart`
              }
              className="h-11 gap-1.5 rounded-xl px-4 font-mono text-[11px] uppercase tracking-[0.12em]"
            >
              {isCurrent ? (
                <>
                  <Check className="size-4" aria-hidden="true" />
                  on the chart
                </>
              ) : (
                <>
                  study this verb
                  <ArrowRight className="size-4" aria-hidden="true" />
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onQuiz(verb)}
              aria-label={`quiz me on ${verb}`}
              title={`start a focused practice drill on ${verb}`}
              className="h-11 gap-1.5 rounded-xl border-primary/30 bg-primary/[0.04] px-4 font-mono text-[11px] uppercase tracking-[0.12em] text-primary hover:bg-primary/[0.08] hover:text-primary"
            >
              <Zap className="size-4" aria-hidden="true" />
              quiz me
            </Button>
          </div>
        </div>
      </div>

      {/* archive — the previous daily picks, one tap to study */}
      <div className="relative flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-accent-foreground/10 px-4 py-2.5 sm:px-5">
        <p className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
          últimos días
        </p>
        <ul className="flex flex-wrap items-center gap-1.5">
          {archive.map(({ verb: pastVerb, date }) => {
            const onChart = pastVerb === current;
            return (
              <li key={pastVerb}>
                <button
                  type="button"
                  onClick={() => onPick(pastVerb)}
                  disabled={onChart}
                  aria-label={`study ${pastVerb} — verb of the day ${date.toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric" }
                  )}`}
                  title={`${pastVerb} · to ${verbGlosses(pastVerb)} · ${date.toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric" }
                  )}`}
                  className={
                    onChart
                      ? "inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] text-primary"
                      : "inline-flex items-center gap-1 rounded-full border border-accent-foreground/15 bg-card/70 px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground transition-all outline-none hover:border-primary/40 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-95"
                  }
                >
                  {onChart && <Check className="size-3" aria-hidden="true" />}
                  {pastVerb}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.aside>
  );
}
