"use client";

// ─────────────────────────────────────────────────────────────
// SwRegister — installs the offline-shell service worker after
// first paint (non-blocking, silent failures: the SW is a
// progressive enhancement, never a dependency).
// ─────────────────────────────────────────────────────────────

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // best effort — offline shell stays unavailable
      });
    };
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
