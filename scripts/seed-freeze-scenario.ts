import { db } from "../src/lib/db";

// Seed the freeze scenario: practiced 2 and 3 days ago, missed
// yesterday, nothing today → freezeOffer should be true and the
// racha (without a freeze) counts only 2 days.
async function main() {
  const day = 86_400_000;
  const now = Date.now();
  const plan: [number, number, number][] = [
    [2, 12, 10],
    [3, 18, 15],
    [4, 20, 17],
  ];
  for (const [daysAgo, total, score] of plan) {
    await db.practiceSession.create({
      data: {
        mode: "timed",
        durationSec: 60,
        score,
        total,
        accuracy: score / total,
        bestStreak: 5,
        avgMsPerQuestion: 3200,
        accentWarnings: 0,
        misses: "[]",
        tally: JSON.stringify({ pres: { c: score, t: total, ms: 3200 * total } }),
        createdAt: new Date(now - daysAgo * day - 3 * 3_600_000),
      },
    });
  }
  console.log("seeded freeze scenario: practiced day-2/3/4, missed yesterday");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
