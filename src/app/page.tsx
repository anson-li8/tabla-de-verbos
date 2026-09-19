"use client";

import { useState } from "react";
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
            {mode === "tables" ? <TablesMode /> : <PracticeMode />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-1.5 px-4 py-4 font-mono text-[11px] text-muted-foreground sm:flex-row sm:px-6">
          <p>
            {ALL_VERBS.length} verbs · {TENSE_ROWS.length} forms ·{" "}
            {SUBJECTS.length} subjects
          </p>
          <p>enter to advance · accents count</p>
        </div>
      </footer>
    </div>
  );
}
