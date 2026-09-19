"use client";

// ─────────────────────────────────────────────────────────────
// VerbProfile — a slim "verb passport" strip under the Tables
// controls: classification chips (regular / stem change /
// reflexive / key irregularities) + every English meaning.
// Derived purely from the shared VERBS data.
// ─────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import { Fingerprint } from "lucide-react";

import { VERBS, type SpecialForms, type VerbAttrs } from "@/lib/conjugator/types";
import { cn } from "@/lib/utils";

const CHIP =
  "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] sm:text-[11px]";

interface ChipSpec {
  label: string;
  /** accent = noteworthy irregularity, muted = plain classification */
  tone: "accent" | "muted" | "success";
}

const ENDINGS = ["-ar verb", "-er verb", "-ir verb"] as const;

const STEM_CHANGES: Record<number, string> = {
  1: "stem e → ie",
  2: "stem e → i",
  3: "stem o → ue",
};

function participleLabel(p: NonNullable<SpecialForms["participle"]>): string {
  return Array.isArray(p) ? p.join(" / ") : p;
}

function buildChips(attrs: VerbAttrs): ChipSpec[] {
  const chips: ChipSpec[] = [];

  // plain classification first
  chips.push({ label: ENDINGS[attrs.endingType] ?? "verb", tone: "muted" });
  if (attrs.isReflexive) {
    chips.push({ label: "reflexive", tone: "muted" });
  }
  if (attrs.stemChangeType !== 0) {
    chips.push({
      label: STEM_CHANGES[attrs.stemChangeType] ?? "stem change",
      tone: "accent",
    });
  }

  // noteworthy irregularities
  const f = attrs.specialForms;
  if (f.yo) chips.push({ label: `yo → ${f.yo}-o`, tone: "accent" });
  if (f.boot) chips.push({ label: `boot → ${f.boot}-`, tone: "accent" });
  if (f.pres) chips.push({ label: `present: ${f.pres[0]}…`, tone: "accent" });
  if (f.imp) chips.push({ label: `imperfect: ${f.imp[0]}…`, tone: "accent" });
  if (f.pret) chips.push({ label: `preterite: ${f.pret[0]}…`, tone: "accent" });
  if (f.future) chips.push({ label: `future: ${f.future}-`, tone: "accent" });
  if (f.gerund) chips.push({ label: `gerund: ${f.gerund}`, tone: "accent" });
  if (f.participle) {
    chips.push({
      label: `participle: ${participleLabel(f.participle)}`,
      tone: "accent",
    });
  }
  if (f.subj) chips.push({ label: `subjunctive: ${f.subj[0]}…`, tone: "accent" });
  if (f.command) chips.push({ label: `tú + : ${f.command}`, tone: "accent" });
  if (f.nos) chips.push({ label: `nos: ${f.nos}`, tone: "accent" });

  // fully regular → a friendly green chip instead of an empty accent list
  if (attrs.stemChangeType === 0 && Object.keys(f).length === 0) {
    chips.push({ label: "regular", tone: "success" });
  }

  return chips;
}

const TONE_CLASS: Record<ChipSpec["tone"], string> = {
  accent: "border-accent-foreground/20 bg-accent text-accent-foreground",
  muted: "border-border bg-secondary/60 text-muted-foreground",
  success: "border-success/30 bg-success/10 text-success",
};

export function VerbProfile({ verb }: { verb: string }) {
  const attrs = VERBS[verb];
  if (!attrs) return null;

  const chips = buildChips(attrs);
  const meanings = [...new Set(attrs.english.map((e) => `to ${e.inf}`))];

  return (
    <motion.section
      key={verb}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      aria-label={`verb profile — ${verb}`}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border bg-card px-4 py-3 shadow-sm"
    >
      <span className="flex shrink-0 items-center gap-2">
        <Fingerprint
          className="size-3.5 text-primary"
          aria-hidden="true"
        />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          perfil
        </span>
      </span>

      <span className="flex flex-wrap items-center gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className={cn(CHIP, "normal-case tracking-normal", TONE_CLASS[chip.tone])}
          >
            {chip.label}
          </span>
        ))}
      </span>

      <span
        className="ml-auto hidden min-w-0 truncate font-display text-sm italic text-muted-foreground md:block"
        title={meanings.join(" · ")}
      >
        {meanings.join(" · ")}
      </span>
    </motion.section>
  );
}
