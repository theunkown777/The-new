// Ordnung der amtlichen Leistungen je Fach: welche Verzeichnisse eine Praxis
// in welcher Reihenfolge sieht, welche regionalen KV-Ziffern zu ihr passen und
// welchem Fach eine regionale Ziffer inhaltlich gehört.

/** Eigener, leerer Sitzungstyp je Praxis: Leistungen kommen ausschließlich aus dem Leistungsverzeichnis. */
export const FREIE_ZUSAMMENSTELLUNG = "Freie Zusammenstellung aus dem Leistungsverzeichnis";

/** Die 17 KV-Bezirke; Kürzel wie im Code der regionalen Ziffern ("BW 40190"). */
export const KV_BEZIRKE: { id: string; name: string }[] = [
  { id: "BW", name: "KV Baden-Württemberg" },
  { id: "BY", name: "KV Bayern" },
  { id: "BE", name: "KV Berlin" },
  { id: "BB", name: "KV Brandenburg" },
  { id: "HB", name: "KV Bremen" },
  { id: "HH", name: "KV Hamburg" },
  { id: "HE", name: "KV Hessen" },
  { id: "MV", name: "KV Mecklenburg-Vorpommern" },
  { id: "NI", name: "KV Niedersachsen" },
  { id: "NO", name: "KV Nordrhein" },
  { id: "RP", name: "KV Rheinland-Pfalz" },
  { id: "SL", name: "KV Saarland" },
  { id: "SN", name: "KV Sachsen" },
  { id: "ST", name: "KV Sachsen-Anhalt" },
  { id: "SH", name: "KV Schleswig-Holstein" },
  { id: "TH", name: "KV Thüringen" },
  { id: "WL", name: "KV Westfalen-Lippe" },
];
export const kvName = (id: string | null | undefined) => KV_BEZIRKE.find((k) => k.id === id)?.name ?? null;

const ARZT = ["EBM", "KV_REGIONAL", "GOAE", "UVGOAE", "OPS", "HEILMITTEL", "HMV", "HMV_PRODUKT"];

/** Reihenfolge der Verzeichnisse je Fach: das Wichtigste für diese Praxisart zuerst. */
export const REIHENFOLGE: Record<string, string[]> = {
  zahn: ["BEMA", "GOZ", "OPS"],
  hausarzt: ["EBM", "KV_REGIONAL", "GOAE", "UVGOAE", "HEILMITTEL", "OPS"],
  kinder: ["EBM", "KV_REGIONAL", "GOAE", "UVGOAE", "HEILMITTEL", "OPS"],
  gyn: ["EBM", "KV_REGIONAL", "GOAE", "OPS", "UVGOAE"],
  ortho: ["EBM", "KV_REGIONAL", "GOAE", "UVGOAE", "OPS", "HEILMITTEL", "HMV", "HMV_PRODUKT"],
  chirurgie: ["EBM", "KV_REGIONAL", "GOAE", "UVGOAE", "OPS"],
  klinik: ["OPS", "GOAE", "EBM", "UVGOAE", "KV_REGIONAL"],
  physio: ["HEILMITTEL", "HMV", "HMV_PRODUKT"],
  ergo: ["HEILMITTEL", "HMV", "HMV_PRODUKT"],
  logo: ["HEILMITTEL", "HMV", "HMV_PRODUKT"],
  podo: ["HEILMITTEL", "HMV", "HMV_PRODUKT"],
  hebamme: ["HEBAMME", "OPS"],
  pflege: ["HKP", "SGB_XI", "HMV", "HMV_PRODUKT"],
  apotheke: ["APOTHEKE", "HMV", "HMV_PRODUKT"],
  hoerakustik: ["HMV", "HMV_PRODUKT"],
  optik: ["HMV", "HMV_PRODUKT"],
  sanitaetshaus: ["HMV", "HMV_PRODUKT"],
  heilpraktiker: ["HEILPRAKTIKER"],
};
export const reihenfolge = (fach: string) => REIHENFOLGE[fach] ?? ARZT;
export const sortiereSysteme = <T extends { system: string }>(fach: string, liste: T[]) => {
  const r = reihenfolge(fach);
  const pos = (s: string) => (r.indexOf(s) < 0 ? 99 : r.indexOf(s));
  return [...liste].sort((a, b) => pos(a.system) - pos(b.system) || a.system.localeCompare(b.system));
};

/**
 * Regionale KV-Ziffern sind in den Listen der KVen nicht nach Fach getrennt.
 * Zuordnung nach Inhalt (Text und Abschnitt); ohne Treffer bleibt die Ziffer
 * bei allen Arztgruppen, weil sie dann meist fachübergreifend ist (Wegepauschalen,
 * Terminvermittlung, Kennzeichnungen).
 */
const KV_REGELN: [RegExp, string[]][] = [
  [/schwanger|mutterschaft|empfängnis|befruchtung|geburt|gyn|frauenarzt|mamma|brustkrebs|zervix|chlamydien|verhütung|mädchensprechstunde|hallo baby/i, ["gyn"]],
  [/\bU ?1[01]\b|\bJ ?2\b|kinder|jugend|säugling|neugeboren|sozialpädiatr|amblyopie/i, ["kinder", "hausarzt"]],
  [/psychotherap|psychiatr|psychosomat|verhaltenstherap|tiefenpsych|analytische|probatorisch|sozialpsychiatr|sucht|substitution/i, ["psych"]],
  [/augen|intravitreal|amd\b|makula|glaukom|katarakt/i, ["augen"]],
  [/haut|dermat|psoriasis|neurodermitis|hautkrebs/i, ["haut", "hausarzt"]],
  [/diabet|fußsyndrom|insulin/i, ["hausarzt", "endo"]],
  [/asthma|copd|lunge|pneumo|spirometr/i, ["hausarzt", "pneumo"]],
  [/khk|koronar|herzinsuff|herz|kardio|antikoagulation|hypertonie/i, ["hausarzt", "kardio"]],
  [/rheuma|arthritis|osteoporose|orthopäd|wirbelsäule|rücken|orthohero/i, ["ortho", "hausarzt"]],
  [/darm|ced\b|colitis|crohn|koloskop|gastro|endoskop/i, ["gastro", "hausarzt"]],
  [/onkolog|tumor|krebs|chemo|palliativ/i, ["hausarzt", "gastro", "gyn", "uro", "klinik"]],
  [/uro|prostata|harn|blase/i, ["uro"]],
  [/hno|hör|tinnitus|phoniatr|tonsill/i, ["hno"]],
  [/neuro|schlaganfall|epilep|parkinson|multiple sklerose|demenz/i, ["neuro", "hausarzt"]],
  [/impf/i, ["hausarzt", "kinder", "gyn"]],
  [/dialyse|niere|nephro/i, ["klinik", "hausarzt"]],
  [/radiolog|mammograph|röntgen|\bct\b|\bmrt\b|kontrastmittel|nuklear/i, ["radiologie"]],
  [/anästhes|narkose|ambulante operation|aop|operativ|chirurg|hybrid-drg|belegarzt/i, ["chirurgie", "ortho", "klinik"]],
  [/labor|laboratorium/i, ["hausarzt", "klinik"]],
  [/hausarzt|hzv|hausärzt|versorgungspauschale|chroniker|check ?up|gesundheitsuntersuchung|pflegeheim|hausbesuch|geriatr/i, ["hausarzt"]],
  [/homöopath|akupunktur|naturheil/i, ["hausarzt"]],
];

export function kvFaecher(text: string, abschnitt: string | null, standard: string[]): string[] {
  const t = `${text} ${abschnitt ?? ""}`;
  const aus = new Set<string>();
  for (const [re, f] of KV_REGELN) if (re.test(t)) f.forEach((x) => aus.add(x));
  return aus.size ? Array.from(aus) : standard;
}

/** Filter für amtliche Leistungen einer Praxis: eigenes Fach; regionale Ziffern nur aus dem eigenen KV-Bezirk. */
export function fachFilter(fach: string, kvBezirk: string | null) {
  const kv = kvName(kvBezirk);
  return {
    faecher: { has: fach },
    NOT: kv ? { system: "KV_REGIONAL", NOT: { kapitel: kv } } : { system: "KV_REGIONAL" },
  };
}
