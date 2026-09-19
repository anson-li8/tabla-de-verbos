"use client";

import { SUBJECTS, type SubjectKey } from "@/lib/conjugator/types";
import { cn } from "@/lib/utils";

/** compact labels for narrow screens */
const SHORT_LABELS: Record<SubjectKey, string> = {
  yo: "yo",
  tu: "tú",
  el: "él",
  nosotros: "nos.",
  vosotros: "vos.",
  ellos: "ellos",
};

interface SubjectPickerProps {
  value: SubjectKey;
  onChange: (subject: SubjectKey) => void;
}

export function SubjectPicker({ value, onChange }: SubjectPickerProps) {
  return (
    <div
      role="group"
      aria-label="Grammatical subject"
      className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border bg-secondary/60 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible"
    >
      {SUBJECTS.map((subject) => {
        const active = value === subject.key;
        const isVosotros = subject.key === "vosotros";
        return (
          <button
            key={subject.key}
            type="button"
            aria-pressed={active}
            title={`${subject.es} — ${subject.en}`}
            onClick={() => onChange(subject.key)}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 font-mono text-xs outline-none transition-colors",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <span className="sm:hidden">{SHORT_LABELS[subject.key]}</span>
            <span className="hidden sm:inline">{subject.es}</span>
            {isVosotros && (
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex h-4 items-center rounded-[4px] px-1 font-mono text-[8px] font-semibold uppercase tracking-[0.08em]",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted-foreground/10 text-muted-foreground/80"
                )}
              >
                es
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
