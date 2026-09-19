"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

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
  verbGlosses,
  verbLevel,
} from "@/lib/conjugator/types";
import { cn } from "@/lib/utils";

import type { LevelFilter } from "./types";

/** accent-insensitive lowercase search normalizer */
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

interface VerbPickerProps {
  value: string;
  level: LevelFilter;
  onChange: (verb: string) => void;
}

export function VerbPicker({ value, level, onChange }: VerbPickerProps) {
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const result: { level: 5 | 6; label: string; verbs: string[] }[] = [];
    if (level === "all" || level === 5) {
      result.push({ level: 5, label: "español 5", verbs: [...SP5_VERBS] });
    }
    if (level === "all" || level === 6) {
      result.push({ level: 6, label: "español 6", verbs: [...SP6_VERBS] });
    }
    return result;
  }, [level]);

  // Current verb is kept even when it falls outside the level filter —
  // flag it with a saffron badge so the state is clear.
  const offFilter = level !== "all" && verbLevel(value) !== level;

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
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
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
          <CommandInput placeholder="search verbs or meanings…" />
          <CommandList className="max-h-72 scrollbar-thin">
            <CommandEmpty className="py-6 text-center font-mono text-xs text-muted-foreground">
              no verb matches that search.
            </CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.level} heading={group.label}>
                {group.verbs.map((verb) => (
                  <CommandItem
                    key={verb}
                    value={`${verb} ${verbGlosses(verb)}`}
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
                    <Badge
                      variant="outline"
                      className="ml-auto font-mono text-[10px] tabular-nums"
                    >
                      {group.level}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
