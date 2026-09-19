"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { HelpDialog } from "@/components/app/help-dialog";
import { InstallHint } from "@/components/app/install-hint";
import { LogoMark } from "@/components/app/logo-mark";
import { ModeSwitcher, type AppMode } from "@/components/app/mode-switcher";
import { ThemeToggle } from "@/components/app/theme-toggle";
import FlashcardsMode from "@/components/cards/flashcards-mode";
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
  const [helpOpen, setHelpOpen] = useState(false);

  const handleQuizVerb = (verb: string) => {
    setQuizVerb(verb);
    setMode("practice");
  };

  // keyboard shortcuts: 1 / 2 / 3 (or T / P / C) jump between modes,
  // ? opens the cheatsheet — ignored while typing in an input, using
  // modifiers, or when a dialog is open
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
      if (
        document.querySelector(
          "[role=alertdialog][data-state=open], [role=dialog][data-state=open], [data-radix-popper-content-wrapper]"
        )
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "1" || key === "t") setMode("tables");
      else if (key === "2" || key === "p") setMode("practice");
      else if (key === "3" || key === "c") setMode("cards");
      else if (e.key === "?") setHelpOpen(true);
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
            <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* PWA install hint (only when the browser offers it) */}
      <InstallHint />

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
            ) : mode === "cards" ? (
              <FlashcardsMode />
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
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-1.5 px-4 py-4 sm:flex-row sm:px-6">
          <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground">
            {ALL_VERBS.length} verbs · {TENSE_ROWS.length} forms ·{" "}
            {SUBJECTS.length} subjects
          </p>
          <p className="font-display text-[12px] italic text-muted-foreground/80">
            <span className="hidden sm:inline">press 1 / 2 / 3 to switch modes · </span>
            <span className="hidden md:inline">arrows + enter to fill the chart · </span>
            <span>? for shortcuts · </span>
            accents count
          </p>
        </div>
      </footer>
    </div>
  );
}
