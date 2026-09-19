// ─────────────────────────────────────────────────────────────
// Tabla de Verbos — shared types & metadata
// Ported from the original constants.js / verbinfo.js
// ─────────────────────────────────────────────────────────────

export type SubjectKey = "yo" | "tu" | "el" | "nosotros" | "ellos";

export interface SubjectMeta {
  key: SubjectKey;
  /** Spanish pronoun label */
  es: string;
  /** English pronoun label */
  en: string;
  /** display pronoun (used inside prompts) */
  pronoun: string;
}

export const SUBJECTS: SubjectMeta[] = [
  { key: "yo", es: "yo", en: "I", pronoun: "yo" },
  { key: "tu", es: "tú", en: "you", pronoun: "tú" },
  { key: "el", es: "él / ella", en: "he / she", pronoun: "él" },
  { key: "nosotros", es: "nosotros", en: "we", pronoun: "nosotros" },
  { key: "ellos", es: "ellos / ellas", en: "they", pronoun: "ellos" },
];

export const SUBJECT_KEYS: SubjectKey[] = ["yo", "tu", "el", "nosotros", "ellos"];

/** numeric index used by the legacy engine (yo=0 … ellos=4) */
export const SUBJECT_INDEX: Record<SubjectKey, number> = {
  yo: 0,
  tu: 1,
  el: 2,
  nosotros: 3,
  ellos: 4,
};

// ── Tense / form rows ────────────────────────────────────────

export type RowKey =
  | "inf"
  | "ger"
  | "part"
  | "pres"
  | "imp"
  | "pret"
  | "fut"
  | "cond"
  | "pres_perf"
  | "plu_perf"
  | "fut_perf"
  | "cond_perf"
  | "pres_subj"
  | "imp_subj"
  | "pres_perf_subj"
  | "plu_perf_subj"
  | "tu_pos"
  | "tu_neg"
  | "ud"
  | "uds"
  | "vos_pos"
  | "vos_neg"
  | "nos";

export type RowGroup = "base" | "indicative" | "perfect" | "subjunctive" | "imperative";

export interface RowMeta {
  key: RowKey;
  group: RowGroup;
  labelEs: string;
  labelEn: string;
  /** false for infinitive / gerund / participle (no subject agreement) */
  hasSubject: boolean;
}

/** The 23 chart rows, in canonical display order */
export const TENSE_ROWS: RowMeta[] = [
  { key: "inf", group: "base", labelEs: "infinitivo", labelEn: "infinitive", hasSubject: false },
  { key: "ger", group: "base", labelEs: "gerundio", labelEn: "gerund", hasSubject: false },
  { key: "part", group: "base", labelEs: "participio", labelEn: "participle", hasSubject: false },
  { key: "pres", group: "indicative", labelEs: "presente", labelEn: "present", hasSubject: true },
  { key: "imp", group: "indicative", labelEs: "imperfecto", labelEn: "imperfect", hasSubject: true },
  { key: "pret", group: "indicative", labelEs: "pretérito", labelEn: "preterite", hasSubject: true },
  { key: "fut", group: "indicative", labelEs: "futuro", labelEn: "future", hasSubject: true },
  { key: "cond", group: "indicative", labelEs: "condicional", labelEn: "conditional", hasSubject: true },
  { key: "pres_perf", group: "perfect", labelEs: "presente perfecto", labelEn: "present perfect", hasSubject: true },
  { key: "plu_perf", group: "perfect", labelEs: "pluscuamperfecto", labelEn: "pluperfect", hasSubject: true },
  { key: "fut_perf", group: "perfect", labelEs: "futuro perfecto", labelEn: "future perfect", hasSubject: true },
  { key: "cond_perf", group: "perfect", labelEs: "condicional perfecto", labelEn: "conditional perfect", hasSubject: true },
  { key: "pres_subj", group: "subjunctive", labelEs: "presente subjuntivo", labelEn: "present subjunctive", hasSubject: true },
  { key: "imp_subj", group: "subjunctive", labelEs: "imperfecto subjuntivo", labelEn: "imperfect subjunctive", hasSubject: true },
  { key: "pres_perf_subj", group: "subjunctive", labelEs: "presente perfecto subj.", labelEn: "present perfect subj.", hasSubject: true },
  { key: "plu_perf_subj", group: "subjunctive", labelEs: "pluscuamperfecto subj.", labelEn: "pluperfect subj.", hasSubject: true },
  { key: "tu_pos", group: "imperative", labelEs: "tú +", labelEn: "tú (affirmative)", hasSubject: true },
  { key: "tu_neg", group: "imperative", labelEs: "tú −", labelEn: "tú (negative)", hasSubject: true },
  { key: "ud", group: "imperative", labelEs: "usted", labelEn: "usted", hasSubject: true },
  { key: "uds", group: "imperative", labelEs: "ustedes", labelEn: "ustedes", hasSubject: true },
  { key: "vos_pos", group: "imperative", labelEs: "vosotros +", labelEn: "vosotros (affirmative)", hasSubject: true },
  { key: "vos_neg", group: "imperative", labelEs: "vosotros −", labelEn: "vosotros (negative)", hasSubject: true },
  { key: "nos", group: "imperative", labelEs: "nosotros", labelEn: "nosotros", hasSubject: true },
];

export const ROW_META: Record<RowKey, RowMeta> = Object.fromEntries(
  TENSE_ROWS.map((r) => [r.key, r])
) as Record<RowKey, RowMeta>;

// ── Verb attributes ──────────────────────────────────────────

export const AR = 0;
export const ER = 1;
export const IR = 2;

export const NO_SC = 0;
export const E_IE = 1;
export const E_I = 2;
export const O_UE = 3;

/** one English translation set for a verb */
export interface EnglishSet {
  /** infinitive without "to", e.g. "speak" */
  inf: string;
  /** gerund, e.g. "speaking" */
  ger: string;
  /** past participle, e.g. "spoken" */
  part: string;
  /** preterite meaning, e.g. "spoke" */
  pret: string;
  /** imperfect subjunctive meaning, e.g. "spoke" (optional) */
  impSubj?: string;
}

export interface SpecialForms {
  /** irregular yo stem (without final -o), e.g. "teng" */
  yo?: string;
  /** irregular boot stem for present (e.g. "huy", "adquier") */
  boot?: string;
  /** irregular future/conditional stem, e.g. "pondr" */
  future?: string;
  /** irregular gerund, e.g. "yendo" */
  gerund?: string;
  /** participle; array = multiple accepted (frito/freído) */
  participle?: string | [string, string];
  /** fully irregular present tense (indexed by subject 0..5) */
  pres?: string[];
  /** fully irregular imperfect (indexed by subject 0..4) */
  imp?: string[];
  /** fully irregular preterite (indexed by subject 0..4) */
  pret?: string[];
  /** fully irregular present subjunctive (indexed by subject 0..5) */
  subj?: string[];
  /** irregular tú affirmative command, e.g. "haz" */
  command?: string;
  /** irregular nosotros command, e.g. "vamos" */
  nos?: string;
}

export interface VerbAttrs {
  /** 0 = -ar, 1 = -er, 2 = -ir */
  endingType: number;
  isReflexive: boolean;
  /** 0 none, 1 e→ie, 2 e→i, 3 o→ue */
  stemChangeType: number;
  specialForms: SpecialForms;
  english: EnglishSet[];
}

// ── Level lists (exactly as the original course) ─────────────

export const SP5_VERBS = [
  "hablar", "comer", "vivir", "comenzar", "contar", "pensar", "volver", "entender",
  "dormir", "pedir", "huir", "mentir", "creer", "seguir", "andar", "conducir",
  "reír", "caber", "dar", "caer", "saber", "poner", "hacer", "ir", "estar",
  "tener", "querer", "valer",
] as const;

export const SP6_VERBS = [
  "acostarse", "adquirir", "atraer", "conseguir", "construir", "despedir",
  "divertirse", "escoger", "forzar", "freír", "elegir", "medir", "morir",
  "ofrecer", "portarse", "producir", "referir", "reñir", "sentarse",
  "sonreír", "sentirse", "sugerir", "torcer", "vestirse",
] as const;

export const ALL_VERBS: string[] = [...SP5_VERBS, ...SP6_VERBS];

export function verbLevel(verb: string): 5 | 6 {
  return (SP6_VERBS as readonly string[]).includes(verb) ? 6 : 5;
}

/** first English gloss for a verb, without "to" (e.g. hablar → "speak") */
export function verbGloss(verb: string): string {
  const attrs = VERBS[verb];
  if (!attrs || attrs.english.length === 0) return "";
  return attrs.english[0].inf;
}

/** all English glosses joined, e.g. hablar → "speak · talk" */
export function verbGlosses(verb: string): string {
  const attrs = VERBS[verb];
  if (!attrs) return "";
  return attrs.english.map((e) => e.inf).join(" · ");
}

// ── The 52 verbs (faithful port of verbinfo.js; fixed the
//    original "contruy" typo for construir) ───────────────────

function v(
  endingType: number,
  isReflexive: boolean,
  stemChangeType: number,
  specialForms: SpecialForms,
  english: EnglishSet[]
): VerbAttrs {
  return { endingType, isReflexive, stemChangeType, specialForms, english };
}

export const VERBS: Record<string, VerbAttrs> = {
  // ── Spanish 5 ──────────────────────────────────────────────
  hablar: v(AR, false, NO_SC, {}, [
    { inf: "talk", ger: "talking", part: "talked", pret: "talked" },
    { inf: "speak", ger: "speaking", part: "spoken", pret: "spoke" },
  ]),
  comer: v(ER, false, NO_SC, {}, [
    { inf: "eat", ger: "eating", part: "eaten", pret: "ate" },
  ]),
  vivir: v(IR, false, NO_SC, {}, [
    { inf: "live", ger: "living", part: "lived", pret: "lived" },
  ]),
  comenzar: v(AR, false, E_IE, {}, [
    { inf: "start", ger: "starting", part: "started", pret: "started" },
    { inf: "begin", ger: "beginning", part: "begun", pret: "began" },
  ]),
  contar: v(AR, false, O_UE, {}, [
    { inf: "count", ger: "counting", part: "counted", pret: "counted" },
  ]),
  pensar: v(AR, false, E_IE, {}, [
    { inf: "think", ger: "thinking", part: "thought", pret: "thought" },
  ]),
  volver: v(ER, false, O_UE, { participle: "vuelto" }, [
    { inf: "return", ger: "returning", part: "returned", pret: "returned" },
  ]),
  entender: v(ER, false, E_IE, {}, [
    { inf: "understand", ger: "understanding", part: "understood", pret: "understood" },
  ]),
  dormir: v(IR, false, O_UE, {}, [
    { inf: "sleep", ger: "sleeping", part: "slept", pret: "slept" },
  ]),
  pedir: v(IR, false, E_I, {}, [
    { inf: "order", ger: "ordering", part: "ordered", pret: "ordered" },
  ]),
  huir: v(IR, false, NO_SC, { boot: "huy", gerund: "huyendo" }, [
    { inf: "escape", ger: "escaping", part: "escaped", pret: "escaped" },
    { inf: "flee", ger: "fleeing", part: "fled", pret: "fled" },
  ]),
  mentir: v(IR, false, E_IE, {}, [
    { inf: "lie", ger: "lying", part: "lied", pret: "lied" },
  ]),
  creer: v(ER, false, NO_SC, { participle: "creído", gerund: "creyendo" }, [
    { inf: "believe", ger: "believing", part: "believed", pret: "believed" },
  ]),
  seguir: v(IR, false, E_I, { yo: "sig" }, [
    { inf: "follow", ger: "following", part: "followed", pret: "followed" },
  ]),
  andar: v(AR, false, NO_SC, { pret: ["anduve", "anduviste", "anduvo", "anduvimos", "anduvieron"] }, [
    { inf: "walk", ger: "walking", part: "walked", pret: "walked" },
  ]),
  conducir: v(IR, false, NO_SC, { yo: "conduzc", pret: ["conduje", "condujiste", "condujo", "condujimos", "condujeron"] }, [
    { inf: "drive", ger: "driving", part: "driven", pret: "drove" },
  ]),
  "reír": v(IR, false, E_I, { future: "reir", participle: "reído", boot: "rí", gerund: "riendo" }, [
    { inf: "laugh", ger: "laughing", part: "laughed", pret: "laughed" },
  ]),
  caber: v(ER, false, NO_SC, { future: "cabr", yo: "quep", pret: ["cupe", "cupiste", "cupo", "cupimos", "cupieron"] }, [
    { inf: "fit", ger: "fitting", part: "fit", pret: "fit" },
    { inf: "fit", ger: "fitting", part: "fitted", pret: "fitted" },
  ]),
  dar: v(AR, false, NO_SC, { pret: ["di", "diste", "dio", "dimos", "dieron"], subj: ["dé", "des", "dé", "demos", "den", "deis"], pres: ["doy", "das", "da", "damos", "dan", "dais"] }, [
    { inf: "give", ger: "giving", part: "given", pret: "gave" },
  ]),
  caer: v(ER, false, NO_SC, { participle: "caído", yo: "caig", gerund: "cayendo" }, [
    { inf: "fall", ger: "falling", part: "fallen", pret: "fell" },
  ]),
  saber: v(ER, false, NO_SC, { future: "sabr", pres: ["sé", "sabes", "sabe", "sabemos", "saben", "sabéis"], pret: ["supe", "supiste", "supo", "supimos", "supieron"], subj: ["sepa", "sepas", "sepa", "sepamos", "sepan", "sepáis"] }, [
    { inf: "know", ger: "knowing", part: "known", pret: "found out", impSubj: "knew" },
  ]),
  poner: v(ER, false, NO_SC, { yo: "pong", future: "pondr", participle: "puesto", pret: ["puse", "pusiste", "puso", "pusimos", "pusieron"], command: "pon" }, [
    { inf: "put", ger: "putting", part: "put", pret: "put" },
    { inf: "place", ger: "placing", part: "placed", pret: "placed" },
    { inf: "set", ger: "setting", part: "set", pret: "set" },
  ]),
  hacer: v(ER, false, NO_SC, { yo: "hag", future: "har", participle: "hecho", pret: ["hice", "hiciste", "hizo", "hicimos", "hicieron"], command: "haz" }, [
    { inf: "do", ger: "doing", part: "done", pret: "did" },
    { inf: "make", ger: "making", part: "made", pret: "made" },
  ]),
  ir: v(IR, false, NO_SC, { pres: ["voy", "vas", "va", "vamos", "van", "vais"], pret: ["fui", "fuiste", "fue", "fuimos", "fueron"], subj: ["vaya", "vayas", "vaya", "vayamos", "vayan", "vayáis"], command: "ve", gerund: "yendo", imp: ["iba", "ibas", "iba", "íbamos", "iban"], nos: "vamos" }, [
    { inf: "go", ger: "going", part: "gone", pret: "went" },
  ]),
  estar: v(AR, false, NO_SC, { pres: ["estoy", "estás", "está", "estamos", "están", "estáis"], pret: ["estuve", "estuviste", "estuvo", "estuvimos", "estuvieron"], subj: ["esté", "estés", "esté", "estemos", "estén", "estéis"] }, [
    { inf: "be", ger: "being", part: "been", pret: "was", impSubj: "were" },
  ]),
  tener: v(ER, false, E_IE, { yo: "teng", future: "tendr", command: "ten", pret: ["tuve", "tuviste", "tuvo", "tuvimos", "tuvieron"] }, [
    { inf: "have", ger: "having", part: "had", pret: "received", impSubj: "had" },
    { inf: "have", ger: "having", part: "had", pret: "got", impSubj: "had" },
  ]),
  querer: v(ER, false, E_IE, { pret: ["quise", "quisiste", "quiso", "quisimos", "quisieron"], future: "querr" }, [
    { inf: "want", ger: "wanting", part: "wanted", pret: "tried", impSubj: "wanted" },
    { inf: "want", ger: "wanting", part: "wanted", pret: "refused", impSubj: "wanted" },
  ]),
  valer: v(ER, false, NO_SC, { future: "valdr", command: "val", yo: "valg" }, [
    { inf: "be worth", ger: "being worth", part: "been worth", pret: "was worth", impSubj: "were worth" },
    { inf: "cost", ger: "costing", part: "cost", pret: "costed", impSubj: "costed" },
  ]),

  // ── Spanish 6 ──────────────────────────────────────────────
  acostarse: v(AR, true, O_UE, {}, [
    { inf: "go to bed", ger: "going to bed", part: "gone to bed", pret: "went to bed" },
  ]),
  adquirir: v(IR, false, NO_SC, { boot: "adquier" }, [
    { inf: "buy", ger: "buying", part: "bought", pret: "bought" },
    { inf: "acquire", ger: "acquiring", part: "acquired", pret: "acquired" },
  ]),
  atraer: v(ER, false, NO_SC, { yo: "atraig", participle: "atraído", gerund: "atrayendo", pret: ["atraje", "atrajiste", "atrajo", "atrajimos", "atrajeron"] }, [
    { inf: "attract", ger: "attracting", part: "attracted", pret: "attracted" },
  ]),
  conseguir: v(IR, false, E_I, { yo: "consig" }, [
    { inf: "obtain", ger: "obtaining", part: "obtained", pret: "obtained" },
    { inf: "get", ger: "getting", part: "gotten", pret: "got" },
  ]),
  construir: v(IR, false, NO_SC, { boot: "construy", gerund: "construyendo" }, [
    { inf: "construct", ger: "constructing", part: "constructed", pret: "constructed" },
    { inf: "build", ger: "building", part: "built", pret: "built" },
  ]),
  despedir: v(IR, false, E_I, {}, [
    { inf: "fire", ger: "firing", part: "fired", pret: "fired" },
  ]),
  divertirse: v(IR, true, E_IE, {}, [
    { inf: "have fun", ger: "having fun", part: "had fun", pret: "had fun" },
  ]),
  escoger: v(ER, false, NO_SC, { yo: "escoj" }, [
    { inf: "choose", ger: "choosing", part: "chosen", pret: "chose" },
    { inf: "select", ger: "selecting", part: "selected", pret: "selected" },
  ]),
  forzar: v(AR, false, O_UE, {}, [
    { inf: "force", ger: "forcing", part: "forced", pret: "forced" },
  ]),
  "freír": v(IR, false, E_I, { boot: "frí", participle: ["frito", "freído"], future: "freir", gerund: "friendo" }, [
    { inf: "fry", ger: "frying", part: "fried", pret: "fried" },
  ]),
  elegir: v(IR, false, E_I, { yo: "elij" }, [
    { inf: "choose", ger: "choosing", part: "chosen", pret: "chose" },
    { inf: "select", ger: "selecting", part: "selected", pret: "selected" },
  ]),
  medir: v(IR, false, E_I, {}, [
    { inf: "measure", ger: "measuring", part: "measured", pret: "measured" },
  ]),
  morir: v(IR, false, O_UE, { participle: "muerto" }, [
    { inf: "die", ger: "dying", part: "died", pret: "died" },
  ]),
  ofrecer: v(ER, false, NO_SC, { yo: "ofrezc" }, [
    { inf: "offer", ger: "offering", part: "offered", pret: "offered" },
  ]),
  portarse: v(AR, true, NO_SC, {}, [
    { inf: "behave", ger: "behaving", part: "behaved", pret: "behaved" },
  ]),
  producir: v(IR, false, NO_SC, { yo: "produzc", pret: ["produje", "produjiste", "produjo", "produjimos", "produjeron"] }, [
    { inf: "produce", ger: "producing", part: "produced", pret: "produced" },
  ]),
  referir: v(IR, false, E_IE, {}, [
    { inf: "refer", ger: "referring", part: "referred", pret: "referred" },
  ]),
  "reñir": v(IR, false, E_I, { pret: ["reñí", "reñiste", "riñó", "reñimos", "riñeron"], gerund: "riñendo" }, [
    { inf: "scold", ger: "scolding", part: "scolded", pret: "scolded" },
  ]),
  sentarse: v(AR, true, E_IE, {}, [
    { inf: "sit", ger: "sitting", part: "sat", pret: "sat" },
  ]),
  "sonreír": v(IR, false, E_I, { future: "sonreir", participle: "sonreído", boot: "sonrí", gerund: "sonriendo" }, [
    { inf: "smile", ger: "smiling", part: "smiled", pret: "smiled" },
  ]),
  sentirse: v(IR, true, E_IE, {}, [
    { inf: "feel", ger: "feeling", part: "felt", pret: "felt" },
  ]),
  sugerir: v(IR, false, E_IE, {}, [
    { inf: "suggest", ger: "suggesting", part: "suggested", pret: "suggested" },
  ]),
  torcer: v(ER, false, O_UE, { yo: "tuerz", participle: ["torcido", "tuerto"] }, [
    { inf: "twist", ger: "twisting", part: "twisted", pret: "twisted" },
  ]),
  vestirse: v(IR, true, E_I, {}, [
    { inf: "get dressed", ger: "getting dressed", part: "gotten dressed", pret: "got dressed" },
  ]),
};
