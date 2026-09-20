"use client";

// ─────────────────────────────────────────────────────────────
// Quiz screen — sticky stats strip (countdown ring / elapsed,
// score, streak, accuracy, end) + one question at a time with
// instant client-side checking, accent helper keys, prefetching
// of the next question and a timestamp-based (drift-free) clock.
// ─────────────────────────────────────────────────────────────

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
} from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CornerDownLeft,
  Flame,
  Languages,
  Loader2,
  RotateCw,
  Square,
  Volume2,
  WifiOff,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSpeech } from "@/hooks/use-speech";
import { Input } from "@/components/ui/input";

import { checkAnswer } from "@/lib/conjugator/checker";
import { SUBJECTS } from "@/lib/conjugator/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { AccentKeys } from "./accent-keys";
import { streakBurst } from "./celebrate";
import { TimerRing } from "./timer-ring";
import {
  MICRO,
  answerLang,
  fetchQuestionDetailed,
  formatCountdownMs,
  formatMs,
  kindLabel,
  type MissRecord,
  type Question,
  type QuestionKind,
  type QuizSettings,
  type SessionSummary,
  type TenseTally,
} from "./types";

type Phase = "asking" | "right" | "accent" | "wrong";

interface QuizScreenProps {
  initialQuestion: Question;
  /** true when the first question came from the local (offline)
   *  generator — shows the offline chip from the start */
  initialOffline?: boolean;
  settings: QuizSettings;
  /** chip label for focused drills ("miss drill · 3 verbs") — null for normal sessions */
  drillLabel?: string | null;
  onEnd: (summary: SessionSummary) => void;
  onEmptyEnd: () => void;
}

export function QuizScreen({
  initialQuestion,
  initialOffline = false,
  settings,
  drillLabel,
  onEnd,
  onEmptyEnd,
}: QuizScreenProps) {
  const timed = settings.mode === "timed";
  const totalTimeMs = settings.durationSec * 1000;
  const { toast } = useToast();

  // ── clock: timestamp math, 250ms tick, no drift ───────────
  const [startedAt] = useState(() => Date.now());
  const endAtRef = useRef(
    timed ? Date.now() + totalTimeMs : Number.POSITIVE_INFINITY
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const remainingMs = timed ? Math.max(0, endAtRef.current - now) : 0;
  const elapsedMs = now - startedAt;
  const danger = timed && remainingMs <= totalTimeMs * 0.2;

  // ── stats ──────────────────────────────────────────────────
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [accentWarnings, setAccentWarnings] = useState(0);
  const [misses, setMisses] = useState<MissRecord[]>([]);
  const totalElapsedRef = useRef(0);
  // per-tense answer counts — kept in a ref (rendered nowhere,
  // only folded into the final summary)
  const tallyRef = useRef<TenseTally>({});

  // ── question flow (current + prefetched next) ──────────────
  const [question, setQuestion] = useState<Question | null>(initialQuestion);
  const [nextQuestion, setNextQuestion] = useState<Question | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const questionStartRef = useRef(Date.now());
  /** offline flag of the prefetched next question — consumed by
   *  advance() together with the question itself */
  const nextOfflineRef = useRef(false);

  // ── offline state ─────────────────────────────────────────
  // tracks BOTH the browser's connection (online/offline events)
  // AND whether the last question actually came from the local
  // generator (the API can be unreachable even when "online")
  const [offlineQuestion, setOfflineQuestion] = useState(initialOffline);
  const [browserOffline, setBrowserOffline] = useState(false);

  useEffect(() => {
    setBrowserOffline(!navigator.onLine);
    const onOffline = () => setBrowserOffline(true);
    const onOnline = () => setBrowserOffline(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const showOffline = offlineQuestion || browserOffline;

  // ── answer flow ────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("asking");
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const shakeControls = useAnimationControls();

  // browser-native Spanish pronunciation (Web Speech API)
  const { speak, speaking, supported } = useSpeech();
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── end flow ───────────────────────────────────────────────
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);

  // latest-ref pattern — timers & effects always call the
  // freshest closures without re-subscribing listeners
  const advanceRef = useRef<() => void>(() => {});
  const finishRef = useRef<() => void>(() => {});

  const shake = () => {
    void shakeControls.start({
      x: [0, -12, 12, -8, 8, -5, 5, 0],
      transition: { duration: 0.45, ease: "easeInOut" },
    });
  };

  const loadQuestion = async () => {
    setQuestion(null);
    setFetchError(false);
    try {
      const { question: q, offline } = await fetchQuestionDetailed(settings);
      if (finishedRef.current) return;
      setQuestion(q);
      setOfflineQuestion(offline);
      questionStartRef.current = Date.now();
    } catch {
      if (finishedRef.current) return;
      setFetchError(true);
    }
  };

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setConfirmEnd(false);
    if (total === 0) {
      // nothing answered — nothing to save, straight back to setup
      onEmptyEnd();
      return;
    }
    setFinished(true);
    onEnd({
      mode: settings.mode,
      durationSec: timed
        ? settings.durationSec
        : Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      score,
      total,
      accuracy: score / total,
      bestStreak,
      avgMsPerQuestion: Math.round(totalElapsedRef.current / total),
      accentWarnings,
      misses: misses.slice(-50),
      tally: tallyRef.current,
    });
  };

  const advance = () => {
    if (finishedRef.current || !question) return;
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (timed && Date.now() >= endAtRef.current) {
      finish();
      return;
    }
    setPhase("asking");
    setInput("");
    const next = nextQuestion;
    if (next) {
      setNextQuestion(null);
      setQuestion(next);
      setOfflineQuestion(nextOfflineRef.current);
      questionStartRef.current = Date.now();
      return;
    }
    void loadQuestion();
  };

  const scheduleAdvance = (ms: number) => {
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      advanceRef.current();
    }, ms);
  };

  const recordMiss = (userAnswer: string) => {
    if (!question) return;
    setMisses((m) => [
      ...m,
      {
        verb: question.verb,
        subject: question.subject,
        tense: question.tense,
        kind: question.kind,
        given: question.promptMain,
        expected: question.displayAnswer,
        userAnswer,
      },
    ]);
  };

  /** count one answer toward its tense (correct or not), with
   *  the time spent on the question (powers per-tense timing) */
  const tallyAnswer = (correct: boolean, dtMs: number) => {
    if (!question) return;
    const prev = tallyRef.current[question.tense] ?? { c: 0, t: 0 };
    tallyRef.current = {
      ...tallyRef.current,
      [question.tense]: {
        c: prev.c + (correct ? 1 : 0),
        t: prev.t + 1,
        ms: (prev.ms ?? 0) + Math.max(0, Math.round(dtMs)),
      },
    };
  };

  /** streak milestone copy — fires at every multiple of 5 */
  const streakToast = (n: number) => {
    const description =
      n === 5
        ? "five in a row — ¡sigue así!"
        : n === 10
          ? "double digits — ¡en fuego!"
          : `${n} in a row — imparable`;
    toast({
      title: `¡racha de ${n}!`,
      description,
    });
    streakBurst(n);
  };

  const submit = () => {
    if (!question || phase !== "asking") return;
    const value = input.trim();
    if (!value) {
      shake(); // don't submit empty — shake instead
      return;
    }
    const dtMs = Date.now() - questionStartRef.current;
    totalElapsedRef.current += dtMs;
    setTotal((t) => t + 1);

    const result = checkAnswer(value, question.answers, answerLang(question.kind));
    if (result === "exact") {
      setScore((s) => s + 1);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setBestStreak((b) => Math.max(b, nextStreak));
      tallyAnswer(true, dtMs);
      setPhase("right");
      if (nextStreak >= 5 && nextStreak % 5 === 0) streakToast(nextStreak);
      scheduleAdvance(550);
    } else if (result === "accent") {
      // counts as correct, just nudge about the accents
      setScore((s) => s + 1);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setBestStreak((b) => Math.max(b, nextStreak));
      setAccentWarnings((w) => w + 1);
      tallyAnswer(true, dtMs);
      setPhase("accent");
      if (nextStreak >= 5 && nextStreak % 5 === 0) streakToast(nextStreak);
      scheduleAdvance(900);
    } else {
      setStreak(0);
      tallyAnswer(false, dtMs);
      setPhase("wrong");
      recordMiss(value);
      shake();
    }
  };

  const skip = () => {
    if (!question || phase !== "asking") return;
    const dtMs = Date.now() - questionStartRef.current;
    totalElapsedRef.current += dtMs;
    setTotal((t) => t + 1);
    setStreak(0);
    tallyAnswer(false, dtMs);
    setPhase("wrong");
    recordMiss("");
  };

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (phase === "asking") {
      // Don't let the submitting Enter reach the window listener that
      // advances after an answer — otherwise a wrong answer flashes
      // its feedback for a split second and skips ahead on its own.
      e.stopPropagation();
      submit();
    }
    // after an answer, Enter is handled by the window listener
  };

  const insertAccent = (ch: string) => {
    const el = inputRef.current;
    if (!el || phase !== "asking") return;
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? start;
    setInput(input.slice(0, start) + ch + input.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + ch.length;
      try {
        el.setSelectionRange(caret, caret);
      } catch {
        // selection not supported — focus is enough
      }
    });
  };

  // keep the latest closures on refs
  useEffect(() => {
    advanceRef.current = advance;
    finishRef.current = finish;
  });

  // auto-finish the moment the clock runs out
  useEffect(() => {
    if (!timed || remainingMs > 0) return;
    finishRef.current();
  }, [timed, remainingMs]);

  // prefetch the next question while the current one is on screen
  useEffect(() => {
    if (!question || nextQuestion || finishedRef.current) return;
    let cancelled = false;
    fetchQuestionDetailed(settings)
      .then(({ question: q, offline }) => {
        if (!cancelled && !finishedRef.current) {
          setNextQuestion(q);
          nextOfflineRef.current = offline;
        }
      })
      .catch(() => {
        // silent — advance() falls back to a direct fetch + retry UI
      });
    return () => {
      cancelled = true;
    };
  }, [question, nextQuestion, settings]);

  // Enter advances after an answer (input is read-only then and
  // may have lost focus, so listen on the window)
  useEffect(() => {
    if (phase === "asking" || confirmEnd) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      advanceRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, confirmEnd]);

  // refocus the answer input whenever a new question arrives
  useEffect(() => {
    if (phase === "asking" && question) {
      inputRef.current?.focus();
    }
  }, [phase, question]);

  // clear pending auto-advance on unmount
  useEffect(
    () => () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    },
    []
  );

  const accuracyLabel =
    total > 0 ? `${Math.round((score / total) * 100)}%` : "—";

  // what can be spoken aloud — Spanish content only:
  // before answering, the prompt (verb / Spanish phrase); after
  // answering, the correct Spanish form where there is one
  const speechTarget = !question
    ? null
    : phase === "asking"
      ? question.kind === "translate-en-es"
        ? null
        : question.promptMain
      : question.kind === "translate-es-en"
        ? null
        : question.displayAnswer;

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* ── sticky stats strip ── */}
      <div className="sticky top-16 z-30">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border bg-card/90 px-4 py-2.5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-4 sm:gap-6">
            {timed ? (
              <div className="flex items-center gap-2.5">
                <TimerRing
                  remainingMs={remainingMs}
                  totalMs={totalTimeMs}
                />
                <div>
                  <p className={MICRO}>time left</p>
                  <p
                    className={cn(
                      "font-mono text-base font-medium leading-none tabular-nums",
                      danger && "animate-pulse text-destructive"
                    )}
                  >
                    {formatCountdownMs(remainingMs)}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className={MICRO}>elapsed</p>
                <p className="font-mono text-base font-medium leading-none tabular-nums">
                  {formatMs(elapsedMs)}
                </p>
              </div>
            )}
            <div>
              <p className={MICRO}>questions</p>
              <p className="font-mono text-base font-medium leading-none tabular-nums">
                {total}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div>
              <p className={MICRO}>score</p>
              <p className="font-mono text-base font-medium leading-none tabular-nums">
                {score}
              </p>
            </div>
            <div>
              <p className={MICRO}>streak</p>
              <div className="flex items-center gap-1">
                <motion.span
                  key={`flame-${streak}`}
                  initial={streak > 0 ? { scale: 1.6 } : false}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  className="inline-flex"
                >
                  <Flame
                    className={cn(
                      "size-4",
                      streak >= 5
                        ? "animate-pulse text-primary"
                        : streak > 0
                          ? "text-primary"
                          : "text-muted-foreground/60"
                    )}
                    aria-hidden="true"
                  />
                </motion.span>
                <span
                  className={cn(
                    "font-mono text-base font-medium leading-none tabular-nums",
                    streak >= 5 && "text-primary"
                  )}
                >
                  {streak}
                </span>
              </div>
            </div>
            <div>
              <p className={MICRO}>acc</p>
              <p
                className={cn(
                  "font-mono text-base font-medium leading-none tabular-nums",
                  total >= 5 &&
                    (score / total >= 0.8
                      ? "text-success"
                      : score / total < 0.5
                        ? "text-destructive"
                        : "text-primary")
                )}
              >
                {accuracyLabel}
              </p>
            </div>
            <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 gap-1.5 px-3.5"
                  aria-label="end session"
                >
                  <Square className="size-3.5" aria-hidden="true" />
                  end
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>finish early?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {total > 0
                      ? "your session will be saved and your results will appear."
                      : "no questions answered yet! nothing will be saved."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>keep going</AlertDialogCancel>
                  <AlertDialogAction onClick={() => finish()}>
                    finish
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* offline banner — the browser lost its connection or the
            questions are being generated locally (PWA offline) */}
        <AnimatePresence>
          {showOffline && (
            <motion.div
              key="offline"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <p
                className="flex items-center gap-1.5 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/90"
                role="status"
              >
                <WifiOff
                  className="size-3.5 shrink-0 text-warn"
                  aria-hidden="true"
                />
                offline — questions generated on your device, nothing
                is lost
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── question area ── */}
      <div className="mt-5 sm:mt-6">
        <AnimatePresence mode="wait">
          {finished ? (
            <motion.div
              key="finished"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="items-center gap-3 rounded-2xl py-16">
                <Loader2
                  className="size-7 animate-spin text-primary"
                  aria-hidden="true"
                />
                <p className="font-display text-lg italic text-muted-foreground">
                  saving session…
                </p>
              </Card>
            </motion.div>
          ) : question ? (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: 44 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{
                opacity: 0,
                x: -20,
                transition: { duration: 0.12, ease: "easeIn" },
              }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Card className="gap-0 rounded-2xl p-5 shadow-sm sm:p-8">
                {/* chips + kind icon */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {drillLabel && (
                    <span className="rounded-full border border-accent bg-accent px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-accent-foreground sm:text-xs">
                      {drillLabel}
                    </span>
                  )}
                  <KindIcon kind={question.kind} />
                  {chipsFor(question).map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border bg-card px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:text-xs"
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                {/* the star of the screen */}
                <h2 className="mx-auto max-w-2xl break-words px-2 py-7 text-center font-display text-4xl font-medium leading-[1.08] tracking-tight text-balance sm:py-9 sm:text-5xl lg:text-6xl">
                  {question.promptMain}
                </h2>

                {/* hear it — browser speech, Spanish content only */}
                {supported && speechTarget && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => speak(speechTarget)}
                      title="hear it in Spanish"
                      aria-label="hear it in Spanish"
                      className={cn(
                        "flex h-10 items-center gap-1.5 rounded-full border px-3.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
                        speaking
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border/70 text-muted-foreground hover:border-primary/40 hover:text-primary"
                      )}
                    >
                      <Volume2
                        className={cn("size-3.5", speaking && "animate-pulse")}
                        aria-hidden="true"
                      />
                      escuchar
                    </button>
                  </div>
                )}

                {/* answer input + submit */}
                <motion.div
                  animate={shakeControls}
                  className="mx-auto flex w-full max-w-xl items-center gap-2"
                >
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    readOnly={phase !== "asking"}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    autoFocus
                    aria-label="your answer"
                    placeholder="type your answer…"
                    className={cn(
                      "h-14 rounded-xl px-4 text-center text-2xl transition-colors duration-300 md:text-2xl",
                      "placeholder:font-display placeholder:italic placeholder:text-muted-foreground/60",
                      "focus-visible:ring-[2px]",
                      phase === "right" &&
                        "border-success bg-success/5 focus-visible:ring-success/30",
                      phase === "accent" &&
                        "border-warn bg-warn/5 focus-visible:ring-warn/30",
                      phase === "wrong" &&
                        "border-destructive bg-destructive/5 focus-visible:ring-destructive/30"
                    )}
                  />
                  <Button
                    type="button"
                    aria-label="submit answer"
                    onClick={submit}
                    disabled={phase !== "asking"}
                    className="h-14 w-14 shrink-0 rounded-xl"
                  >
                    <ArrowRight className="size-5" aria-hidden="true" />
                  </Button>
                </motion.div>

                {/* feedback line */}
                <div
                  role="status"
                  aria-live="polite"
                  className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 pt-4 text-center"
                >
                  {phase === "right" && (
                    <motion.p
                      key="right"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 20,
                      }}
                      className="font-display text-3xl italic text-success"
                    >
                      ¡correcto!
                    </motion.p>
                  )}
                  {phase === "accent" && (
                    <p className="font-mono text-sm text-warn sm:text-base">
                      so close — accents:{" "}
                      <span className="font-semibold">
                        {question.displayAnswer}
                      </span>
                    </p>
                  )}
                  {phase === "wrong" && (
                    <>
                      <p className="font-display text-2xl font-medium sm:text-3xl">
                        <span className="text-muted-foreground">answer: </span>
                        {question.displayAnswer}
                      </p>
                      <p className={MICRO}>press enter to continue</p>
                    </>
                  )}
                </div>

                {/* accent keys + skip / continue */}
                <div className="space-y-4">
                  <AccentKeys
                    onInsert={insertAccent}
                    disabled={phase !== "asking"}
                  />
                  {phase === "asking" ? (
                    <div className="flex items-center justify-between gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={skip}
                        className="h-11 px-3 text-xs text-muted-foreground hover:text-foreground"
                      >
                        skip →
                      </Button>
                      <p
                        className={cn(MICRO, "flex items-center gap-1.5")}
                        aria-hidden="true"
                      >
                        <CornerDownLeft className="size-3.5" />
                        enter to submit
                      </p>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => advanceRef.current()}
                        className="h-11 gap-2 px-6"
                      >
                        continue
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ) : fetchError ? (
            <motion.div
              key="fetch-error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="items-center gap-4 rounded-2xl px-6 py-16 text-center shadow-sm">
                <p className="font-display text-2xl">connection hiccup</p>
                <p className="text-sm text-muted-foreground">
                  couldn&apos;t load the next question
                </p>
                <Button
                  variant="outline"
                  className="h-11 gap-2"
                  onClick={() => void loadQuestion()}
                >
                  <RotateCw className="size-4" aria-hidden="true" />
                  retry
                </Button>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="loading-question"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="items-center gap-3 rounded-2xl py-20 shadow-sm">
                <Loader2
                  className="size-7 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
                <p className={MICRO}>loading question…</p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────

function chipsFor(q: Question): string[] {
  const tense = q.tenseLabelEs;
  if (q.kind === "conjugation") {
    const pronoun = q.subject
      ? SUBJECTS.find((s) => s.key === q.subject)?.pronoun
      : null;
    return pronoun ? [pronoun, tense] : [tense];
  }
  return [kindLabel(q.kind), tense];
}

function KindIcon({ kind, className }: { kind: QuestionKind; className?: string }) {
  const Icon =
    kind === "conjugation"
      ? Languages
      : kind === "translate-es-en"
        ? ArrowRight
        : ArrowLeft;
  return (
    <Icon
      className={cn("size-4 shrink-0 text-muted-foreground/70", className)}
      aria-hidden="true"
    />
  );
}
