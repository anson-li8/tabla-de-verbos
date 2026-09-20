"use client";

// ─────────────────────────────────────────────────────────────
// InstallHint — dismissible PWA install banner. Captures the
// browser's beforeinstallprompt event (Chrome/Edge/Android) and
// offers a one-tap install. Dismissal is remembered in
// localStorage so it never nags twice. Renders nothing on
// browsers that never fire the event (Safari/iOS, Firefox).
// ─────────────────────────────────────────────────────────────

import { AnimatePresence, motion } from "framer-motion";
import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const DISMISS_KEY = "tdv-install-dismissed";

/** minimal shape of the beforeinstallprompt event we rely on */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallHint() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      const candidate = event as InstallPromptEvent;
      if (typeof candidate.prompt !== "function") return;
      event.preventDefault();
      setDeferred(candidate);
    };
    const onInstalled = () => setDeferred(null); // app installed — stop offering
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setDeferred(null);
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      // outcome is informational only — accepted/dismissed both end here
      await deferred.userChoice.catch(() => undefined);
    } catch {
      // prompt() can only be called once — a failure just hides the banner
    }
    setDeferred(null);
  };

  return (
    <AnimatePresence>
      {deferred && (
        <motion.div
          key="install-hint"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              <Download
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="min-w-0 truncate text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  Instala Tabla de Verbos!
                </span>{" "}
                practice offline, full-screen, right from your home screen
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                onClick={() => void install()}
                className="h-8 gap-1.5 rounded-lg px-3.5 text-xs font-semibold"
              >
                <Download className="size-3.5" aria-hidden="true" />
                Instalar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={dismiss}
                aria-label="dismiss the install hint"
                className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
