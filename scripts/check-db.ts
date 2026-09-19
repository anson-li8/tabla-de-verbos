import { db } from "../src/lib/db";
async function main() {
  const sessions = await db.practiceSession.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
  for (const s of sessions) {
    const misses = JSON.parse(s.misses) as { verb: string }[];
    console.log(JSON.stringify({ id: s.id, mode: s.mode, score: s.score, total: s.total, accuracy: s.accuracy, missCount: misses.length, missVerbs: misses.map((m) => m.verb) }));
  }
  console.log("total sessions:", await db.practiceSession.count());
}
main().then(() => process.exit(0));
