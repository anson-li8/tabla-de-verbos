"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Check, Dices, Eraser, Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  ALL_VERBS,
  SP5_VERBS,
  SP6_VERBS,
  SUBJECTS,
  SUBJECT_KEYS,
  TENSE_ROWS,
  type RowKey,
  type SubjectKey,
} from "@/lib/conjugator/types";
import { cn } from "@/lib/utils";

import { ConjugationChart } from "./conjugation-chart";
import { SubjectPicker } from "./subject-picker";
import { VerbOfDay } from "./verb-of-day";
import {
  MASTERY_THRESHOLD,
  useCellMastery,
} from "./use-cell-mastery";
import type {
  AnswersMap,
  CellLang,
  CheckApiResponse,
  ConjugateApiResponse,
  LevelFilter,
  RevealData,
  VerdictsMap,
} from "./types";
import { VerbPicker } from "./verb-picker";
import { VerbProfile } from "./verb-profile";

const STORAGE_KEY = "tdv-tables";
const LEVEL_OPTIONS = ["all", 5, 6] as const;

function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  );
}

interface PersistedState {
  verb: string;
  subject: SubjectKey;
  level: LevelFilter;
  answers: AnswersMap;
}

interface TablesModeProps {
  /** hand a verb to Practice mode for a focused quiz ("quiz me") */
  onQuizVerb?: (verb: string) => void;
}

export default function TablesMode({ onQuizVerb }: TablesModeProps) {
  const { toast } = useToast();

  const [verb, setVerb] = useState("hablar");
  const [subject, setSubject] = useState<SubjectKey>("yo");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [verdicts, setVerdicts] = useState<VerdictsMap>({});
  const [revealMode, setRevealMode] = useState(false);
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const checkPulse = useAnimationControls();

  // ── per-cell mastery (localStorage) ─────────────────────
  const { mastery, recordVerdicts } = useCellMastery();
  // rows with BOTH cells mastered for the current verb+subject
  const masteredRows = new Set<RowKey>();
  let masteredCount = 0;
  for (const row of TENSE_ROWS) {
    const es = mastery[`${verb}|${subject}|${row.key}|es`];
    const en = mastery[`${verb}|${subject}|${row.key}|en`];
    if (
      es &&
      en &&
      es.c >= MASTERY_THRESHOLD &&
      en.c >= MASTERY_THRESHOLD
    ) {
      masteredRows.add(row.key);
      masteredCount++;
    }
  }

  // ── hydrate persisted state ─────────────────────────────────
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PersistedState>;
        if (
          typeof saved.verb === "string" &&
          ALL_VERBS.includes(saved.verb)
        ) {
          setVerb(saved.verb);
        }
        if (
          typeof saved.subject === "string" &&
          (SUBJECT_KEYS as string[]).includes(saved.subject)
        ) {
          setSubject(saved.subject as SubjectKey);
        }
        if (
          saved.level === "all" ||
          saved.level === 5 ||
          saved.level === 6
        ) {
          setLevel(saved.level);
        }
        if (saved.answers && typeof saved.answers === "object") {
          const clean: AnswersMap = {};
          for (const row of TENSE_ROWS) {
            const cell = saved.answers[row.key];
            if (
              cell &&
              typeof cell === "object" &&
              typeof cell.es === "string" &&
              typeof cell.en === "string"
            ) {
              clean[row.key] = { es: cell.es, en: cell.en };
            }
          }
          setAnswers(clean);
        }
      }
    } catch {
      // corrupted payload — fall back to defaults
    }
    setHydrated(true);
  }, []);

  // ── persist state ───────────────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    try {
      const state: PersistedState = { verb, subject, level, answers };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable — practice without persistence
    }
  }, [hydrated, verb, subject, level, answers]);

  // ── check answers ───────────────────────────────────────────
  const handleCheck = useCallback(async () => {
    if (checking || revealMode) return;
    setChecking(true);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verb, subject, answers }),
      });
      if (!res.ok) throw new Error(`Request failed with ${res.status}`);
      const data = (await res.json()) as CheckApiResponse;
      setVerdicts(data.verdicts ?? {});
      // fold the fresh verdicts into the mastery map
      recordVerdicts(
        verb,
        subject,
        Object.entries(data.verdicts ?? {}).flatMap(([row, cell]) => {
          const cells: {
            row: string;
            lang: string;
            correct: boolean;
            accentOnly?: boolean;
          }[] = [];
          if (cell?.es) {
            cells.push({
              row,
              lang: "es",
              correct: cell.es.correct,
              accentOnly: cell.es.accentOnly,
            });
          }
          if (cell?.en) {
            cells.push({
              row,
              lang: "en",
              correct: cell.en.correct,
            });
          }
          return cells;
        })
      );
      const correct = data.summary?.correctCells ?? 0;
      const total = data.summary?.totalCells ?? 0;
      const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
      const TOTAL_CELLS = 46; // 23 forms × 2 languages
      if (total === TOTAL_CELLS && correct === total) {
        toast({
          title: "¡Perfecto!",
          description: "All 46 cells correct — bien hecho.",
        });
        void checkPulse.start({
          scale: [1, 1.06, 1],
          transition: { duration: 0.4, ease: "easeOut" },
        });
      } else if (total > 0 && correct === total) {
        toast({
          title: "Flawless so far",
          description: `${correct} / ${total} filled cells correct — ${percent}%. Fill all ${TOTAL_CELLS} for a perfect score.`,
        });
      } else {
        toast({
          title: "Chart checked",
          description: `${correct} / ${total} filled cells correct — ${percent}%`,
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Couldn't reach the server",
        description: "Your answers are safe — try checking again in a moment.",
      });
    } finally {
      setChecking(false);
    }
  }, [checking, revealMode, verb, subject, answers, toast, checkPulse, recordVerdicts]);

  // ── reveal mode: fetch the reference chart ─────────────────
  useEffect(() => {
    if (!revealMode) return;
    let cancelled = false;
    setRevealing(true);
    const load = async () => {
      try {
        const res = await fetch("/api/conjugate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verb, subject }),
        });
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        const data = (await res.json()) as ConjugateApiResponse;
        if (cancelled) return;
        const map: RevealData = {};
        for (const row of data.rows ?? []) {
          map[row.key] = {
            spanish: Array.isArray(row.spanish) ? row.spanish : [],
            english: Array.isArray(row.english) ? row.english : [],
          };
        }
        setRevealData(map);
        setRevealKey(`${verb}:${subject}`);
      } catch {
        if (!cancelled) {
          toast({
            variant: "destructive",
            title: "Couldn't reach the server",
            description:
              "Couldn't load the reference chart — try again in a moment.",
          });
          setRevealMode(false);
        }
      } finally {
        if (!cancelled) setRevealing(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [revealMode, verb, subject, toast]);

  // ── answer edits ────────────────────────────────────────────
  const handleAnswerChange = useCallback(
    (key: RowKey, lang: CellLang, value: string) => {
      setAnswers((prev) => ({
        ...prev,
        [key]: { es: prev[key]?.es ?? "", en: prev[key]?.en ?? "", [lang]: value },
      }));
      // editing a cell invalidates only that cell's verdict
      setVerdicts((prev) => {
        const cell = prev[key];
        if (!cell || !cell[lang]) return prev;
        const nextCell = { ...cell };
        delete nextCell[lang];
        const next = { ...prev };
        if (Object.keys(nextCell).length === 0) delete next[key];
        else next[key] = nextCell;
        return next;
      });
    },
    []
  );

  // ── selection changes (fresh chart → clear answers) ─────────
  const handleVerbChange = useCallback((next: string) => {
    setVerb(next);
    setAnswers({});
    setVerdicts({});
  }, []);

  const handleSubjectChange = useCallback(
    (next: SubjectKey) => {
      if (next === subject) return;
      setSubject(next);
      setAnswers({});
      setVerdicts({});
    },
    [subject]
  );

  const handleClear = useCallback(() => {
    setAnswers({});
    setVerdicts({});
  }, []);

  const handleRandom = useCallback(() => {
    const pool =
      level === "all" ? ALL_VERBS : level === 5 ? SP5_VERBS : SP6_VERBS;
    const nextVerb = pool[Math.floor(Math.random() * pool.length)];
    const nextSubject =
      SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)].key;
    setVerb(nextVerb);
    setSubject(nextSubject);
    setAnswers({});
    setVerdicts({});
  }, [level]);

  const handleRevealToggle = useCallback(() => {
    setRevealMode((prev) => !prev);
  }, []);

  // reveal answers are only valid for the current verb+subject
  const effectiveRevealData =
    revealKey === `${verb}:${subject}` ? revealData : null;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* ── verb of the day spotlight ── */}
      <VerbOfDay
        current={verb}
        onPick={handleVerbChange}
        onQuiz={(v) => onQuizVerb?.(v)}
      />

      {/* ── controls ── */}
      <Card className="bg-dotted gap-0 p-4 sm:p-6">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <div className="flex min-w-[200px] flex-1 flex-col gap-2 sm:flex-none">
            <MicroLabel>verb</MicroLabel>
            <VerbPicker value={verb} level={level} onChange={handleVerbChange} />
          </div>

          <div className="flex flex-col gap-2">
            <MicroLabel>subject</MicroLabel>
            <SubjectPicker value={subject} onChange={handleSubjectChange} />
          </div>

          <div className="flex flex-col gap-2">
            <MicroLabel>level</MicroLabel>
            <div
              role="group"
              aria-label="Verb level filter"
              className="flex items-center gap-1 rounded-xl border bg-secondary/60 p-1"
            >
              {LEVEL_OPTIONS.map((option) => {
                const active = level === option;
                return (
                  <button
                    key={String(option)}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setLevel(option)}
                    className={cn(
                      "inline-flex h-11 items-center rounded-lg px-3 font-mono text-xs outline-none transition-colors",
                      "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      active
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {option === "all" ? "all" : `sp ${option}`}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.span
                  animate={checkPulse}
                  className="inline-flex rounded-xl"
                >
                  <Button
                    onClick={handleCheck}
                    disabled={checking || revealMode}
                    className="h-11 rounded-xl px-5 font-mono text-xs uppercase tracking-[0.14em]"
                  >
                    {checking ? (
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Check className="size-4" aria-hidden="true" />
                    )}
                    check
                  </Button>
                </motion.span>
              </TooltipTrigger>
              <TooltipContent>
                Fill the chart, then check. Green = correct.
              </TooltipContent>
            </Tooltip>

            <Button
              variant="outline"
              onClick={handleClear}
              className="h-11 rounded-xl px-4 font-mono text-xs uppercase tracking-[0.14em]"
            >
              <Eraser className="size-4" aria-hidden="true" />
              clear
            </Button>

            <Button
              variant="outline"
              onClick={handleRevealToggle}
              disabled={revealing}
              aria-pressed={revealMode}
              className={cn(
                "h-11 rounded-xl px-4 font-mono text-xs uppercase tracking-[0.14em]",
                revealMode &&
                  "border-accent-foreground/30 bg-accent text-accent-foreground hover:bg-accent/80"
              )}
            >
              {revealing ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : revealMode ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
              {revealMode ? "hide" : "reveal"}
            </Button>

            <Button
              variant="outline"
              onClick={handleRandom}
              className="h-11 rounded-xl px-4 font-mono text-xs uppercase tracking-[0.14em]"
            >
              <Dices className="size-4" aria-hidden="true" />
              random
            </Button>
          </div>
        </div>
      </Card>

      {/* ── verb profile strip ── */}
      <VerbProfile verb={verb} />

      {/* ── the chart ── */}
      <ConjugationChart
        verb={verb}
        subject={subject}
        answers={answers}
        verdicts={verdicts}
        revealMode={revealMode}
        revealData={effectiveRevealData}
        masteredRows={masteredRows}
        masteredCount={masteredCount}
        onAnswerChange={handleAnswerChange}
        onRequestCheck={handleCheck}
      />
    </div>
  );
}
