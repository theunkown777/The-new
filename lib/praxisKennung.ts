import { ALLE_SPECIALTIES, isDental, isTherapie, specialty } from "@/lib/specialties";
import { leseStammdaten } from "@/lib/praxisStammdaten";
import { GRUPPEN_FARBE, GRUPPEN_SYMBOL, type PraxisGruppe } from "@/lib/praxisGruppe";

// Kennzeichen einer Praxis für die Seiten, die Patienten sehen: Name, Fach kurz, Ort, Gruppe, Farbe, Monogramm.
// Wer bei mehreren Praxen in Behandlung ist (Hausarzt und Zahnarzt), soll die Portale auf einem Gerät
// auseinanderhalten können. Reine Funktionen ohne Datenbank: Alles kommt aus den Angaben der einen Praxis,
// die die Seite ohnehin lädt. Es wird nichts zwischen Praxen verglichen oder verbunden.

export interface PraxisKennzeichen {
  /** voller Name der Praxis, wie sie ihn eingetragen hat */
  name: string;
  /** kurzer Name für den Startbildschirm (short_name, Titel der Web-App auf dem iPhone), höchstens 12 Zeichen */
  kurzName: string;
  /** „Zahnarztpraxis“, „Hausarztpraxis“, „Physiotherapie-Praxis“ … */
  fachKurz: string;
  /** Ort aus den Angaben der Praxis (ohne Postleitzahl), leer, wenn nichts eingetragen ist */
  ort: string;
  gruppe: PraxisGruppe;
  /** Farbe der Gruppe auf hellem Grund */
  farbe: string;
  /** Farbe der Gruppe auf dunklem Grund */
  farbeDunkel: string;
  /** ein oder zwei Großbuchstaben aus dem kurzen Namen */
  monogramm: string;
  symbol: (typeof GRUPPEN_SYMBOL)[PraxisGruppe];
}

export const KURZNAME_MAX = 12;

export function praxisGruppe(fach: string | null | undefined): PraxisGruppe {
  if (isDental(fach)) return "zahn";
  return isTherapie(specialty(fach)) ? "therapie" : "arzt";
}

export function fachKurz(fach: string | null | undefined): string {
  if (isDental(fach)) return "Zahnarztpraxis";
  return specialty(fach)?.kurz ?? "Praxis";
}

/** „48143 Münster“ → „Münster“. Nur der Ort, damit die Zeile kurz bleibt. */
export function ortAus(stammdaten: unknown): string {
  const plzOrt = leseStammdaten(stammdaten).plzOrt;
  return plzOrt.replace(/^\s*(?:D\s*-\s*)?\d{4,5}\s*/i, "").replace(/\s+/g, " ").trim().slice(0, 60);
}

// Wörter, die in fast jedem Praxisnamen stehen und auf dem Startbildschirm nichts unterscheiden.
const TITEL = /^(dr|dres|drs|prof|med|dent|univ|dipl|vet|rer|nat|phil|habil|mult|pd|priv|doz|msc|ma|ba)\.?$/i;
const RECHTSFORM = /^(mvz|bag|gmbh|ggmbh|ug|gbr|partg|partgmbb|ag|kg|ohg|e\.?\s?v\.?|& co\.?)$/i;
const ARZTWORT = /^(zahn|haus|fach|frauen|augen|haut|kinder|kiefer|hno-?)?(arzt|ärztin|ärzte|ärztinnen|aerzt|aerztin|aerzte)$/i;
const VERBINDER = /^(für|fuer|und|&|\+|-|·|\|)$/i;
const KLEINWORT = /^(am|an|im|in|der|die|das|den|dem|zum|zur|von|vom|bei|beim|auf|und|für|fuer)$/i;
const FACHWOERTER: Set<string> = new Set(
  [
    ...ALLE_SPECIALTIES.flatMap((s) => [...s.name.split(/[\s,()]+/), ...s.kurz.split(/[\s,()]+/)]),
    "Zahnmedizin", "Zahnheilkunde", "Kieferorthopädie", "Implantologie", "Oralchirurgie", "Prophylaxe", "Gemeinschaftspraxis",
    "Privatpraxis", "Praxisgemeinschaft", "Zahnarztpraxis", "Zahnärzte", "Gesundheitszentrum", "Therapiezentrum", "Medizinisches", "Versorgungszentrum",
  ]
    .map((w) => w.replace(/[^\p{L}-]/gu, "").toLowerCase())
    .filter((w) => w.length >= 5),
);

function allgemein(wort: string): boolean {
  const w = wort.replace(/^[„"'(]+|[“"'),.:;]+$/g, "");
  if (!w) return true;
  if (/praxis$/i.test(w.replace(/-/g, ""))) return true;
  if (TITEL.test(w) || /^((dr|dres|prof|med|dent|univ|dipl)\.)+$/i.test(w)) return true;
  if (RECHTSFORM.test(w) || ARZTWORT.test(w)) return true;
  return FACHWOERTER.has(w.toLowerCase());
}

/** Verbindewörter am Anfang und am Ende weg („für Kinder“ → „Kinder“, „Müller &“ → „Müller“); „am Markt“ bleibt. */
const ohneRand = (woerter: string[]) => {
  const a = [...woerter];
  while (a.length && VERBINDER.test(a[0])) a.shift();
  while (a.length && (VERBINDER.test(a[a.length - 1]) || KLEINWORT.test(a[a.length - 1]))) a.pop();
  return a;
};

/**
 * Kurzer Name für den Startbildschirm. Allgemeine Wörter (Praxis, Dr. med., Fach, Rechtsform, „(Demo)“) fallen weg,
 * übrig bleibt, was die Praxis unterscheidet: „Zahnarztpraxis Dr. Sonnenberg“ → „Sonnenberg“, „Praxis Dr. Anna Weber“
 * → „Anna Weber“, „Hausarztpraxis am Markt“ → „Am Markt“. Passt der ganze Name, bleibt er stehen.
 */
export function kurzerPraxisname(name: string, fach?: string | null): string {
  const voll = name.replace(/\s+/g, " ").trim();
  if (voll.length <= KURZNAME_MAX) return voll || fachWort(fach);
  const ohneKlammern = voll.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  // Nur der erste Teil vor Komma, Strich oder Punkt in der Mitte („Dr. Anna Weber, Fachärztin für …“).
  const teile = ohneKlammern.split(/\s*(?:,|\s[|·–—-]\s)\s*/).filter(Boolean);
  for (const teil of teile.length ? teile : [ohneKlammern]) {
    const kern = ohneRand(teil.split(" ").filter((w) => !allgemein(w)));
    if (!kern.length) continue;
    const text = kern.join(" ");
    const gross = text.charAt(0).toLocaleUpperCase("de-DE") + text.slice(1);
    if (gross.length <= KURZNAME_MAX) return gross;
    // Zu lang: Wörter von vorn, solange sie passen; sonst das erste Wort gekürzt (das Gerät setzt selbst „…“).
    let aus = "";
    for (const w of gross.split(" ")) {
      const naechst = aus ? `${aus} ${w}` : w;
      if (naechst.length > KURZNAME_MAX) break;
      aus = naechst;
    }
    const ergebnis = ohneRand((aus || gross.slice(0, KURZNAME_MAX)).split(" ")).join(" ");
    return ergebnis || gross.slice(0, KURZNAME_MAX);
  }
  return fachWort(fach);
}

/** „Hausarztpraxis“ → „Hausarzt“, für Namen, die nur aus allgemeinen Wörtern bestehen. */
function fachWort(fach?: string | null): string {
  const f = fachKurz(fach).replace(/[- ]?praxis$/i, "").trim() || "Praxis";
  return f.slice(0, KURZNAME_MAX);
}

/** „Anna Weber“ → „AW“, „Sonnenberg“ → „S“, „Am Markt“ → „M“. */
export function monogramm(kurzName: string): string {
  const woerter = kurzName.split(/[\s-]+/).filter((w) => /\p{L}/u.test(w) && !KLEINWORT.test(w));
  const buchstaben = (woerter.length ? woerter : kurzName.split(/\s+/)).map((w) => (w.match(/\p{L}/u) ?? [""])[0].toLocaleUpperCase("de-DE"));
  return (buchstaben.length > 1 ? buchstaben[0] + buchstaben[buchstaben.length - 1] : buchstaben[0] ?? "").slice(0, 2) || "P";
}

export function praxisKennzeichen(praxis: { name: string; specialty?: string | null; stammdaten?: unknown }): PraxisKennzeichen {
  const gruppe = praxisGruppe(praxis.specialty);
  const kurzName = kurzerPraxisname(praxis.name, praxis.specialty);
  return {
    name: praxis.name.replace(/\s+/g, " ").trim(),
    kurzName,
    fachKurz: fachKurz(praxis.specialty),
    ort: ortAus(praxis.stammdaten),
    gruppe,
    farbe: GRUPPEN_FARBE[gruppe].farbe,
    farbeDunkel: GRUPPEN_FARBE[gruppe].farbeDunkel,
    monogramm: monogramm(kurzName),
    symbol: GRUPPEN_SYMBOL[gruppe],
  };
}

/** Zeile unter dem Praxisnamen: „Zahnarztpraxis · Münster“ (ohne Ort nur das Fach). */
export const kennzeile = (k: Pick<PraxisKennzeichen, "fachKurz" | "ort">) => [k.fachKurz, k.ort].filter(Boolean).join(" · ");
