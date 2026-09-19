// ─────────────────────────────────────────────────────────────
// Answer checking — normalization + accent-aware matching
// A match that differs ONLY in Spanish accents counts as
// "accent" (correct, but the UI can nudge the learner).
// ─────────────────────────────────────────────────────────────

export type CheckResult = "exact" | "accent" | "wrong";

/** lowercase, trim, collapse whitespace, strip ¡!¿? and .,;: */
export function normalizeEs(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[¡!¿?.,;:]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Strip vowel diacritics only (á→a, é→e, í→i, ó→o, ú→u, ü→u).
 * ñ is intentionally kept distinct from n.
 */
export function stripAccents(s: string): string {
  return s
    .replace(/[áàäâ]/g, "a")
    .replace(/[éèëê]/g, "e")
    .replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o")
    .replace(/[úùüû]/g, "u");
}

/**
 * English normalization: lowercase, trim, collapse whitespace,
 * strip punctuation and apostrophes (don't→dont, let's→lets,
 * would've→wouldve, "(you all)"→"you all").
 */
export function normalizeEn(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[\u2019\u2018'`]/g, "")
    .replace(/[.!?,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check a user answer against a list of accepted answers.
 *  - "exact"  → normalized match
 *  - "accent" → match once Spanish accents are ignored (never for English)
 *  - "wrong"  → no match
 */
export function checkAnswer(
  input: string,
  answers: string[],
  lang: "es" | "en"
): CheckResult {
  const trimmed = input.trim();
  if (!trimmed) return "wrong";

  if (lang === "en") {
    const n = normalizeEn(trimmed);
    for (const a of answers) {
      if (n === normalizeEn(a)) return "exact";
    }
    return "wrong";
  }

  const n = normalizeEs(trimmed);
  const strippedInput = stripAccents(n);
  let accentMatch = false;
  for (const a of answers) {
    const na = normalizeEs(a);
    if (n === na) return "exact";
    if (!accentMatch && strippedInput === stripAccents(na)) {
      accentMatch = true;
    }
  }
  return accentMatch ? "accent" : "wrong";
}
