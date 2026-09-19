import { db } from "../src/lib/db";
async function main() {
  const del = await db.practiceSession.deleteMany({});
  console.log("deleted", del.count, "sessions");
}
main().then(() => process.exit(0));
