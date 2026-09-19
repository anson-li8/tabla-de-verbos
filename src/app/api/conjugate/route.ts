// ─────────────────────────────────────────────────────────────
// POST /api/conjugate — full 23-row conjugation chart
// Body: { verb: string, subject: SubjectKey }
// → { verb, subject, rows: ConjugationRow[] }
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { z } from "zod";

import { conjugate } from "@/lib/conjugator/engine";
import { VERBS, type SubjectKey } from "@/lib/conjugator/types";

export const dynamic = "force-dynamic";

const SUBJECT_ENUM = z.enum(["yo", "tu", "el", "nosotros", "vosotros", "ellos"]);

const bodySchema = z.object({
  verb: z.string(),
  subject: SUBJECT_ENUM,
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".");
    return NextResponse.json(
      {
        error: `Invalid ${path || "body"}: ${issue?.message ?? "expected { verb, subject }"}`,
      },
      { status: 400 }
    );
  }

  const { verb, subject } = parsed.data;
  if (!Object.hasOwn(VERBS, verb)) {
    return NextResponse.json(
      { error: `Unknown verb "${verb}" — see GET /api/verbs for the list` },
      { status: 400 }
    );
  }

  const rows = conjugate(verb, subject as SubjectKey);
  return NextResponse.json({ verb, subject, rows });
}
