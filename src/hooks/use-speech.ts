"use client";

// ─────────────────────────────────────────────────────────────
// useSpeech — browser-native Spanish pronunciation via the
// Web Speech API (speechSynthesis). No network, no credentials;
// picks the best available Spanish voice and degrades silently.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";

/** true when the browser exposes speechSynthesis (nearly all do) */
export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickSpanishVoice(): SpeechSynthesisVoice | null {
  try {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    return (
      voices.find((v) => v.lang === "es-ES") ??
      voices.find((v) => v.lang?.toLowerCase().startsWith("es")) ??
      null
    );
  } catch {
    return null;
  }
}

export interface UseSpeechResult {
  /** speak Spanish text (cancels anything already speaking) */
  speak: (text: string) => void;
  /** true while an utterance is in flight (for button feedback) */
  speaking: boolean;
  /** false when speechSynthesis is unavailable — hide the UI */
  supported: boolean;
}

export function useSpeech(): UseSpeechResult {
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const supported = speechSupported();

  // voices load asynchronously in most browsers — refresh the pick
  // whenever the list changes
  useEffect(() => {
    if (!supported) return;
    const refresh = () => {
      voiceRef.current = pickSpanishVoice();
    };
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", refresh);
      try {
        window.speechSynthesis.cancel();
      } catch {
        // best effort
      }
    };
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      const clean = text.trim().slice(0, 300);
      if (!clean) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(clean);
        utter.lang = "es-ES";
        utter.rate = 0.92; // a touch slower for learners
        const voice = voiceRef.current ?? pickSpanishVoice();
        if (voice) utter.voice = voice;
        utter.onstart = () => setSpeaking(true);
        utter.onend = () => setSpeaking(false);
        utter.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utter);
        // some engines never fire onstart — don't strand the state
        setTimeout(() => setSpeaking(false), 4000);
      } catch {
        // speech is a bonus — never break the app over it
      }
    },
    [supported]
  );

  return { speak, speaking, supported };
}
