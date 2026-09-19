// temporary verification: vosotros conjugations across representative verbs
import { conjugate } from "../src/lib/conjugator/engine";
import type { RowKey } from "../src/lib/conjugator/types";

interface Expectation {
  verb: string;
  row: RowKey;
  /** every form that must appear in the row's accepted answers */
  must: string[];
  /** forms that must NOT appear (the classic boot mistake) */
  never?: string[];
}

const expects: Expectation[] = [
  // regular -ar
  { verb: "hablar", row: "pres", must: ["habláis"] },
  { verb: "hablar", row: "imp", must: ["hablabais"] },
  { verb: "hablar", row: "pret", must: ["hablasteis"] },
  { verb: "hablar", row: "fut", must: ["hablaréis"] },
  { verb: "hablar", row: "cond", must: ["hablaríais"] },
  { verb: "hablar", row: "pres_perf", must: ["habéis hablado"] },
  { verb: "hablar", row: "plu_perf", must: ["habíais hablado"] },
  { verb: "hablar", row: "fut_perf", must: ["habréis hablado"] },
  { verb: "hablar", row: "cond_perf", must: ["habríais hablado"] },
  { verb: "hablar", row: "pres_subj", must: ["habléis"] },
  { verb: "hablar", row: "imp_subj", must: ["hablarais", "hablaseis"] },
  { verb: "hablar", row: "pres_perf_subj", must: ["hayáis hablado"] },
  { verb: "hablar", row: "plu_perf_subj", must: ["hubierais hablado", "hubieseis hablado"] },
  { verb: "hablar", row: "vos_pos", must: ["hablad"] },
  { verb: "hablar", row: "vos_neg", must: ["no habléis"] },
  // stem-change: vosotros OUTSIDE the boot
  { verb: "pensar", row: "pres", must: ["pensáis"], never: ["piensáis"] },
  { verb: "pensar", row: "pres_subj", must: ["penséis"] },
  { verb: "contar", row: "pres", must: ["contáis"], never: ["contáis*"] },
  { verb: "dormir", row: "pres", must: ["dormís"], never: ["duermís"] },
  { verb: "pedir", row: "pres", must: ["pedís"], never: ["pedís*"] },
  // boot-stem verbs
  { verb: "reír", row: "pres", must: ["reís"], never: ["ríis"] },
  { verb: "reír", row: "pret", must: ["reísteis"] },
  { verb: "reír", row: "imp_subj", must: ["rierais", "rieseis"] },
  { verb: "construir", row: "pres", must: ["construís"], never: ["constrúis"] },
  { verb: "huir", row: "pres", must: ["huís"] },
  // fully irregular present/subj arrays (already had index 5)
  { verb: "ir", row: "pres", must: ["vais"] },
  { verb: "ir", row: "imp", must: ["ibais"] },
  { verb: "ir", row: "pret", must: ["fuisteis"] },
  { verb: "ir", row: "fut", must: ["iréis"] },
  { verb: "ir", row: "cond", must: ["iríais"] },
  { verb: "ir", row: "pres_subj", must: ["vayáis"] },
  { verb: "dar", row: "pres", must: ["dais"] },
  { verb: "dar", row: "pret", must: ["disteis"] },
  { verb: "dar", row: "pres_subj", must: ["deis"] },
  { verb: "saber", row: "pres", must: ["sabéis"] },
  { verb: "saber", row: "pres_subj", must: ["sepáis"] },
  { verb: "estar", row: "pres", must: ["estáis"] },
  { verb: "estar", row: "pres_subj", must: ["estéis"] },
  // irregular preterite fallback (5-entry arrays → derive from tú)
  { verb: "andar", row: "pret", must: ["anduvisteis"] },
  { verb: "hacer", row: "pret", must: ["hicisteis"] },
  { verb: "tener", row: "pret", must: ["tuvisteis"] },
  { verb: "querer", row: "pret", must: ["quisisteis"] },
  { verb: "conducir", row: "pret", must: ["condujisteis"] },
  // accented preterites
  { verb: "caer", row: "pret", must: ["caísteis"] },
  { verb: "creer", row: "pret", must: ["creísteis"] },
  // reflexives
  { verb: "acostarse", row: "pres", must: ["os acostáis"] },
  { verb: "acostarse", row: "imp", must: ["os acostabais"] },
  { verb: "acostarse", row: "pret", must: ["os acostasteis"] },
  { verb: "acostarse", row: "fut", must: ["os acostaréis"] },
  { verb: "acostarse", row: "pres_perf", must: ["os habéis acostado"] },
  { verb: "acostarse", row: "pres_subj", must: ["os acostéis"] },
  { verb: "acostarse", row: "imp_subj", must: ["os acostarais", "os acostaseis"] },
  { verb: "acostarse", row: "vos_pos", must: ["acostaos"] },
  { verb: "acostarse", row: "vos_neg", must: ["no os acostéis"] },
  { verb: "vestirse", row: "pres", must: ["os vestís"] },
  { verb: "vestirse", row: "vos_pos", must: ["vestíos"] },
  // english renderings
  { verb: "hablar", row: "pres", must: ["you all speak"] },
  { verb: "estar", row: "pres", must: ["you all are"] },
  { verb: "estar", row: "pret", must: ["you all were"] },
  { verb: "hablar", row: "fut", must: ["you all will speak"] },
];

let pass = 0;
let fail = 0;
for (const e of expects) {
  const rows = conjugate(e.verb, "vosotros");
  const row = rows.find((r) => r.key === e.row);
  if (!row) {
    console.error(`FAIL ${e.verb}/${e.row}: row missing`);
    fail++;
    continue;
  }
  const es = row.spanish.join(" | ");
  const en = row.english.join(" | ");
  const all = `${es} ||| ${en}`;
  for (const m of e.must) {
    if (!all.includes(m)) {
      console.error(`FAIL ${e.verb}/${e.row}: expected "${m}" — got [${all}]`);
      fail++;
    } else {
      pass++;
    }
  }
  for (const n of e.never ?? []) {
    const bare = n.replace("*", "");
    if (es.includes(bare) && !n.includes("*")) {
      console.error(`FAIL ${e.verb}/${e.row}: forbidden "${n}" present — [${es}]`);
      fail++;
    } else {
      pass++;
    }
  }
}
console.log(`\nvosotros check: ${pass} passed, ${fail} failed`);

// also re-verify the classic 5 subjects still work for every verb (no crash, no undefined)
import { ALL_VERBS, SUBJECTS, SUBJECT_KEYS } from "../src/lib/conjugator/types";
let crash = 0;
for (const verb of ALL_VERBS) {
  for (const s of SUBJECT_KEYS) {
    try {
      const rows = conjugate(verb, s);
      for (const r of rows) {
        if (r.spanish.length === 0 || r.spanish.some((f) => f.includes("undefined") || f.includes("null"))) {
          console.error(`FAIL ${verb}/${s}/${r.key}: bad spanish [${r.spanish}]`);
          crash++;
        }
      }
    } catch (err) {
      console.error(`FAIL ${verb}/${s}: threw ${err}`);
      crash++;
    }
  }
}
console.log(`full sweep: ${ALL_VERBS.length * SUBJECTS.length} verb×subject combos, ${crash} failures`);
console.log(`subjects: ${SUBJECTS.map((s) => s.key).join(", ")}`);
