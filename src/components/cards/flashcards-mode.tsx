"use client";

// ─────────────────────────────────────────────────────────────
// FlashcardsMode — "slow mode" self-paced study. The whole verb
// catalog as flippable cards: one verb's 23 forms at a time,
// front shows the prompt (tense + subject + one language), back
// reveals the answer in both languages with pronunciation.
// Fully client-side — the conjugation engine runs locally, so
// flashcards work offline. No grading, no pressure: this is the
// browse-and-absorb complement to Practice mode.
// ─────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Dices,
  Layers,
  RotateCcw,
  Shuffle,
  Star,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SubjectPicker } from "@/components/tables/subject-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSpeech } from "@/hooks/use-speech";
import { conjugate, type ConjugationRow } from "@/lib/conjugator/engine";
import {
  ALL_VERBS,
  ROW_META,
  SP5_VERBS,
  SP6_VERBS,
  SUBJECTS,
  SUBJECT_KEYS,
  TENSE_ROWS,
  verbGlosses,
  type RowKey,
  type SubjectKey,
} from "@/lib/conjugator/types";
import { cn } from "@/lib/utils";
import { cardStarKey, countStarred, useCardStars } from "./use-card-stars";

const STORAGE_KEY = "tdv-flashcards";
const GROUP_LABEL: Record<string, string> = {
  base: "los básicos",
  indicative: "indicativo",
  perfect: "los perfectos",
  subjunctive: "el subjuntivo",
  imperative: "el imperativo",
};

type Direction = "en" | "es"; // which language sits on the FRONT

interface PersistedState {
  verb: string;
  subject: SubjectKey;
  direction: Direction;
  shuffled: boolean;
  /** deck filter — only starred ("needs review") cards */
  reviewOnly: boolean;
}

const DEFAULT_PREFS: PersistedState = {
  verb: "hablar",
  subject: "yo",
  direction: "en",
  shuffled: false,
  reviewOnly: false,
};

/**
 * Lazy initializer source — reads + validates the persisted prefs.
 * Cards mode only mounts client-side (it's not the default app
 * mode), so this never runs during SSR/hydration.
 */
function loadPrefs(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const saved = JSON.parse(raw) as Partial<PersistedState>;
    return {
      verb:
        typeof saved.verb === "string" && ALL_VERBS.includes(saved.verb)
          ? saved.verb
          : DEFAULT_PREFS.verb,
      subject:
        typeof saved.subject === "string" &&
        (SUBJECT_KEYS as string[]).includes(saved.subject)
          ? (saved.subject as SubjectKey)
          : DEFAULT_PREFS.subject,
      direction:
        saved.direction === "en" || saved.direction === "es"
          ? saved.direction
          : DEFAULT_PREFS.direction,
      shuffled:
        typeof saved.shuffled === "boolean"
          ? saved.shuffled
          : DEFAULT_PREFS.shuffled,
      reviewOnly:
        typeof saved.reviewOnly === "boolean"
          ? saved.reviewOnly
          : DEFAULT_PREFS.reviewOnly,
    };
  } catch {
    // corrupted payload — fall back to defaults
    return DEFAULT_PREFS;
  }
}

function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  );
}

/** fisher–yates (event handlers only — never during render) */
function shuffledOrder(indices: number[]): number[] {
  const arr = [...indices];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── one card face (front or back) ───────────────────────────

interface FaceProps {
  row: ConjugationRow;
  /** pronoun chip — null for the subject-less base forms */
  pronoun: string | null;
  kind: "front" | "back";
  direction: Direction;
  /** 1-based deck position — the front's watermark */
  index: number;
  speaking: boolean;
  supported: boolean;
  onSpeak: () => void;
  /** self-grade (back face only) — "no lo sabía" stars the card */
  starred: boolean;
  onGrade: (known: boolean) => void;
}

function CardFace({
  row,
  pronoun,
  kind,
  direction,
  index,
  speaking,
  supported,
  onSpeak,
  starred,
  onGrade,
}: FaceProps) {
  const meta = ROW_META[row.key];
  const isFront = kind === "front";
  // what the front shows depends on the study direction; the back
  // always reveals both languages
  const frontLang: "en" | "es" = direction;
  const forms = (lang: "es" | "en") =>
    (lang === "es" ? row.spanish : row.english).join(" / ");

  return (
    <div
      className={cn(
        "relative flex min-h-[340px] w-full flex-col overflow-hidden rounded-2xl border p-6 select-none sm:min-h-[380px] sm:p-8",
        isFront
          ? "border-accent-foreground/15 bg-gradient-to-br from-accent/70 via-accent/35 to-transparent shadow-sm"
          : "border-primary/25 bg-card shadow-lg",
      )}
    >
      {/* faint oversized watermark — the deck position, flashcard-style.
          (never the verb or answer — that would spoil EN→ES recall) */}
      {isFront && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-2 -top-10 select-none font-display text-[120px] font-black italic leading-none tabular-nums text-accent-foreground/[0.055]"
        >
          {String(index).padStart(2, "0")}
        </span>
      )}
      {/* top rail: group + card side */}
      <div className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "font-mono text-[10px] font-medium uppercase tracking-[0.18em]",
            isFront ? "text-accent-foreground/70" : "text-primary/80",
          )}
        >
          {GROUP_LABEL[meta.group] ?? meta.group}
        </p>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]",
            isFront
              ? "border-accent-foreground/15 text-accent-foreground/60"
              : "border-primary/25 bg-primary/10 text-primary",
          )}
        >
          {isFront ? (
            "pregunta"
          ) : (
            <span className="flex items-center gap-1.5">
              respuesta
              {starred && (
                <Star
                  className="size-2.5 fill-warn text-warn"
                  aria-hidden="true"
                />
              )}
            </span>
          )}
        </span>
      </div>

      {/* tense + pronoun */}
      <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-2xl font-semibold italic tracking-tight sm:text-3xl">
          {meta.labelEs}
        </span>
        {pronoun && (
          <span className="rounded-md border border-accent-foreground/15 bg-card/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            {pronoun}
          </span>
        )}
      </div>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">
        {meta.labelEn}
      </p>

      {/* the face's payload */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
        {isFront ? (
          <motion.p
            key={`${row.key}-front`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="max-w-full text-balance font-display text-3xl font-semibold italic leading-tight sm:text-4xl"
          >
            {forms(frontLang)}
          </motion.p>
        ) : (
          <>
            <motion.div
              key={`${row.key}-back`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col items-center gap-3"
            >
              {direction === "en" ? (
                <>
                  <p className="max-w-full text-balance font-display text-3xl font-semibold italic leading-tight text-primary sm:text-4xl">
                    {forms("es")}
                  </p>
                  <p className="font-display text-lg italic text-muted-foreground">
                    {forms("en")}
                  </p>
                </>
              ) : (
                <>
                  <p className="max-w-full text-balance font-display text-3xl font-semibold italic leading-tight text-primary sm:text-4xl">
                    {forms("en")}
                  </p>
                  <p className="font-display text-lg italic text-muted-foreground">
                    {forms("es")}
                  </p>
                </>
              )}
            </motion.div>
            {supported && (
              <Button
                size="sm"
                variant="outline"
                onClick={onSpeak}
                aria-label={`hear ${row.spanish[0]} in Spanish`}
                className={cn(
                  "h-9 gap-1.5 rounded-lg border-primary/30 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:border-primary/50 hover:bg-primary/5",
                  speaking && "animate-pulse border-primary/60",
                )}
              >
                <Volume2 className="size-3.5" aria-hidden="true" />
                escuchar
              </Button>
            )}

            {/* self-grade — feeds the review deck */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onGrade(false)}
                aria-label="mark this card for review — no lo sabía"
                className={cn(
                  "h-9 gap-1.5 rounded-lg border-warn/40 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-warn hover:border-warn/60 hover:bg-warn/10 active:scale-95",
                  starred && "border-warn/70 bg-warn/15",
                )}
              >
                <Star
                  className={cn(
                    "size-3.5 transition-transform",
                    starred && "fill-warn scale-110",
                  )}
                  aria-hidden="true"
                />
                no lo sabía
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onGrade(true)}
                aria-label="got it right — lo sabía, clear the star"
                className="h-9 gap-1.5 rounded-lg border-success/40 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-success hover:border-success/60 hover:bg-success/10 active:scale-95"
              >
                <Check className="size-3.5" aria-hidden="true" />
                lo sabía
              </Button>
            </div>
          </>
        )}
      </div>

      {/* footer hint */}
      <p className="text-center font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/60">
        {isFront
          ? "espacio para voltear"
          : "y / n para calificar · espacio para volver"}
      </p>
    </div>
  );
}

// ── deck progress rail (23 clickable segments) ──────────────

interface DeckRailProps {
  order: RowKey[];
  seen: Set<number>;
  current: number;
  /** starred (needs-review) flags, aligned with `order` */
  starredFlags: boolean[];
  onJump: (index: number) => void;
}

function DeckRail({ order, seen, current, starredFlags, onJump }: DeckRailProps) {
  return (
    <div
      role="tablist"
      aria-label="deck position — jump to any form"
      className="hidden flex-wrap items-center gap-1 sm:flex"
    >
      {order.map((rowKey, i) => {
        const meta = ROW_META[rowKey];
        const active = i === current;
        const starred = starredFlags[i];
        return (
          <Tooltip key={`${rowKey}-${i}`}>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`card ${i + 1} — ${meta.labelEs}`}
                onClick={() => onJump(i)}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active
                    ? "w-4 bg-primary shadow-sm"
                    : starred
                      ? "bg-warn hover:bg-warn/80"
                      : seen.has(i)
                        ? "bg-primary/40 hover:bg-primary/60"
                        : "bg-muted-foreground/20 hover:bg-muted-foreground/40",
                )}
              />
            </TooltipTrigger>
            <TooltipContent className="font-mono text-[10px]">
              {i + 1} · {meta.labelEs}
              {starred ? " · en revisión" : seen.has(i) ? " · visto" : ""}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ── the mode ────────────────────────────────────────────────

export default function FlashcardsMode() {
  // study preferences — one lazily-initialized state object
  // (persists across visits via localStorage)
  const [prefs, setPrefs] = useState<PersistedState>(loadPrefs);
  const { verb, subject, direction, shuffled, reviewOnly } = prefs;
  const [order, setOrder] = useState<number[]>(() =>
    TENSE_ROWS.map((_, i) => i),
  );
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const speech = useSpeech();
  const { stars, star, unstar } = useCardStars();

  // the full 23-row chart, computed locally by the shared engine
  const rows = useMemo(() => {
    try {
      return conjugate(verb, subject);
    } catch {
      return [] as ConjugationRow[];
    }
  }, [verb, subject]);

  const row = order.length > 0 ? (rows[order[current]] ?? rows[0]) : null;
  const meta = row ? ROW_META[row.key] : null;
  const pronoun =
    row && meta?.hasSubject
      ? (SUBJECTS.find((s) => s.key === subject)?.pronoun ?? subject)
      : null;

  // star state for the current card + the deck rail
  const isStarred = useCallback(
    (rowKey: RowKey) =>
      Object.hasOwn(stars, cardStarKey(verb, subject, rowKey)),
    [stars, verb, subject],
  );
  const currentStarred = row ? isStarred(row.key) : false;
  const starredCount = countStarred(
    stars,
    verb,
    subject,
    TENSE_ROWS.map((r) => r.key),
  );

  // ── persist preferences ───────────────────────────────────
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // storage unavailable — study without persistence
    }
  }, [prefs]);

  // ── deck navigation (event-driven — resets never happen mid-render) ──
  // `isStarredAt` scopes the review filter to the verb+subject the
  // deck is being (re)built for — which may be the NEW selection.
  const resetDeck = useCallback(
    (opts: {
      reshuffle: boolean;
      filterReview: boolean;
      isStarredAt: (rowKey: RowKey) => boolean;
    }) => {
      let indices = TENSE_ROWS.map((_, i) => i);
      if (opts.filterReview) {
        indices = indices.filter((i) => opts.isStarredAt(TENSE_ROWS[i].key));
      }
      setOrder(opts.reshuffle ? shuffledOrder(indices) : indices);
      setCurrent(0);
      setFlipped(false);
      setSeen(new Set());
    },
    [],
  );

  const handleVerbChange = useCallback(
    (next: string) => {
      setPrefs((p) => ({ ...p, verb: next }));
      resetDeck({
        reshuffle: false,
        filterReview: reviewOnly,
        isStarredAt: (k) => Object.hasOwn(stars, cardStarKey(next, subject, k)),
      });
    },
    [reviewOnly, subject, stars, resetDeck],
  );

  const handleSubjectChange = useCallback(
    (next: SubjectKey) => {
      if (next === subject) return;
      setPrefs((p) => ({ ...p, subject: next }));
      resetDeck({
        reshuffle: shuffled,
        filterReview: reviewOnly,
        isStarredAt: (k) => Object.hasOwn(stars, cardStarKey(verb, next, k)),
      });
    },
    [subject, verb, shuffled, reviewOnly, stars, resetDeck],
  );

  const handleShuffleToggle = useCallback(() => {
    const next = !shuffled;
    setPrefs((p) => ({ ...p, shuffled: next }));
    resetDeck({
      reshuffle: next,
      filterReview: reviewOnly,
      isStarredAt: (k) => Object.hasOwn(stars, cardStarKey(verb, subject, k)),
    });
  }, [shuffled, reviewOnly, verb, subject, stars, resetDeck]);

  const handleReviewToggle = useCallback(() => {
    const next = !reviewOnly;
    setPrefs((p) => ({ ...p, reviewOnly: next }));
    resetDeck({
      reshuffle: false,
      filterReview: next,
      isStarredAt: (k) => Object.hasOwn(stars, cardStarKey(verb, subject, k)),
    });
  }, [reviewOnly, verb, subject, stars, resetDeck]);

  const handleRandomVerb = useCallback(() => {
    const candidates = ALL_VERBS.filter((v) => v !== verb);
    const pick =
      candidates[Math.floor(Math.random() * candidates.length)] ?? ALL_VERBS[0];
    setPrefs((p) => ({ ...p, verb: pick }));
    resetDeck({
      reshuffle: shuffled,
      filterReview: reviewOnly,
      isStarredAt: (k) =>
        Object.hasOwn(stars, cardStarKey(pick, subject, k)),
    });
  }, [verb, subject, shuffled, reviewOnly, stars, resetDeck]);

  const goTo = useCallback(
    (index: number) => {
      const n = order.length;
      if (n === 0) return;
      const next = ((index % n) + n) % n; // wrap both ways
      setCurrent(next);
      setFlipped(false);
    },
    [order.length],
  );

  const nextCard = useCallback(() => goTo(current + 1), [goTo, current]);
  const prevCard = useCallback(() => goTo(current - 1), [goTo, current]);

  // self-grade from the back face: "no lo sabía" stars the card,
  // "lo sabía" clears it. In review mode a cleared card leaves the
  // deck immediately; either way we advance past the graded card.
  const gradeCard = useCallback(
    (known: boolean) => {
      if (!row) return;
      if (known) unstar(verb, subject, row.key);
      else star(verb, subject, row.key);
      if (reviewOnly && known && order.length > 0) {
        setOrder((prev) => prev.filter((_, i) => i !== current));
        setCurrent((c) => Math.min(c, Math.max(0, order.length - 2)));
        setFlipped(false);
        return;
      }
      nextCard();
    },
    [row, verb, subject, star, unstar, reviewOnly, current, order.length, nextCard],
  );

  const flip = useCallback(() => {
    setFlipped((prev) => {
      if (!prev) {
        // revealing the answer marks the card as seen
        setSeen((s) => (s.has(current) ? s : new Set(s).add(current)));
      }
      return !prev;
    });
  }, [current]);

  const speakCurrent = useCallback(() => {
    if (!row) return;
    speech.speak(row.spanish[0] ?? "");
  }, [row, speech]);

  // ── keyboard: ←/→ deck, space/enter flip, s speak ──────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      // don't hijack keys while a popover/dialog owns the page
      if (
        document.querySelector(
          "[role=alertdialog][data-state=open], [role=dialog][data-state=open], [data-radix-popper-content-wrapper]",
        )
      ) {
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextCard();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevCard();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        flip();
      } else if (e.key.toLowerCase() === "s") {
        speakCurrent();
      } else if (e.key.toLowerCase() === "y" && flipped) {
        gradeCard(true);
      } else if (e.key.toLowerCase() === "n" && flipped) {
        gradeCard(false);
      } else if (e.key.toLowerCase() === "r") {
        handleReviewToggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextCard, prevCard, flip, speakCurrent, gradeCard, flipped, handleReviewToggle]);

  const seenCount = seen.size;
  const total = order.length;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* ── controls ── */}
      <Card className="bg-dotted gap-0 p-4 sm:p-6">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <div className="flex min-w-[200px] flex-1 flex-col gap-2 sm:flex-none">
            <MicroLabel>verb</MicroLabel>
            <Select value={verb} onValueChange={handleVerbChange}>
              <SelectTrigger
                aria-label="Pick a verb to study"
                className="h-12 w-full justify-between rounded-xl px-4 sm:w-72"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80 rounded-xl">
                <SelectGroup>
                  <SelectLabel className="font-mono text-[10px] uppercase tracking-[0.14em]">
                    español 5
                  </SelectLabel>
                  {SP5_VERBS.map((v) => (
                    <SelectItem key={v} value={v} className="gap-2 rounded-lg">
                      <span className="font-display text-[15px] font-medium italic">
                        {v}
                      </span>
                      <span className="truncate font-mono text-[11px] text-muted-foreground">
                        {verbGlosses(v)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel className="font-mono text-[10px] uppercase tracking-[0.14em]">
                    español 6
                  </SelectLabel>
                  {SP6_VERBS.map((v) => (
                    <SelectItem key={v} value={v} className="gap-2 rounded-lg">
                      <span className="font-display text-[15px] font-medium italic">
                        {v}
                      </span>
                      <span className="truncate font-mono text-[11px] text-muted-foreground">
                        {verbGlosses(v)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <MicroLabel>subject</MicroLabel>
            <SubjectPicker value={subject} onChange={handleSubjectChange} />
          </div>

          <div className="flex flex-col gap-2">
            <MicroLabel>direction</MicroLabel>
            <div
              role="group"
              aria-label="Card direction"
              className="flex items-center gap-1 rounded-xl border bg-secondary/60 p-1"
            >
              {(
                [
                  { key: "en", label: "en → es" },
                  { key: "es", label: "es → en" },
                ] as const
              ).map(({ key, label }) => {
                const active = direction === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setPrefs((p) => ({ ...p, direction: key }))
                    }
                    title={
                      key === "en"
                        ? "English on the front — recall the Spanish"
                        : "Spanish on the front — recall the English"
                    }
                    className={cn(
                      "inline-flex h-11 items-center rounded-lg px-3 font-mono text-xs outline-none transition-colors",
                      "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      active
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={handleShuffleToggle}
                  aria-pressed={shuffled}
                  className="h-11 rounded-xl px-4 font-mono text-xs uppercase tracking-[0.14em]"
                >
                  <Shuffle
                    className={cn("size-4", shuffled && "text-primary")}
                    aria-hidden="true"
                  />
                  {shuffled ? "shuffled" : "in order"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {shuffled
                  ? "Deck is shuffled — click for chart order"
                  : "Shuffle the 23 forms"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={handleRandomVerb}
                  className="h-11 rounded-xl px-4 font-mono text-xs uppercase tracking-[0.14em]"
                >
                  <Dices className="size-4" aria-hidden="true" />
                  random verb
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Jump to a random verb in the catalog
              </TooltipContent>
            </Tooltip>

            {/* review filter — only starred cards */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={handleReviewToggle}
                  aria-pressed={reviewOnly}
                  className={cn(
                    "h-11 gap-1.5 rounded-xl px-4 font-mono text-xs uppercase tracking-[0.14em]",
                    reviewOnly &&
                      "border-warn/50 bg-warn/10 text-warn hover:bg-warn/15",
                  )}
                >
                  <Star
                    className={cn(
                      "size-4",
                      reviewOnly && "fill-warn",
                    )}
                    aria-hidden="true"
                  />
                  {reviewOnly ? `en revisión · ${starredCount}` : "all cards"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {reviewOnly
                  ? "Review deck — only cards you starred with “no lo sabía”. Key R toggles."
                  : starredCount > 0
                    ? `Only study the ${starredCount} starred card${starredCount === 1 ? "" : "s"} (needs review)`
                    : "No starred cards yet — flip a card and grade yourself"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </Card>

      {/* ── the deck ── */}
      {row ? (
        <div className="flex flex-col gap-4">
          <div className="mx-auto w-full max-w-2xl">
            {/* counter + progress */}
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <p className="flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <Layers
                  className="size-3.5 text-primary/70"
                  aria-hidden="true"
                />
                tarjeta {current + 1} / {total} · {seenCount} vistas
                {starredCount > 0 && (
                  <span className="flex items-center gap-1 text-warn">
                    <Star className="size-3 fill-warn" aria-hidden="true" />
                    {starredCount}
                  </span>
                )}
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() =>
                      resetDeck({
                        reshuffle: shuffled,
                        filterReview: reviewOnly,
                        isStarredAt: (k) =>
                          Object.hasOwn(stars, cardStarKey(verb, subject, k)),
                      })
                    }
                    aria-label="reset the deck"
                    className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground/70 outline-none transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  back to the first card, clear progress
                </TooltipContent>
              </Tooltip>
            </div>

            {/* the flip card — 3D */}
            <div style={{ perspective: 1400 }}>
              <motion.div
                role="region"
                aria-label={`flashcard ${current + 1} of ${total} — ${row.labelEs}. space to flip`}
                className="relative w-full cursor-pointer"
                style={{ transformStyle: "preserve-3d" }}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.99 }}
                onClick={(e) => {
                  // inner buttons (escuchar, self-grade) act on their
                  // own — never let their clicks flip the card
                  if ((e.target as HTMLElement).closest("button")) return;
                  flip();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    if ((e.target as HTMLElement).closest("button")) return;
                    e.preventDefault();
                    flip();
                  }
                }}
                tabIndex={0}
              >
                <div
                  style={{ backfaceVisibility: "hidden" }}
                  aria-hidden={flipped}
                  inert={flipped}
                >
                  <CardFace
                    key={`front-${row.key}-${current}`}
                    row={row}
                    pronoun={pronoun}
                    kind="front"
                    direction={direction}
                    index={current + 1}
                    speaking={false}
                    supported={false}
                    onSpeak={() => {}}
                    starred={false}
                    onGrade={() => {}}
                  />
                </div>
                <div
                  className="absolute inset-0"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                  aria-hidden={!flipped}
                  inert={!flipped}
                >
                  <CardFace
                    key={`back-${row.key}-${current}`}
                    row={row}
                    pronoun={pronoun}
                    kind="back"
                    direction={direction}
                    index={current + 1}
                    speaking={speech.speaking}
                    supported={speech.supported}
                    onSpeak={speakCurrent}
                    starred={currentStarred}
                    onGrade={gradeCard}
                  />
                </div>
              </motion.div>
            </div>

            {/* nav row */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={prevCard}
                aria-label="previous card"
                className="h-11 gap-1.5 rounded-xl px-4 font-mono text-xs uppercase tracking-[0.14em] active:scale-95"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                prev
              </Button>
              <DeckRail
                order={order.map((i) => rows[i]?.key ?? "inf")}
                seen={seen}
                current={current}
                starredFlags={order.map((i) =>
                  rows[i] ? isStarred(rows[i].key) : false,
                )}
                onJump={goTo}
              />
              <Button
                variant="outline"
                onClick={nextCard}
                aria-label="next card"
                className="h-11 gap-1.5 rounded-xl px-4 font-mono text-xs uppercase tracking-[0.14em] active:scale-95"
              >
                next
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* keyboard hint */}
          <p className="text-center font-display text-[12px] italic text-muted-foreground/80">
            ← → traverse the deck · space flips
            {flipped ? " · y / n grades the card" : " the card"}
            {speech.supported ? " · s reads it aloud" : ""}
          </p>
        </div>
      ) : reviewOnly ? (
        <Card className="bg-dotted flex flex-col items-center gap-4 p-8 text-center sm:p-10">
          <span className="flex size-12 items-center justify-center rounded-full border border-warn/30 bg-warn/10 text-warn">
            <Star className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-xl font-semibold italic">
              nada en revisión
            </p>
            <p className="mx-auto mt-1.5 max-w-sm font-mono text-[11px] leading-relaxed text-muted-foreground">
              press “no lo sabía” on the cards that trip you up;
              they end up here for a focused second pass.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleReviewToggle}
            className="h-11 gap-1.5 rounded-xl px-4 font-mono text-xs uppercase tracking-[0.14em]"
          >
            <Layers className="size-4" aria-hidden="true" />
            study all cards
          </Button>
        </Card>
      ) : (
        <Card className="p-8 text-center font-mono text-xs text-muted-foreground">
          no card — pick a verb above.
        </Card>
      )}
    </div>
  );
}
