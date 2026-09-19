"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { BadgeCheck, Check, ChevronsUpDown, EyeOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SP5_VERBS,
  SP6_VERBS,
  TENSE_ROWS,
  SUBJECTS,
  verbGlosses,
  verbLevel,
  type SubjectKey,
} from "@/lib/conjugator/types";
import { cn } from "@/lib/utils";

import type { LevelFilter } from "./types";
import {
  MASTERY_THRESHOLD,
  type MasteryMap,
} from "./use-cell-mastery";

/** accent-insensitive lowercase search normalizer */
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** accent-normalized first letter, uppercased — the A–Z rail key */
const firstLetter = (verb: string) => normalize(verb).charAt(0).toUpperCase();

/**
 * A–Z quick-jump rail — sits along the right edge of the verb
 * list. One button per letter that actually has verbs (respecting
 * the current search + filters); clicking scrolls the first match
 * to the top of the list.
 */
function AzRail({
  letters,
  onJump,
}: {
  letters: string[];
  onJump: (letter: string) => void;
}) {
  return (
    <nav
      aria-label="jump to verbs by first letter"
      className="absolute right-1 top-1 bottom-1 z-10 flex flex-col items-center justify-start gap-px py-1"
    >
      {letters.map((letter) => (
        <button
          key={letter}
          type="button"
          onClick={() => onJump(letter)}
          aria-label={`jump to verbs starting with ${letter}`}
          className="flex size-3.5 items-center justify-center rounded-[4px] font-mono text-[9px] font-semibold leading-none text-muted-foreground/60 outline-none transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-[2px] focus-visible:ring-ring/60"
        >
          {letter}
        </button>
      ))}
    </nav>
  );
}

interface VerbPickerProps {
  value: string;
  level: LevelFilter;
  onChange: (verb: string) => void;
  /** current subject — mastery counters are scoped to it */
  subject: SubjectKey;
  /** per-cell mastery stats (localStorage) */
  mastery: MasteryMap;
}

export function VerbPicker({ value, level, onChange, subject, mastery }: VerbPickerProps) {
  const [open, setOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"alpha" | "mastery">("alpha");
  const [hideMastered, setHideMastered] = useState(false);
  const [search, setSearch] = useState("");

  // per-verb mastered-row counts for the CURRENT subject — a row
  // counts when both its es and en cells reached the mastery
  // threshold. One pass over the (bounded) mastery map.
  const masteredCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [key, stat] of Object.entries(mastery)) {
      // key shape: verb|subject|row|lang
      const parts = key.split("|");
      if (parts.length !== 4) continue;
      const [verb, subj, row, lang] = parts;
      if (subj !== subject || lang !== "es") continue;
      if (stat.c < MASTERY_THRESHOLD) continue;
      const en = mastery[`${verb}|${subject}|${row}|en`];
      if (en && en.c >= MASTERY_THRESHOLD) {
        counts.set(verb, (counts.get(verb) ?? 0) + 1);
      }
    }
    return counts;
  }, [mastery, subject]);

  const completedCharts = useMemo(
    () =>
      [...masteredCounts.values()].filter(
        (count) => count >= TENSE_ROWS.length
      ).length,
    [masteredCounts]
  );

  const subjectPronoun =
    SUBJECTS.find((s) => s.key === subject)?.pronoun ?? subject;

  // verb list ref — the A–Z rail scrolls items inside it
  const listRef = useRef<HTMLDivElement>(null);

  const jumpToLetter = useCallback(
    (letter: string) => {
      const list = listRef.current;
      if (!list) return;
      const items = Array.from(
        list.querySelectorAll<HTMLElement>("[data-verb]"),
      );
      const target = items.find((item) =>
        firstLetter(item.dataset.verb ?? "") === letter,
      );
      target?.scrollIntoView({ block: "start" });
    },
    [],
  );

  const groups = useMemo(() => {
    const result: { level: 5 | 6; label: string; verbs: string[] }[] = [];
    const polish = (verbs: readonly string[]) => {
      let list = [...verbs];
      if (hideMastered) {
        list = list.filter(
          (verb) => (masteredCounts.get(verb) ?? 0) < TENSE_ROWS.length
        );
      }
      if (sortMode === "mastery") {
        // least-mastered first — untouched charts stay alphabetical
        // within the same count (stable sort)
        list.sort((a, b) => {
          const ma = masteredCounts.get(a) ?? 0;
          const mb = masteredCounts.get(b) ?? 0;
          if (ma !== mb) return ma - mb;
          return a.localeCompare(b, "es");
        });
      }
      return list;
    };
    if (level === "all" || level === 5) {
      result.push({ level: 5, label: "español 5", verbs: polish(SP5_VERBS) });
    }
    if (level === "all" || level === 6) {
      result.push({ level: 6, label: "español 6", verbs: polish(SP6_VERBS) });
    }
    return result.filter((g) => g.verbs.length > 0);
  }, [level, sortMode, hideMastered, masteredCounts]);

  // Current verb is kept even when it falls outside the level filter —
  // flag it with a saffron badge so the state is clear.
  const offFilter = level !== "all" && verbLevel(value) !== level;

  // letters that actually have verbs right now (search + filters
  // respected — mirrors the cmdk value/filter logic)
  const letters = useMemo(() => {
    const q = normalize(search.trim());
    const source = groups
      .flatMap((g) => g.verbs)
      .filter(
        (v) => !q || normalize(`${v} ${verbGlosses(v)}`).includes(q),
      );
    return [...new Set(source.map(firstLetter))].sort();
  }, [groups, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Pick a verb"
          className="h-12 w-full justify-between gap-2 rounded-xl px-4 sm:w-72"
        >
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate font-display text-lg font-semibold italic">
              {value}
            </span>
            <span className="hidden truncate font-mono text-[11px] text-muted-foreground sm:inline">
              {verbGlosses(value)}
            </span>
          </span>
          {offFilter && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="shrink-0 border-warn/50 bg-warn/10 font-mono text-[10px] text-warn"
                >
                  sp {verbLevel(value)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {value} is español {verbLevel(value)} — outside the current
                level filter
              </TooltipContent>
            </Tooltip>
          )}
          <ChevronsUpDown
            className={cn(
              "size-4 shrink-0 opacity-50 transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command
          filter={(itemValue, search) =>
            normalize(itemValue).includes(normalize(search)) ? 1 : 0
          }
        >
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="search verbs or meanings…"
          />
          {/* sort + filter controls (mastery view) */}
          <div
            className="flex items-center justify-between gap-2 border-b px-2.5 py-2"
            role="group"
            aria-label="Verb list sorting"
          >
            <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <span className="pl-1">sort</span>
              <button
                type="button"
                onClick={() => setSortMode("alpha")}
                aria-pressed={sortMode === "alpha"}
                className={cn(
                  "rounded-md px-1.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-ring/60",
                  sortMode === "alpha"
                    ? "bg-primary/10 font-semibold text-primary"
                    : "hover:bg-foreground/5"
                )}
              >
                a–z
              </button>
              <button
                type="button"
                onClick={() => setSortMode("mastery")}
                aria-pressed={sortMode === "mastery"}
                className={cn(
                  "rounded-md px-1.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-ring/60",
                  sortMode === "mastery"
                    ? "bg-primary/10 font-semibold text-primary"
                    : "hover:bg-foreground/5"
                )}
              >
                needs work
              </button>
            </div>
            <button
              type="button"
              onClick={() => setHideMastered((v) => !v)}
              aria-pressed={hideMastered}
              title="Hide verbs whose full chart is mastered for this subject"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-1.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-ring/60",
                hideMastered
                  ? "bg-success/10 text-success"
                    : "text-muted-foreground hover:bg-foreground/5"
              )}
            >
              <EyeOff className="size-3" aria-hidden="true" />
              hide mastered
            </button>
          </div>
          <div className="relative">
            {letters.length > 1 && (
              <AzRail letters={letters} onJump={jumpToLetter} />
            )}
            <CommandList
              ref={listRef}
              className="max-h-72 scrollbar-thin pr-6"
            >
            {search.trim() ? (
              <CommandEmpty className="py-6 text-center font-mono text-xs text-muted-foreground">
                no verb matches that search.
              </CommandEmpty>
            ) : groups.length === 0 ? (
              <p className="px-3 py-6 text-center font-mono text-xs text-muted-foreground">
                every verb in this level is mastered — turn off “hide
                mastered” to see them again.
              </p>
            ) : null}
            {groups.map((group) => (
              <CommandGroup
                key={group.level}
                heading={
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block h-px w-3 shrink-0 translate-y-[-1px] bg-primary/70"
                    />
                    {group.label}
                  </span>
                }
              >
                {group.verbs.map((verb) => {
                  const mastered = masteredCounts.get(verb) ?? 0;
                  const complete = mastered >= TENSE_ROWS.length;
                  return (
                    <CommandItem
                      key={verb}
                      value={`${verb} ${verbGlosses(verb)}`}
                      data-verb={verb}
                      onSelect={() => {
                        onChange(verb);
                        setOpen(false);
                      }}
                      className="gap-2 py-2"
                    >
                      <Check
                        className={cn(
                          "size-4 shrink-0",
                          value === verb ? "opacity-100" : "opacity-0"
                        )}
                        aria-hidden="true"
                      />
                      <span className="font-display text-[15px] font-medium">
                        {verb}
                      </span>
                      <span className="truncate font-mono text-[11px] text-muted-foreground">
                        {verbGlosses(verb)}
                      </span>
                      <span className="ml-auto flex shrink-0 items-center gap-2">
                        {mastered > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  "flex items-center gap-1 font-mono text-[10px] tabular-nums",
                                  complete
                                    ? "text-success"
                                    : "text-muted-foreground/80"
                                )}
                              >
                                {complete && (
                                  <BadgeCheck
                                    className="size-3.5"
                                    aria-hidden="true"
                                  />
                                )}
                                {mastered}/{TENSE_ROWS.length}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {complete
                                ? `${verb} — full chart mastered for ${subjectPronoun}`
                                : `${mastered} of ${TENSE_ROWS.length} rows mastered for ${subjectPronoun}`}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] tabular-nums"
                        >
                          {group.level}
                        </Badge>
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
            {masteredCounts.size > 0 && (
              <p className="border-t px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
                charts mastered for {subjectPronoun}: {completedCharts}/
                {groups.reduce((a, g) => a + g.verbs.length, 0)}
              </p>
            )}
            </CommandList>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
