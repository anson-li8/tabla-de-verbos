// ─────────────────────────────────────────────────────────────
// Tabla de Verbos — conjugation engine
//
// Faithful TypeScript port of the legacy app's
// upload/solution_constructor.js + upload/constants.js.
// The original wrote answers into DOM inputs; here the exact same
// logic produces plain string arrays (one entry per accepted answer,
// e.g. -ra/-se subjunctive, ¡…! command variants, alternative
// participles, both reflexive gerund spellings).
// ─────────────────────────────────────────────────────────────

import {
  AR,
  E_I,
  E_IE,
  IR,
  NO_SC,
  O_UE,
  ROW_META,
  SUBJECT_INDEX,
  TENSE_ROWS,
  VERBS,
} from "./types";
import type { RowGroup, RowKey, SubjectKey, VerbAttrs } from "./types";

export interface ConjugationRow {
  key: RowKey;
  group: RowGroup;
  labelEs: string;
  labelEn: string;
  /** ALL acceptable Spanish answers */
  spanish: string[];
  /** ALL acceptable English answers; FIRST item is the canonical display form */
  english: string[];
}

// ── Legacy constants (upload/constants.js) ───────────────────

/** numeric subject indexes */
const YO = 0;
const TU = 1;
const EL = 2;
const NOSOTROS = 3;
const ELLOS = 4;
/** vosotros sits at index 5 — LAST — so every array below can stay
 *  backward-compatible with the 5-entry legacy data */
const VOSOTROS = 5;

const REFLEXIVE_PRONOUNS = ["me", "te", "se", "nos", "se", "os"];

const PRES_ENDINGS = [
  ["o", "as", "a", "amos", "an", "áis"],
  ["o", "es", "e", "emos", "en", "éis"],
  ["o", "es", "e", "imos", "en", "ís"],
];

const IMP_ENDINGS = [
  ["aba", "abas", "aba", "ábamos", "aban", "abais"],
  ["ía", "ías", "ía", "íamos", "ían", "íais"],
];

const PRET_ENDINGS = [
  ["é", "aste", "ó", "amos", "aron", "asteis"],
  ["í", "iste", "ió", "imos", "ieron", "isteis"],
];

const HABER_PRES = ["he", "has", "ha", "hemos", "han", "habéis"];
const FUT_ENDINGS = ["é", "ás", "á", "emos", "án", "éis"];
const HABER_SUBJ = ["haya", "hayas", "haya", "hayamos", "hayan", "hayáis"];
const HABER_IMP_SUBJ = [
  ["hubiera", "hubieras", "hubiera", "hubiéramos", "hubieran", "hubierais"],
  ["hubiese", "hubieses", "hubiese", "hubiésemos", "hubiesen", "hubieseis"],
];
const IMP_SUBJ_ENDINGS = [
  ["ra", "ras", "ra", "ramos", "ran", "rais"],
  ["se", "ses", "se", "semos", "sen", "seis"],
];

/** English subject pronouns, indexed by subject (yo=0 … ellos=4, vosotros=5). */
const E_SUBS = ["i", "you", "he", "we", "they", "you all"];

function dedup(items: string[]): string[] {
  return [...new Set(items)];
}

// ── Low-level helpers (ported 1:1 from solution_constructor.js) ──

/**
 * Add an accent to the LAST (unaccented) vowel of the fragment.
 * Legacy hack used for the nosotros imperfect subjunctive
 * ("tuvie " → "tuvié") and reflexive affirmative commands ("sient" → "siént").
 */
function addAccent(word: string): string {
  let tup = word;
  for (let i = tup.length - 1; i >= 0; i--) {
    const ch = tup.substring(i, i + 1);
    if (ch === "a") {
      tup = tup.substring(0, i) + "á" + tup.substring(i + 1);
      break;
    } else if (ch === "e") {
      tup = tup.substring(0, i) + "é" + tup.substring(i + 1);
      break;
    } else if (ch === "i") {
      tup = tup.substring(0, i) + "í" + tup.substring(i + 1);
      break;
    } else if (ch === "o") {
      tup = tup.substring(0, i) + "ó" + tup.substring(i + 1);
      break;
    } else if (ch === "u") {
      tup = tup.substring(0, i) + "ú" + tup.substring(i + 1);
      break;
    }
  }
  return tup;
}

/**
 * Apply the verb's stem change.
 * `oneLetter` selects the single-letter variant (e→i / o→u) used in
 * gerunds and 3rd-person preterites of -ir verbs.
 */
function stemChange(stem: string, type: number, oneLetter: boolean): string {
  if (type === NO_SC) {
    return stem;
  }
  let tbr: string | undefined;
  let i: number;
  for (i = stem.length - 1; i >= 0; i--) {
    const ch = stem.substring(i, i + 1);
    if (ch === "e") {
      if (type === E_IE) {
        tbr = oneLetter
          ? stem.substring(0, i) + "i"
          : stem.substring(0, i) + "ie";
        break;
      } else if (type === E_I) {
        tbr = stem.substring(0, i) + "i";
        break;
      }
    } else if (ch === "o") {
      if (type === O_UE) {
        tbr = oneLetter
          ? stem.substring(0, i) + "u"
          : stem.substring(0, i) + "ue";
        break;
      }
    }
  }
  if (tbr === undefined) {
    // no matching vowel in the stem — cannot happen with the bundled verb
    // data, but keep the engine total.
    return stem;
  }
  if (i !== stem.length - 1) {
    tbr += stem.substring(i + 1);
  }
  return tbr;
}

/** 1st person singular present (specialForms.yo / boot / stemChange + "o"). */
function getYo(stem: string, attr: VerbAttrs): string {
  if (attr.specialForms.yo == null) {
    if (attr.specialForms.boot == null) {
      return stemChange(stem, attr.stemChangeType, false) + "o";
    }
    return attr.specialForms.boot + "o";
  }
  return attr.specialForms.yo + "o";
}

/**
 * 3rd person preterite: -ir verbs take the one-letter stem change, then the
 * "i" of -ió/-ieron is dropped or the stem-final a/e/u turns into "y"
 * (huir → huyó, creer → creyó, caer → cayó). specialForms.pret wins last.
 */
function getEllos(stem: string, attr: VerbAttrs, sujeto: number): string {
  let pret: string;
  const idx = sujeto === EL ? 3 : 6;
  const sujIdx = attr.endingType === AR ? 0 : 1;
  if (attr.endingType === IR) {
    pret = stemChange(stem, attr.stemChangeType, true) + PRET_ENDINGS[sujIdx][sujeto];
  } else {
    pret = stem + PRET_ENDINGS[sujIdx][sujeto];
  }
  if (sujIdx === 1) {
    const start = pret.length - idx;
    const end = pret.length - idx + 1;
    const ch = pret.substring(start, end);
    const prev = pret.substring(start - 1, start);
    if (ch === "i") {
      // ri + ió → rió
      pret = pret.substring(0, start) + pret.substring(end);
    } else if (
      ch === "a" ||
      ch === "e" ||
      (ch === "u" && prev !== "q" && prev !== "g")
    ) {
      // ca + ió → cayó / hu + ieron → huyeron
      pret =
        pret.substring(0, pret.length - idx + 1) +
        "y" +
        pret.substring(pret.length - idx + 2);
    }
  }
  if (attr.specialForms.pret != null) {
    pret = attr.specialForms.pret[sujeto];
  }
  return pret;
}

/**
 * Present subjunctive for any subject index (0-5; YO borrows the él form).
 * nosotros/vosotros "un-boot" the yo stem (í→i plus ie→e / i→e / ue→o for
 * non-ir verbs; ie→i / i→i / ue→u for -ir verbs, incl. the special
 * "adquir" stem), and -ar verbs get the orthographic c→qu / g→gu / z→c
 * change before the ending.
 */
function getPresSubj(stem: string, attr: VerbAttrs, sujeto: number): string {
  let presSubj: string;
  const opp = attr.endingType === AR ? 1 : 0;
  const suj = sujeto === YO ? 2 : sujeto;
  if (attr.specialForms.subj != null) {
    return attr.specialForms.subj[suj];
  }
  if (suj === NOSOTROS || suj === VOSOTROS) {
    presSubj = getYo(stem, attr);
    presSubj = presSubj.substring(0, presSubj.length - 1);
    if (attr.stemChangeType !== NO_SC || stem === "adquir") {
      // un-accent every "í" first (reír → ri)
      for (let i = 0; i < presSubj.length; i++) {
        if (presSubj.substring(i, i + 1) === "í") {
          presSubj = presSubj.substring(0, i) + "i" + presSubj.substring(i + 1);
        }
      }
      let find = "";
      let change = "";
      if (attr.endingType !== IR) {
        if (attr.stemChangeType === E_IE) {
          find = "ie";
          change = "e";
        } else if (attr.stemChangeType === E_I) {
          find = "i";
          change = "e";
        } else if (attr.stemChangeType === O_UE) {
          find = "ue";
          change = "o";
        }
      } else {
        if (attr.stemChangeType === E_IE) {
          find = "ie";
          change = "i";
        } else if (attr.stemChangeType === E_I) {
          find = "i";
          change = "i";
        } else if (attr.stemChangeType === O_UE) {
          find = "ue";
          change = "u";
        } else if (stem === "adquir") {
          find = "ie";
          change = "i";
        }
      }
      if (find !== "") {
        // replace the LAST occurrence of `find` (search runs from the end)
        for (let i = 0; i < presSubj.length - 1; i++) {
          const look = presSubj.substring(
            presSubj.length - i - find.length,
            presSubj.length - i
          );
          if (look === find) {
            presSubj =
              presSubj.substring(0, presSubj.length - i - find.length) +
              change +
              presSubj.substring(presSubj.length - i);
            break;
          }
        }
      }
    }
    presSubj += PRES_ENDINGS[opp][suj];
  } else {
    presSubj = getYo(stem, attr);
    presSubj =
      presSubj.substring(0, presSubj.length - 1) + PRES_ENDINGS[opp][suj];
  }
  if (attr.isReflexive) {
    presSubj = REFLEXIVE_PRONOUNS[sujeto] + " " + presSubj;
  }
  if (attr.endingType === AR) {
    const ending = PRES_ENDINGS[opp][suj];
    const inspect = presSubj.substring(
      presSubj.length - ending.length - 1,
      presSubj.length - ending.length
    );
    if (inspect === "c") {
      presSubj =
        presSubj.substring(0, presSubj.length - ending.length - 1) +
        "qu" +
        presSubj.substring(presSubj.length - ending.length);
    } else if (inspect === "g") {
      presSubj =
        presSubj.substring(0, presSubj.length - ending.length - 1) +
        "gu" +
        presSubj.substring(presSubj.length - ending.length);
    } else if (inspect === "z") {
      presSubj =
        presSubj.substring(0, presSubj.length - ending.length - 1) +
        "c" +
        presSubj.substring(presSubj.length - ending.length);
    }
  }
  return presSubj;
}

// ── Core solution builder ────────────────────────────────────

interface Solution {
  spanish: Record<RowKey, string[]>;
  english: Record<RowKey, string[]>;
}

function buildSolution(verb: string, subject: SubjectKey): Solution {
  const attr = VERBS[verb];
  if (!attr) {
    throw new Error(`Unknown verb: ${verb}`);
  }
  if (!(subject in SUBJECT_INDEX)) {
    throw new Error(`Unknown subject: ${subject}`);
  }
  const sujeto = SUBJECT_INDEX[subject];

  // reflexive infinitive without the trailing "se"
  const plainVerb = attr.isReflexive
    ? verb.substring(0, verb.length - 2)
    : verb;
  const stem = plainVerb.substring(0, plainVerb.length - 2);
  // imperfect/preterite ending table index: -ar → 0, -er/-ir → 1
  const sujIdx = attr.endingType === AR ? 0 : 1;

  const raw = {} as Partial<Record<RowKey, string | string[]>>;

  // ── infinitive ──
  let infin = plainVerb;
  if (attr.isReflexive) {
    infin += REFLEXIVE_PRONOUNS[sujeto];
  }
  raw.inf = infin;

  // ── gerund ──
  let ger: string | string[];
  if (attr.specialForms.gerund == null) {
    let gerStem: string;
    if (attr.endingType === IR && attr.stemChangeType !== NO_SC) {
      gerStem = stemChange(stem, attr.stemChangeType, true);
    } else {
      gerStem = stem;
    }
    if (attr.endingType === AR) {
      ger = attr.isReflexive
        ? [
            gerStem + "ándo" + REFLEXIVE_PRONOUNS[sujeto],
            REFLEXIVE_PRONOUNS[sujeto] + " - " + gerStem + "ando",
          ]
        : gerStem + "ando";
    } else {
      ger = attr.isReflexive
        ? [
            gerStem + "iéndo" + REFLEXIVE_PRONOUNS[sujeto],
            REFLEXIVE_PRONOUNS[sujeto] + " - " + gerStem + "iendo",
          ]
        : gerStem + "iendo";
    }
  } else {
    ger = attr.specialForms.gerund;
  }
  raw.ger = ger;

  // ── participle (single canonical form; the alternative participle is
  //    appended to every affected row in post-processing below) ──
  let part: string;
  if (attr.specialForms.participle == null) {
    part = attr.endingType === AR ? stem + "ado" : stem + "ido";
    if (attr.isReflexive) {
      part = REFLEXIVE_PRONOUNS[sujeto] + " - " + part;
    }
  } else {
    const p = attr.specialForms.participle;
    part = Array.isArray(p) ? p[0] : p;
  }
  raw.part = part;

  // ── present ──
  let pres: string;
  if (attr.specialForms.pres != null) {
    pres = attr.specialForms.pres[sujeto];
  } else if (sujeto === NOSOTROS || sujeto === VOSOTROS) {
    // nosotros & vosotros sit OUTSIDE the stem-change "boot" —
    // pensar → pensamos / pensáis (never *piensáis), dormir → dormís
    if (sujeto === NOSOTROS && attr.endingType === IR && stem.substring(stem.length - 1) === "e") {
      // -ir verbs whose stem ends in "e" keep the accent: reír → reímos
      pres = stem + "ímos";
    } else {
      pres = stem + PRES_ENDINGS[attr.endingType][sujeto];
    }
  } else if (sujeto === YO) {
    pres = getYo(stem, attr);
  } else {
    const presStem =
      attr.specialForms.boot == null
        ? stemChange(stem, attr.stemChangeType, false)
        : attr.specialForms.boot;
    pres = presStem + PRES_ENDINGS[attr.endingType][sujeto];
  }
  if (attr.isReflexive) {
    pres = REFLEXIVE_PRONOUNS[sujeto] + " " + pres;
  }
  raw.pres = pres;

  // ── imperfect ──
  let imp: string;
  if (attr.specialForms.imp != null) {
    imp = attr.specialForms.imp[sujeto];
  } else {
    imp = stem + IMP_ENDINGS[sujIdx][sujeto];
    if (attr.isReflexive) {
      imp = REFLEXIVE_PRONOUNS[sujeto] + " " + imp;
    }
  }
  raw.imp = imp;

  // ── preterite ──
  let pret: string;
  if (sujeto === EL || sujeto === ELLOS) {
    pret = getEllos(stem, attr, sujeto);
    if (attr.isReflexive) {
      pret = "se " + pret;
    }
  } else {
    if (attr.specialForms.pret == null) {
      const lastStemChar = stem.substring(stem.length - 1);
      if (sujeto === YO && attr.endingType === AR) {
        // orthographic changes: c→qu, g→gu, z→c (comencé, llegué, forcé)
        if (lastStemChar === "z") {
          pret =
            stem.substring(0, stem.length - 1) +
            "c" +
            PRET_ENDINGS[sujIdx][sujeto];
        } else if (lastStemChar === "g") {
          pret =
            stem.substring(0, stem.length - 1) +
            "gu" +
            PRET_ENDINGS[sujIdx][sujeto];
        } else if (lastStemChar === "c") {
          pret =
            stem.substring(0, stem.length - 1) +
            "qu" +
            PRET_ENDINGS[sujIdx][sujeto];
        } else {
          pret = stem + PRET_ENDINGS[sujIdx][sujeto];
        }
      } else if (
        (sujIdx === 1 && lastStemChar === "e") ||
        lastStemChar === "a"
      ) {
        // caer/creer/leer… keep the accent on the "i": caíste, creí
        let ending = PRET_ENDINGS[sujIdx][sujeto];
        ending = "í" + ending.substring(1);
        pret = stem + ending;
      } else {
        pret = stem + PRET_ENDINGS[sujIdx][sujeto];
      }
    } else {
      pret = attr.specialForms.pret[sujeto];
      // irregular preterite arrays historically carry 5 entries — the
      // vosotros form is the tú form with "-ste" widened to "-steis"
      // (anduviste → anduvisteis, fuiste → fuisteis, diste → disteis)
      if (pret == null && sujeto === VOSOTROS) {
        const tu = attr.specialForms.pret[TU] ?? "";
        pret = tu.endsWith("ste") ? tu + "is" : tu;
      }
    }
    if (attr.isReflexive) {
      pret = REFLEXIVE_PRONOUNS[sujeto] + " " + pret;
    }
  }
  raw.pret = pret;

  // ── future & conditional (both share the special future stem) ──
  const futStem = attr.specialForms.future ?? plainVerb;
  let fut = futStem + FUT_ENDINGS[sujeto];
  if (attr.isReflexive) {
    fut = REFLEXIVE_PRONOUNS[sujeto] + " " + fut;
  }
  raw.fut = fut;

  let cond = futStem + IMP_ENDINGS[1][sujeto];
  if (attr.isReflexive) {
    cond = REFLEXIVE_PRONOUNS[sujeto] + " " + cond;
  }
  raw.cond = cond;

  // ── compound tenses ──
  // For reflexive verbs the participle carries the pronoun as "me - hablado";
  // swapping the dash for the haber form yields "me he hablado", etc.
  raw.pres_perf = attr.isReflexive
    ? part.replace("-", HABER_PRES[sujeto])
    : HABER_PRES[sujeto] + " " + part;
  raw.plu_perf = attr.isReflexive
    ? part.replace("-", "hab" + IMP_ENDINGS[1][sujeto])
    : "hab" + IMP_ENDINGS[1][sujeto] + " " + part;
  raw.fut_perf = attr.isReflexive
    ? part.replace("-", "habr" + FUT_ENDINGS[sujeto])
    : "habr" + FUT_ENDINGS[sujeto] + " " + part;
  raw.cond_perf = attr.isReflexive
    ? part.replace("-", "habr" + IMP_ENDINGS[1][sujeto])
    : "habr" + IMP_ENDINGS[1][sujeto] + " " + part;

  // ── present subjunctive ──
  raw.pres_subj = getPresSubj(stem, attr, sujeto);

  // ── imperfect subjunctive (built on the 3rd person plural preterite) ──
  let impSubj = getEllos(stem, attr, ELLOS);
  impSubj = impSubj.substring(0, impSubj.length - 3);
  if (attr.isReflexive) {
    impSubj = REFLEXIVE_PRONOUNS[sujeto] + " " + impSubj;
  }
  if (sujeto === NOSOTROS) {
    // legacy accent hack: accent the stem's last vowel, then drop the
    // trailing space that lured addAccent past the stem ("tuvié " → "tuvié")
    impSubj = addAccent(impSubj + " ").substring(0, impSubj.length);
  }
  raw.imp_subj = [
    impSubj + IMP_SUBJ_ENDINGS[0][sujeto],
    impSubj + IMP_SUBJ_ENDINGS[1][sujeto],
  ];

  raw.pres_perf_subj = attr.isReflexive
    ? part.replace("-", HABER_SUBJ[sujeto])
    : HABER_SUBJ[sujeto] + " " + part;

  raw.plu_perf_subj = attr.isReflexive
    ? [
        part.replace("-", HABER_IMP_SUBJ[0][sujeto]),
        part.replace("-", HABER_IMP_SUBJ[1][sujeto]),
      ]
    : [
        HABER_IMP_SUBJ[0][sujeto] + " " + part,
        HABER_IMP_SUBJ[1][sujeto] + " " + part,
      ];

  // ── tú affirmative command ──
  let tup: string;
  if (attr.specialForms.command != null) {
    tup = attr.specialForms.command;
  } else if (attr.specialForms.pres != null) {
    tup = attr.specialForms.pres[2];
  } else {
    tup =
      attr.specialForms.boot == null
        ? stemChange(stem, attr.stemChangeType, false)
        : attr.specialForms.boot;
    if (attr.isReflexive) {
      // siéntate / vístete / pórtate
      tup = addAccent(tup);
      tup += PRES_ENDINGS[attr.endingType][2] + REFLEXIVE_PRONOUNS[1];
    } else {
      tup += PRES_ENDINGS[attr.endingType][2];
    }
  }
  raw.tu_pos = [tup, "¡" + tup + "!"];

  // ── tú negative command ──
  const tun = "no " + getPresSubj(stem, attr, TU);
  raw.tu_neg = [tun, "¡" + tun + "!"];

  // ── usted command (reflexives relocate the pronoun: "se sienta" → "siéntese") ──
  let baseUd = getPresSubj(stem, attr, EL);
  if (attr.isReflexive) {
    const lastChar = baseUd.substring(baseUd.length - 1);
    baseUd = baseUd.substring(3, baseUd.length - 1);
    baseUd = addAccent(baseUd) + lastChar + "se";
  }
  raw.ud = [baseUd, "¡" + baseUd + "!"];

  // ── ustedes command ("se sientan" → "síentense") ──
  let baseUds = getPresSubj(stem, attr, ELLOS);
  if (attr.isReflexive) {
    const lastTwo = baseUds.substring(baseUds.length - 2);
    baseUds = baseUds.substring(3, baseUds.length - 2);
    baseUds = addAccent(baseUds) + lastTwo + "se";
  }
  raw.uds = [baseUds, "¡" + baseUds + "!"];

  // ── vosotros commands ──
  // negative: no + present subjunctive (vosotros form)
  const vosn = "no " + getPresSubj(stem, attr, VOSOTROS);
  // affirmative: infinitive minus last letter + "d" (hablar → hablad)
  let vosp = plainVerb.substring(0, plainVerb.length - 1) + "d";
  if (attr.isReflexive) {
    if (attr.endingType === IR) {
      vosp = vosp.substring(0, vosp.length - 2) + "íos"; // vestíos
    } else {
      vosp = vosp.substring(0, vosp.length - 1) + "os"; // sentaos
    }
  }
  raw.vos_pos = [vosp, "¡" + vosp + "!"];
  raw.vos_neg = [vosn, "¡" + vosn + "!"];

  // ── nosotros command ──
  let nosCmd: string;
  if (attr.specialForms.nos != null) {
    nosCmd = attr.specialForms.nos;
  } else {
    nosCmd = getPresSubj(stem, attr, NOSOTROS);
    if (attr.isReflexive) {
      // "nos sentemos" → strip pronoun + ending, then ámonos/émonos
      nosCmd = nosCmd.substring(4, nosCmd.length - 3);
      const lastChar = nosCmd.substring(nosCmd.length - 1);
      if (lastChar === "a") {
        nosCmd = nosCmd.substring(0, nosCmd.length - 1) + "ámonos";
      } else if (lastChar === "e") {
        nosCmd = nosCmd.substring(0, nosCmd.length - 1) + "émonos";
      }
    }
  }
  raw.nos = [nosCmd, "¡" + nosCmd + "!"];

  // ── normalize to arrays + append the alternative participle
  //    (freír: frito / freído) everywhere it appears ──
  const altParticiple =
    attr.specialForms.participle != null &&
    Array.isArray(attr.specialForms.participle)
      ? attr.specialForms.participle
      : null;

  const spanish = {} as Record<RowKey, string[]>;
  for (const meta of TENSE_ROWS) {
    const value = raw[meta.key];
    if (value === undefined) {
      throw new Error(`Engine bug: row "${meta.key}" was not built for ${verb}`);
    }
    const arr = Array.isArray(value) ? [...value] : [value];
    if (altParticiple) {
      const [primary, alt] = altParticiple;
      const fixed = arr.length; // original iterated while pushing; snapshot is equivalent for our data
      for (let j = 0; j < fixed; j++) {
        if (arr[j].includes(primary)) {
          arr.push(arr[j].replace(primary, alt));
        }
      }
    }
    spanish[meta.key] = dedup(arr);
  }

  // ── English (replaces the legacy RegExp templates with plain strings;
  //    every translation set contributes its variants to every row) ──
  const english = {} as Record<RowKey, string[]>;
  for (const meta of TENSE_ROWS) {
    english[meta.key] = [];
  }

  const sub = E_SUBS[sujeto];

  for (const set of attr.english) {
    const inf = set.inf;
    const gerEn = set.ger;
    const partEn = set.part;
    const pretEn = set.pret;
    const impSubjEn = set.impSubj ?? null;

    const be = inf === "be" || inf === "be worth";
    const go = inf === "go" || inf === "go to bed";
    const have = inf === "have" || inf === "have fun";
    const space = !be && !go && !have && inf.indexOf(" ") !== -1;

    english.inf.push("to " + inf);
    english.ger.push(gerEn);
    english.part.push(partEn);

    // present — he/she agreement
    if (go) {
      if (sujeto === EL) {
        english.pres.push(`${sub} goes${inf.substring(2)}`);
      } else {
        english.pres.push(`${sub} ${inf}`);
      }
    } else if (have) {
      if (sujeto === EL) {
        english.pres.push(`${sub} has${inf.substring(4)}`);
      } else {
        english.pres.push(`${sub} ${inf}`);
      }
    } else if (space) {
      if (sujeto === EL) {
        const sp = inf.indexOf(" ");
        english.pres.push(
          `${sub} ${inf.substring(0, sp)}s${inf.substring(sp)}`
        );
      } else {
        english.pres.push(`${sub} ${inf}`);
      }
    } else if (sujeto === YO && be) {
      english.pres.push(`${sub} am${inf.substring(2)}`);
    } else if (sujeto === EL) {
      english.pres.push(
        be ? `${sub} is${inf.substring(2)}` : `${sub} ${inf}s`
      );
    } else if (be && (sujeto === TU || sujeto === NOSOTROS || sujeto === ELLOS || sujeto === VOSOTROS)) {
      english.pres.push(`${sub} are${inf.substring(2)}`);
    } else {
      english.pres.push(`${sub} ${inf}`);
    }

    // imperfect
    english.imp.push(`${sub} used to ${inf}`);
    if (!be) {
      english.imp.push(
        sujeto === YO || sujeto === EL
          ? `${sub} was ${gerEn}`
          : `${sub} were ${gerEn}`
      );
    }

    // preterite
    if (be && (sujeto === TU || sujeto === NOSOTROS || sujeto === ELLOS || sujeto === VOSOTROS)) {
      english.pret.push(`${sub} were${inf.substring(2)}`);
    } else {
      english.pret.push(`${sub} ${pretEn}`);
    }

    // perfects
    english.pres_perf.push(
      sujeto === EL ? `${sub} has ${partEn}` : `${sub} have ${partEn}`
    );
    english.plu_perf.push(`${sub} had ${partEn}`);
    english.fut.push(`${sub} will ${inf}`);
    english.fut_perf.push(`${sub} will have ${partEn}`);
    english.cond.push(`${sub} would ${inf}`);
    english.cond_perf.push(`${sub} would have ${partEn}`);
    english.cond_perf.push(`${sub} would've ${partEn}`);

    // subjunctives
    english.pres_subj.push(`that ${sub} ${inf}`);
    if (!be) {
      english.imp_subj.push(`that ${sub} were ${gerEn}`);
    }
    english.imp_subj.push(
      `that ${sub} ${impSubjEn != null ? impSubjEn : pretEn}`
    );
    english.pres_perf_subj.push(`that ${sub} have ${partEn}`);
    english.plu_perf_subj.push(`that ${sub} had ${partEn}`);

    // commands
    english.tu_pos.push(inf, `${inf}!`);
    english.tu_neg.push(`don't ${inf}`, `don't ${inf}!`);
    english.ud.push(inf, `${inf}!`);
    english.uds.push(inf, `${inf}!`);
    english.vos_pos.push(
      `(you all) ${inf}`,
      `(you all) ${inf}!`,
      inf,
      `${inf}!`
    );
    english.vos_neg.push(
      `(you all) don't ${inf}`,
      `(you all) don't ${inf}!`,
      `don't ${inf}`,
      `don't ${inf}!`
    );
    english.nos.push(`let's ${inf}`, `let's ${inf}!`);
  }

  for (const meta of TENSE_ROWS) {
    english[meta.key] = dedup(english[meta.key]);
  }

  return { spanish, english };
}

// ── Public API ───────────────────────────────────────────────

/**
 * All 23 conjugation rows for a verb + subject, in TENSE_ROWS order.
 * Throws for unknown verbs/subjects.
 */
export function conjugate(verb: string, subject: SubjectKey): ConjugationRow[] {
  const { spanish, english } = buildSolution(verb, subject);
  return TENSE_ROWS.map((meta) => ({
    key: meta.key,
    group: meta.group,
    labelEs: meta.labelEs,
    labelEn: meta.labelEn,
    spanish: spanish[meta.key],
    english: english[meta.key],
  }));
}

/**
 * A single row (all accepted Spanish + English answers).
 * Throws for unknown verbs/subjects/tenses.
 */
export function conjugateOne(
  verb: string,
  subject: SubjectKey,
  tense: RowKey
): { spanish: string[]; english: string[] } {
  const meta = ROW_META[tense];
  if (!meta) {
    throw new Error(`Unknown tense: ${tense}`);
  }
  const { spanish, english } = buildSolution(verb, subject);
  return { spanish: spanish[tense], english: english[tense] };
}
