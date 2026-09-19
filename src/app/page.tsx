"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { LogoMark } from "@/components/app/logo-mark";
import { ModeSwitcher, type AppMode } from "@/components/app/mode-switcher";
import { ThemeToggle } from "@/components/app/theme-toggle";
import PracticeMode from "@/components/practice/practice-mode";
import TablesMode from "@/components/tables/tables-mode";
import {
  ALL_VERBS,
  SUBJECTS,
  TENSE_ROWS,
} from "@/lib/conjugator/types";

export default function Home() {
  const [mode, setMode] = useState<AppMode>("tables");
  // a verb handed from Tables mode ("quiz me") to Practice mode —
  // consumed once by PracticeMode on mount/prop change
  const [quizVerb, setQuizVerb] = useState<string | null>(null);

  const handleQuizVerb = (verb: string) => {
    setQuizVerb(verb);
    setMode("practice");
  };

  // keyboard shortcuts: 1 / 2 (or T / P) jump between modes — ignored while
  // typing in an input, using modifiers, or when a dialog is open
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
      if (document.querySelector("[role=alertdialog][data-state=open]")) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "1" || key === "t") setMode("tables");
      else if (key === "2" || key === "p") setMode("practice");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark className="size-9 shrink-0" />
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold italic leading-none tracking-tight">
                Tabla de Verbos
              </h1>
              <p className="mt-1 hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
                spanish verb mastery
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ModeSwitcher mode={mode} onModeChange={setMode} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {mode === "tables" ? (
              <TablesMode onQuizVerb={handleQuizVerb} />
            ) : (
              <PracticeMode
                quizVerb={quizVerb}
                onQuizVerbConsumed={() => setQuizVerb(null)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-1.5 px-4 py-4 font-mono text-[11px] text-muted-foreground sm:flex-row sm:px-6">
          <p>
            {ALL_VERBS.length} verbs · {TENSE_ROWS.length} forms ·{" "}
            {SUBJECTS.length} subjects
          </p>
          <p>
            <span className="hidden sm:inline">press 1 / 2 to switch modes · </span>
            enter to advance · accents count
          </p>
        </div>
      </footer>
    </div>
  );
}
