#!/usr/bin/env bun
// ─────────────────────────────────────────────────────────────
// Engine + quiz verification — run with:
//   bun scripts/verify-engine.ts
// Collects failures, prints a readable list and a final "PASS n/n"
// line, exits non-zero when anything failed.
// ─────────────────────────────────────────────────────────────

import { conjugate, conjugateOne } from "../src/lib/conjugator/engine";
import {
  generateQuestion,
  getVerbPool,
} from "../src/lib/conjugator/quiz";
import type { Question, QuizSettings } from "../src/lib/conjugator/quiz";
import { checkAnswer } from "../src/lib/conjugator/checker";
import {
  ALL_VERBS,
  ROW_META,
  SP5_VERBS,
  SP6_VERBS,
  SUBJECT_KEYS,
  TENSE_ROWS,
  VERBS,
} from "../src/lib/conjugator/types";
import type { RowKey, SubjectKey } from "../src/lib/conjugator/types";

let passed = 0;
let total = 0;
const failures: string[] = [];

function check(desc: string, cond: boolean, detail?: string): void {
  total++;
  if (cond) {
    passed++;
  } else {
    failures.push(detail ? `${desc} — ${detail}` : desc);
  }
}

/** Spanish answer must be among the row's accepted answers */
function es(verb: string, subject: SubjectKey, tense: RowKey, expected: string): void {
  const row = conjugateOne(verb, subject, tense);
  check(
    `es  ${verb}/${subject}/${tense} ⊇ "${expected}"`,
    row.spanish.includes(expected),
    `got [${row.spanish.join(" | ")}]`
  );
}

/** English answer must be among the row's accepted answers */
function en(verb: string, subject: SubjectKey, tense: RowKey, expected: string): void {
  const row = conjugateOne(verb, subject, tense);
  check(
    `en  ${verb}/${subject}/${tense} ⊇ "${expected}"`,
    row.english.includes(expected),
    `got [${row.english.join(" | ")}]`
  );
}

// ── 1. Spanish spot checks (ported from the legacy engine) ───

es("hablar", "nosotros", "pres", "hablamos"); // 1
es("hablar", "ellos", "imp_subj", "hablaran"); // 2 (both)
es("hablar", "ellos", "imp_subj", "hablasen");
es("hablar", "el", "tu_pos", "habla"); // 3 (both)
es("hablar", "el", "tu_pos", "¡habla!");
es("hablar", "nosotros", "pres_perf", "hemos hablado"); // 4
es("tener", "el", "pret", "tuvo"); // 5
es("tener", "nosotros", "imp_subj", "tuviéramos"); // 6 (both)
es("tener", "nosotros", "imp_subj", "tuviésemos");
es("tener", "tu", "pres", "tienes"); // 7
es("tener", "yo", "pres", "tengo"); // 8
es("divertirse", "tu", "pres", "te diviertes"); // 9
es("divertirse", "nosotros", "pres", "nos divertimos"); // 10
es("ir", "yo", "pres_subj", "vaya"); // 11
es("ir", "tu", "tu_pos", "ve"); // 12
es("ir", "nosotros", "nos", "vamos"); // 13
es("ir", "el", "imp", "iba"); // 14
es("poner", "el", "fut", "pondrá"); // 15
es("poner", "tu", "tu_pos", "pon"); // 16
es("reír", "el", "pres", "ríe"); // 17
es("reír", "nosotros", "pres", "reímos"); // 18
es("reír", "nosotros", "pres_subj", "riamos"); // 19 (NO accent)
check(
  'es  reír/nosotros/pres_subj must NOT be "ríamos"',
  !conjugateOne("reír", "nosotros", "pres_subj").spanish.includes("ríamos"),
  `got [${conjugateOne("reír", "nosotros", "pres_subj").spanish.join(" | ")}]`
);
es("sonreír", "nosotros", "pres_subj", "sonriamos"); // 20
es("seguir", "yo", "pres", "sigo"); // 21
es("seguir", "nosotros", "pres_subj", "sigamos"); // 22
es("construir", "ellos", "pres", "construyen"); // 23
es("construir", "nosotros", "pres_subj", "construyamos"); // 24
es("dormir", "nosotros", "pres", "dormimos"); // 25
es("dormir", "el", "pres_subj", "duerma"); // 26
es("dormir", "nosotros", "pres_subj", "durmamos"); // 27
es("pedir", "tu", "pret", "pediste"); // 28
es("pedir", "el", "pret", "pidió"); // 29
es("caer", "el", "pret", "cayó"); // 30
es("caer", "yo", "pres", "caigo"); // 31
es("caer", "tu", "pret", "caíste"); // 32
es("creer", "el", "pret", "creyó"); // 33
es("creer", "yo", "pret", "creí"); // 34
es("huir", "el", "ger", "huyendo"); // 35
es("huir", "ellos", "pret", "huyeron"); // 36
es("huir", "nosotros", "pres_subj", "huyamos"); // 37
es("huir", "ellos", "pres", "huyen"); // 38
es("sentarse", "nosotros", "nos", "sentémonos"); // 39
es("sentarse", "tu", "tu_pos", "siéntate"); // 40
es("sentarse", "el", "pres", "se sienta"); // 41
es("valer", "yo", "pres", "valgo"); // 42
es("saber", "yo", "pres", "sé"); // 43
es("saber", "el", "pret", "supo"); // 44
es("andar", "ellos", "pret", "anduvieron"); // 45
es("freír", "el", "part", "frito"); // 46 (both)
es("freír", "el", "part", "freído");
es("vestirse", "tu", "tu_pos", "vístete"); // 47
es("vestirse", "el", "ud", "vístase"); // 48
es("vestirse", "ellos", "uds", "vístanse"); // 49
es("acostarse", "ellos", "pret", "se acostaron"); // 50
es("acostarse", "el", "pres", "se acuesta"); // 51
es("portarse", "ellos", "uds", "pórtense"); // 52
es("portarse", "tu", "tu_pos", "pórtate"); // 53
es("ir", "tu", "tu_neg", "no vayas"); // 54
es("estar", "ellos", "pret", "estuvieron"); // 55
es("estar", "yo", "pres", "estoy"); // 56
es("dar", "el", "pres_subj", "dé"); // 57
es("atraer", "el", "pres_subj", "atraiga"); // 58
es("mentir", "nosotros", "pres_subj", "mintamos"); // 59
es("mentir", "el", "pres", "miente"); // 60
es("caber", "yo", "pres", "quepo"); // 61
es("conducir", "yo", "pres", "conduzco"); // 62
es("conducir", "el", "pret", "condujo"); // 63
es("querer", "el", "pret", "quiso"); // 64
es("comenzar", "el", "pres_subj", "comience"); // 65
es("escoger", "yo", "pres", "escojo"); // 66
es("torcer", "yo", "pres", "tuerzo"); // 67
es("volver", "el", "part", "vuelto"); // 68
es("volver", "el", "pres_perf", "ha vuelto");
es("hablar", "tu", "vos_pos", "hablad"); // 69
es("hablar", "tu", "vos_neg", "no habléis");
es("vestirse", "tu", "vos_pos", "vestíos"); // 70

// extra: alternative participle propagates into the compound tenses
es("freír", "el", "cond_perf", "habría freído");
es("freír", "el", "cond_perf", "habría frito");
es("freír", "el", "plu_perf_subj", "hubiese frito");
es("freír", "el", "plu_perf_subj", "hubiese freído");
// extra: reflexive gerund keeps both spellings
es("sentarse", "yo", "ger", "sentándome");
es("sentarse", "yo", "ger", "me - sentando");
// extra: reflexive perfect via the dash-replacement trick
es("sentarse", "yo", "pres_perf", "me he sentado");
es("sentarse", "nosotros", "imp_subj", "nos sentáramos");
es("sentarse", "nosotros", "imp_subj", "nos sentásemos");
// extra: ir remains fully irregular
es("ir", "el", "fut", "irá");
es("ir", "yo", "pret", "fui");
es("ir", "el", "imp_subj", "fuera");
es("ir", "el", "imp_subj", "fuese");
es("ir", "tu", "vos_pos", "id");
es("ir", "tu", "vos_neg", "no vayáis");

// ── 2. English spot checks ───────────────────────────────────

en("hablar", "yo", "pres", "i speak");
en("hablar", "yo", "pres", "i talk");
en("estar", "el", "pres", "he is");
en("valer", "el", "pres", "he is worth");
en("vestirse", "el", "pres", "he gets dressed");
en("acostarse", "el", "pres", "he goes to bed");
en("tener", "tu", "pres", "you have");
en("hablar", "nosotros", "pres_perf", "we have spoken");
en("hablar", "nosotros", "pres_perf", "we have talked");
en("hablar", "el", "pret", "he spoke");
en("hablar", "el", "pret", "he talked");
en("estar", "ellos", "pret", "they were");
en("hablar", "tu", "tu_neg", "don't speak");
en("hablar", "tu", "tu_neg", "don't talk");
en("hablar", "nosotros", "nos", "let's speak");
en("hablar", "nosotros", "nos", "let's talk");
en("hablar", "yo", "inf", "to speak");
en("hablar", "yo", "inf", "to talk");
en("hablar", "el", "ger", "speaking");
en("hablar", "el", "ger", "talking");
en("estar", "yo", "imp", "i used to be");
en("estar", "yo", "pret", "i was");
en("hablar", "el", "cond", "he would speak");
en("hablar", "ellos", "fut", "they will speak");

// extra english behaviour from the legacy regexes
en("hablar", "el", "tu_pos", "speak!");
en("hablar", "el", "cond_perf", "he would've spoken");
en("estar", "yo", "pres_subj", "that i be");
en("estar", "yo", "imp_subj", "that i were");
en("hablar", "el", "imp_subj", "that he were speaking");
en("hablar", "el", "imp_subj", "that he spoke");
en("hablar", "tu", "vos_pos", "(you all) speak");
en("hablar", "tu", "vos_neg", "(you all) don't speak");
en("divertirse", "el", "pres", "he has fun");
en("sentirse", "el", "pres", "he feels");
check(
  'en  hablar/el/vos_pos canonical is "(you all) talk"',
  conjugateOne("hablar", "el", "vos_pos").english[0] === "(you all) talk",
  `got [${conjugateOne("hablar", "el", "vos_pos").english.join(" | ")}]`
);
check(
  "en  hablar/el/tu_pos canonical has no \"!\"",
  conjugateOne("hablar", "el", "tu_pos").english[0] === "talk",
  `got [${conjugateOne("hablar", "el", "tu_pos").english.join(" | ")}]`
);

// ── 3. Structure: 23 rows in TENSE_ROWS order ────────────────

for (const sample of ["hablar", "tener", "sentarse", "ir", "freír"] as const) {
  const subject: SubjectKey = "el";
  let rows: ReturnType<typeof conjugate> = [];
  let err: string | null = null;
  try {
    rows = conjugate(sample as string, subject);
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }
  check(`conjugate(${sample}) does not throw`, err === null, err ?? undefined);
  if (err !== null) continue;

  check(
    `conjugate(${sample}) returns 23 rows`,
    rows.length === TENSE_ROWS.length,
    `got ${rows.length}`
  );
  check(
    `conjugate(${sample}) keys follow TENSE_ROWS order`,
    JSON.stringify(rows.map((r) => r.key)) ===
      JSON.stringify(TENSE_ROWS.map((r) => r.key)),
    `got [${rows.map((r) => r.key).join(", ")}]`
  );
  for (const row of rows) {
    const meta = ROW_META[row.key];
    check(
      `row ${sample}/${row.key} metadata matches ROW_META`,
      row.group === meta.group &&
        row.labelEs === meta.labelEs &&
        row.labelEn === meta.labelEn
    );
    check(
      `row ${sample}/${row.key} has ≥1 spanish answer`,
      row.spanish.length >= 1 && row.spanish.every((s) => s.length > 0)
    );
    check(
      `row ${sample}/${row.key} has ≥1 english answer`,
      row.english.length >= 1 && row.english.every((s) => s.length > 0)
    );
  }
}

// ── 4. conjugateOne === the matching conjugate row (full sweep) ──
//    + sanity loop: every verb × every subject must not throw and
//    produce 23 fully-populated rows.

const verbCount = ALL_VERBS.length;
check(
  "ALL_VERBS matches VERBS record & level pools",
  verbCount === Object.keys(VERBS).length &&
    getVerbPool(5).length === SP5_VERBS.length &&
    getVerbPool(6).length === SP6_VERBS.length &&
    getVerbPool("all").length === verbCount,
  `all=${verbCount}, sp5=${SP5_VERBS.length}, sp6=${SP6_VERBS.length}, record=${Object.keys(VERBS).length}`
);

let sweptRows = 0;
for (const verb of ALL_VERBS) {
  for (const subject of SUBJECT_KEYS) {
    let rows: ReturnType<typeof conjugate> = [];
    let err: string | null = null;
    try {
      rows = conjugate(verb, subject);
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
    check(`sanity conjugate(${verb}, ${subject}) does not throw`, err === null, err ?? undefined);
    if (err !== null) continue;

    check(
      `sanity conjugate(${verb}, ${subject}) → 23 rows`,
      rows.length === 23,
      `got ${rows.length}`
    );
    let allNonEmpty = true;
    for (const row of rows) {
      if (row.spanish.length < 1 || row.english.length < 1) allNonEmpty = false;
    }
    check(
      `sanity conjugate(${verb}, ${subject}) rows non-empty`,
      allNonEmpty
    );
    sweptRows++;

    for (const row of rows) {
      let one: { spanish: string[]; english: string[] } | null = null;
      let oneErr: string | null = null;
      try {
        one = conjugateOne(verb, subject, row.key);
      } catch (e) {
        oneErr = e instanceof Error ? e.message : String(e);
      }
      check(
        `conjugateOne(${verb}, ${subject}, ${row.key}) does not throw`,
        oneErr === null,
        oneErr ?? undefined
      );
      if (oneErr !== null || one === null) continue;
      check(
        `conjugateOne(${verb}, ${subject}, ${row.key}) matches conjugate()`,
        JSON.stringify(one.spanish) === JSON.stringify(row.spanish) &&
          JSON.stringify(one.english) === JSON.stringify(row.english),
        `one=[${one.spanish.join(" | ")}] row=[${row.spanish.join(" | ")}]`
      );
    }
  }
}
check("sanity sweep covered every verb × subject", sweptRows === verbCount * 5, `covered ${sweptRows}`);

// ── 5. Quiz generation ───────────────────────────────────────

const settings: QuizSettings = {
  types: ["conjugation", "translate-es-en", "translate-en-es"],
  tenses: ["pres", "pret"],
  level: "all",
  mode: "timed",
  durationSec: 120,
};

const ids = new Set<string>();
const kindsSeen = new Set<string>();
for (let i = 0; i < 50; i++) {
  let q: Question | null = null;
  let err: string | null = null;
  try {
    q = generateQuestion(settings);
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }
  check(`generateQuestion #${i} does not throw`, err === null, err ?? undefined);
  if (err !== null || q === null) continue;

  const ok =
    q.id.length > 0 &&
    settings.types.includes(q.kind) &&
    (settings.tenses as string[]).includes(q.tense) &&
    ALL_VERBS.includes(q.verb) &&
    (q.subject === null || SUBJECT_KEYS.includes(q.subject)) &&
    q.tenseLabelEs === ROW_META[q.tense].labelEs &&
    q.tenseLabelEn === ROW_META[q.tense].labelEn &&
    q.promptMain.length > 0 &&
    q.chips.length >= 1 &&
    q.answers.length >= 1 &&
    q.displayAnswer.length > 0;
  check(`generateQuestion #${i} (${q.kind} ${q.verb}/${q.tense}) is well-formed`, ok);
  // displayAnswer must itself be an exact accepted answer
  const lang = q.kind === "translate-en-es" ? "es" : q.kind === "translate-es-en" ? "en" : "es";
  check(
    `generateQuestion #${i} displayAnswer is accepted`,
    checkAnswer(q.displayAnswer, q.answers, lang as "es" | "en") === "exact",
    `display="${q.displayAnswer}" answers=[${q.answers.join(" | ")}]`
  );
  ids.add(q.id);
  kindsSeen.add(q.kind);
}
check("50 generated questions have unique ids", ids.size === 50, `unique=${ids.size}`);
check("generated questions use ≥2 distinct kinds", kindsSeen.size >= 2, `kinds=[${[...kindsSeen].join(", ")}]`);

// throws on invalid settings
let threwEmptyTenses = false;
try {
  generateQuestion({ ...settings, tenses: [] });
} catch {
  threwEmptyTenses = true;
}
check("generateQuestion throws on empty tenses", threwEmptyTenses);

let threwUnknownTensesOnly = false;
try {
  generateQuestion({ ...settings, tenses: ["bogus" as unknown as RowKey] });
} catch {
  threwUnknownTensesOnly = true;
}
check("generateQuestion throws when tenses contains no known keys", threwUnknownTensesOnly);

let threwEmptyTypes = false;
try {
  generateQuestion({ ...settings, types: [] });
} catch {
  threwEmptyTypes = true;
}
check("generateQuestion throws on empty types", threwEmptyTypes);

// unknown tenses are filtered out, known ones still work
let mixedTenseOk = true;
try {
  for (let i = 0; i < 10; i++) {
    const q = generateQuestion({
      ...settings,
      types: ["conjugation"],
      tenses: ["pres", "bogus" as unknown as RowKey],
    });
    if (q.tense !== "pres") mixedTenseOk = false;
  }
} catch {
  mixedTenseOk = false;
}
check("generateQuestion filters unknown tenses and keeps known ones", mixedTenseOk);

// subjectless rows produce subject = null and a bare chip row
let sawBase = false;
let sawCommand = false;
for (let i = 0; i < 400 && !(sawBase && sawCommand); i++) {
  const q = generateQuestion({
    ...settings,
    types: ["conjugation"],
    tenses: ["inf", "ger", "part", "tu_pos", "ud", "nos", "vos_neg"],
  });
  if (["inf", "ger", "part"].includes(q.tense)) {
    sawBase = true;
    check(
      `base row question (${q.tense}) has subject=null & single chip`,
      q.subject === null && q.chips.length === 1,
      `subject=${q.subject} chips=[${q.chips.join(",")}]`
    );
  } else {
    sawCommand = true;
    check(
      `command row question (${q.tense}) has subject=null & single chip`,
      q.subject === null && q.chips.length === 1,
      `subject=${q.subject} chips=[${q.chips.join(",")}]`
    );
  }
}
check("sampled both base and command questions", sawBase && sawCommand);

// ── 6. Translation disambiguation (hablamos = present & preterite) ──

{
  const presRow = conjugateOne("hablar", "nosotros", "pres");
  const pretRow = conjugateOne("hablar", "nosotros", "pret");
  check(
    '"hablamos" is shared by present and preterite rows',
    presRow.spanish.includes("hablamos") && pretRow.spanish.includes("hablamos"),
    `pres=[${presRow.spanish.join(" | ")}] pret=[${pretRow.spanish.join(" | ")}]`
  );

  // ES → EN: "nosotros hablamos" must accept we speak AND we spoke
  let found = false;
  for (let i = 0; i < 20000 && !found; i++) {
    const q = generateQuestion({
      ...settings,
      types: ["translate-es-en"],
      tenses: ["pres"],
    });
    if (q.verb === "hablar" && q.subject === "nosotros") {
      found = true;
      check(
        'ES→EN "nosotros hablamos" accepts "we speak"',
        checkAnswer("we speak", q.answers, "en") === "exact",
        `answers=[${q.answers.join(" | ")}]`
      );
      check(
        'ES→EN "nosotros hablamos" accepts "we spoke"',
        checkAnswer("we spoke", q.answers, "en") === "exact",
        `answers=[${q.answers.join(" | ")}]`
      );
      check(
        'ES→EN hablamos prompt is "nosotros hablamos"',
        q.promptMain === "nosotros hablamos",
        `prompt="${q.promptMain}"`
      );
    }
  }
  check("sampled an ES→EN hablar/nosotros/pres question", found);

  // EN → ES: "we talked" (canonical preterite phrase) must accept "hablamos"
  let foundEn = false;
  for (let i = 0; i < 20000 && !foundEn; i++) {
    const q = generateQuestion({
      ...settings,
      types: ["translate-en-es"],
      tenses: ["pret"],
    });
    if (q.verb === "hablar" && q.subject === "nosotros") {
      foundEn = true;
      check(
        'EN→ES "we talked" accepts "hablamos"',
        checkAnswer("hablamos", q.answers, "es") === "exact",
        `answers=[${q.answers.join(" | ")}]`
      );
      check(
        "EN→ES displayAnswer is a valid Spanish form",
        checkAnswer(q.displayAnswer, q.answers, "es") === "exact",
        `display="${q.displayAnswer}"`
      );
    }
  }
  check("sampled an EN→ES hablar/nosotros/pret question", foundEn);
}

// ── Report ───────────────────────────────────────────────────

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} check(s) failed:\n`);
  for (const f of failures) {
    console.error(`  • ${f}`);
  }
  console.error("");
}
console.log(`PASS ${passed}/${total}`);
if (failures.length > 0) {
  process.exit(1);
}
