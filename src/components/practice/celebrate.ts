import confetti from "canvas-confetti";

// warm editorial palette — brick, saffron, olive, cream
export const CONFETTI_COLORS = ["#b03d2c", "#d9a441", "#5c8a4e", "#e8d5b5"];

/**
 * Streak-milestone confetti — scale grows with the streak.
 * All bursts are reduced-motion aware and best-effort (never throw).
 */
export function streakBurst(streak: number): void {
  try {
    if (streak < 5) return;
    if (streak === 5) {
      void confetti({
        particleCount: 40,
        spread: 70,
        startVelocity: 32,
        origin: { x: 0.5, y: 0.9 },
        gravity: 0.9,
        colors: CONFETTI_COLORS,
        disableForReducedMotion: true,
        zIndex: 60,
      });
      return;
    }
    if (streak === 10) {
      // double side cannons
      for (const angle of [60, 120] as const) {
        void confetti({
          particleCount: 55,
          spread: 60,
          angle,
          origin: { x: angle === 60 ? 0 : 1, y: 0.95 },
          gravity: 0.9,
          colors: CONFETTI_COLORS,
          disableForReducedMotion: true,
          zIndex: 60,
        });
      }
      return;
    }
    // 15, 20, … — the works
    for (const angle of [60, 120] as const) {
      void confetti({
        particleCount: 80,
        spread: 65,
        startVelocity: 45,
        angle,
        origin: { x: angle === 60 ? 0 : 1, y: 0.95 },
        gravity: 0.9,
        colors: CONFETTI_COLORS,
        disableForReducedMotion: true,
        zIndex: 60,
      });
    }
    setTimeout(() => {
      try {
        void confetti({
          particleCount: 50,
          spread: 100,
          startVelocity: 28,
          origin: { x: 0.5, y: 0.85 },
          gravity: 0.9,
          colors: CONFETTI_COLORS,
          disableForReducedMotion: true,
          zIndex: 60,
        });
      } catch {
        // best effort
      }
    }, 180);
  } catch {
    // confetti is best-effort — never block the quiz
  }
}
