import { db } from "../src/lib/db";
const sessions = await db.practiceSession.count();
const del = await db.practiceSession.deleteMany({});
console.log(`sessions before: ${sessions}, deleted: ${del.count}`);
await db.$disconnect();
