"use client";

import { SUBJECTS, type SubjectKey } from "@/lib/conjugator/types";
import { cn } from "@/lib/utils";

/** compact labels for narrow screens */
const SHORT_LABELS: Record<SubjectKey, string> = {
  yo: "yo",
  tu: "tú",
  el: "él",
  nosotros: "nos.",
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
      className="flex flex-wrap items-center gap-1 rounded-xl border bg-secondary/60 p-1"
    >
      {SUBJECTS.map((subject) => {
        const active = value === subject.key;
        return (
          <button
            key={subject.key}
            type="button"
            aria-pressed={active}
            title={subject.es}
            onClick={() => onChange(subject.key)}
            className={cn(
              "inline-flex h-11 items-center rounded-lg px-3 font-mono text-xs outline-none transition-colors",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <span className="sm:hidden">{SHORT_LABELS[subject.key]}</span>
            <span className="hidden sm:inline">{subject.es}</span>
          </button>
        );
      })}
    </div>
  );
}
