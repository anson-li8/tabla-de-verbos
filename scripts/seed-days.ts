import { db } from "../src/lib/db";

// seed sessions across the past ~2 months to light up the heatmap
async function main() {
  const now = Date.now();
  const day = 86_400_000;
  // [daysAgo, total, score, streak]
  const plan: [number, number, number, number][] = [
    [0, 12, 10, 6], [0, 8, 7, 4],
    [1, 22, 18, 9], [1, 15, 12, 5],
    [2, 30, 24, 11],
    [3, 18, 15, 7],
    [5, 25, 20, 8],
    [6, 40, 32, 14],
    [8, 11, 9, 4],
    [9, 27, 22, 10],
    [12, 16, 13, 6],
    [14, 35, 28, 12],
    [17, 9, 7, 3],
    [19, 21, 17, 8],
    [22, 28, 23, 10],
    [26, 13, 10, 5],
    [30, 19, 15, 7],
    [35, 44, 36, 15],
    [41, 17, 14, 6],
    [48, 26, 21, 9],
    [55, 14, 11, 5],
  ];
  for (const [daysAgo, total, score, streak] of plan) {
    await db.practiceSession.create({
      data: {
        mode: daysAgo % 3 === 0 ? "infinite" : "timed",
        durationSec: 120,
        score,
        total,
        accuracy: score / total,
        bestStreak: streak,
        avgMsPerQuestion: 3000 + (daysAgo * 137) % 4000,
        accentWarnings: daysAgo % 4,
        misses: JSON.stringify(
          Array.from({ length: total - score }, (_, i) => ({
            verb: ["hablar", "caer", "tener", "ir"][i % 4],
            subject: "yo",
            tense: "pret",
            kind: "conjugation",
            given: "prompt",
            expected: "answer",
            userAnswer: "wrong",
          }))
        ),
        tally: JSON.stringify({
          pres: { c: Math.floor(score * 0.6), t: Math.floor(total * 0.6) },
          pret: { c: Math.floor(score * 0.25), t: Math.floor(total * 0.3) },
          imp: { c: Math.floor(score * 0.15), t: Math.floor(total * 0.1) },
        }),
        createdAt: new Date(now - daysAgo * day + 3 * 3600_000),
      },
    });
  }
  const count = await db.practiceSession.count();
  console.log("seeded, total sessions:", count);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
