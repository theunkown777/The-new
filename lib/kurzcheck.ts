import { z } from "zod";
import { ZAEHNE, zahnNach } from "@/lib/modelle/gebiss";
import { FACH_MODELLE } from "@/lib/modelle/fach";

// Kurz-Fragebogen vor dem Termin: höchstens fünf Fragen, jede mit Bildern zum Antippen.
// 1 Wo?  2 Wie stark?  3 Seit wann?  4 Wie zeigt es sich?  5 Was ist Ihnen wichtig?
// Wer keine Beschwerden hat (nur Kontrolle), beantwortet nur Frage 1 und 5.
// Der Fragebogen sammelt Angaben des Patienten. Er bewertet nichts und stellt keine Diagnose.

/** Art der Abfrage „Wo?“: Zähne, ganzer Körper, Augen, Ohren mit Nase und Hals oder Haut. */
export type KurzArt = "zahn" | "koerper" | "auge" | "hno" | "haut";
export const KURZ_ARTEN: readonly KurzArt[] = ["zahn", "koerper", "auge", "hno", "haut"];

/**
 * Welche Abfrage zu einem Fach passt. Grundlage ist das Hauptmodell des Fachs (lib/modelle/fach.ts):
 * Gebiss → Zähne, Auge → Augen, Ohr → Ohren, Nase und Hals, Haut → Haut, sonst der Körper.
 * Ein unbekanntes oder fehlendes Fach bekommt den Körper, nie die Zähne.
 */
export function kurzArt(fach: string | null | undefined): KurzArt {
  const f = fach && Object.prototype.hasOwnProperty.call(FACH_MODELLE, fach) ? FACH_MODELLE[fach] : undefined;
  switch (f?.modelle[0]) {
    case "gebiss": return "zahn";
    case "auge": return "auge";
    case "ohr": return "hno";
    case "haut": return "haut";
    default: return "koerper";
  }
}
/** Fächer des Bewegungsapparats: Im Körpermodell lassen sich die Gelenke unter der Haut einblenden. */
export const GELENK_FAECHER: readonly string[] = ["ortho", "physio", "chirurgie", "ergo", "podo", "sanitaetshaus"];
export const gelenkeFuerFach = (fach: string | null | undefined) => !!fach && GELENK_FAECHER.includes(fach);

// ------------------------------------------------------------------ Orte
export type OrtGruppe = "kopf" | "augen" | "ohren" | "gesicht" | "rumpf" | "ruecken" | "arme" | "beine" | "ueberall" | "mund";
export type Ansicht = "vorn" | "hinten";
export interface KurzOrt {
  /** Gespeicherte Kennung: „bereich“, „bereich:seite“ oder „gesicht:teil[:seite]“, z. B. „knie:R“, „bauch:ro“, „gesicht:wange:L“ */
  id: string;
  /** Deutscher Name ohne Seite, z. B. „Knie“ */
  basis: string;
  /** Körperseite aus Sicht des Patienten */
  seite?: "R" | "L";
  gruppe: OrtGruppe;
  arten: readonly KurzArt[];
  /** Lage in der flachen Figur (400 × 880). bei = Punkt in der linken Bildhälfte; die zweite Seite liegt gespiegelt. */
  figur?: { ansicht: Ansicht; bei: [number, number]; r: number }[];
  /** Name in Einträgen von vor den genaueren Orten (Feld „stand“ fehlt): Damals war die Stelle größer gefasst. */
  alt?: string;
}

const KOERPER: readonly KurzArt[] = ["koerper", "haut"];
const KOPF: readonly KurzArt[] = ["auge", "hno"];
const UEBERALL_KOPF: readonly KurzArt[] = ["koerper", "haut", "auge", "hno"];
type Fig = [Ansicht, number, number, number];
const fig = (l?: Fig[]) => l?.map(([ansicht, x, y, r]) => ({ ansicht, bei: [x, y] as [number, number], r }));
const einzeln = (id: string, basis: string, gruppe: OrtGruppe, arten: readonly KurzArt[], f?: Fig[], alt?: string): KurzOrt =>
  ({ id, basis, gruppe, arten, ...(f ? { figur: fig(f) } : {}), ...(alt ? { alt } : {}) });
const paar = (id: string, basis: string, gruppe: OrtGruppe, arten: readonly KurzArt[], f?: Fig[], alt?: string): KurzOrt[] =>
  (["R", "L"] as const).map((s) => ({ id: `${id}:${s}`, basis, seite: s, gruppe, arten, ...(f ? { figur: fig(f) } : {}), ...(alt ? { alt } : {}) }));
const quadrant = (id: string, basis: string, seite: "R" | "L", x: number, y: number): KurzOrt => ({ id, basis, seite, gruppe: "rumpf", arten: KOERPER, figur: fig([["vorn", x, y, 17]]) });

/**
 * Alle Stellen, die ein Patient angeben kann. Grundlage für die flache Figur, die Liste der Knöpfe
 * (Tastatur und Bildschirmleser), das 3D-Modell (lib/kurzcheck3d.ts) und die Akte.
 * Ältere Kennungen bleiben gültig, damit gespeicherte Antworten lesbar bleiben.
 */
export const ORTE: KurzOrt[] = [
  // Kopf und Hals
  einzeln("kopf", "Kopf", "kopf", UEBERALL_KOPF, [["vorn", 200, 38, 22], ["hinten", 200, 52, 30]]),
  einzeln("gesicht", "Gesicht", "kopf", KOERPER, [["vorn", 200, 80, 17]]),
  ...paar("kiefergelenk", "Kiefergelenk", "kopf", ["koerper", ...KOPF]),
  einzeln("hals", "Hals", "kopf", KOERPER, [["vorn", 200, 122, 18]]),
  einzeln("nacken", "Nacken", "kopf", UEBERALL_KOPF, [["hinten", 200, 122, 20]]),
  // Augen, Ohren, Nase und Gesicht (Modell: Kopf)
  ...paar("auge", "Auge", "augen", KOPF),
  einzeln("auge:B", "Beide Augen", "augen", KOPF),
  ...paar("ohr", "Ohr", "ohren", KOPF),
  einzeln("ohr:B", "Beide Ohren", "ohren", KOPF),
  einzeln("nase", "Nase", "gesicht", KOPF),
  einzeln("rachen", "Hals und Rachen", "gesicht", KOPF),
  einzeln("gesicht:stirn", "Stirn", "gesicht", KOPF),
  ...paar("gesicht:schlaefe", "Schläfe", "gesicht", KOPF),
  ...paar("gesicht:wange", "Wange", "gesicht", KOPF),
  einzeln("gesicht:mund", "Mund und Lippen", "gesicht", KOPF),
  einzeln("gesicht:kinn", "Kinn", "gesicht", KOPF),
  // Rumpf vorn
  ...paar("brust", "Brust", "rumpf", KOERPER, [["vorn", 166, 205, 20]]),
  einzeln("brust", "Brust, Mitte", "rumpf", KOERPER, [["vorn", 200, 214, 15]], "Brust"),
  quadrant("bauch:ro", "Oberbauch", "R", 180, 280), quadrant("bauch:lo", "Oberbauch", "L", 220, 280),
  quadrant("bauch:ru", "Unterbauch", "R", 180, 324), quadrant("bauch:lu", "Unterbauch", "L", 220, 324),
  einzeln("bauch", "Bauch", "rumpf", KOERPER),
  ...paar("leiste", "Leiste", "rumpf", KOERPER, [["vorn", 176, 398, 13]]),
  // Rücken
  einzeln("ruecken_oben", "Oberer Rücken", "ruecken", KOERPER, [["hinten", 200, 210, 36]]),
  einzeln("ruecken_unten", "Unterer Rücken", "ruecken", KOERPER, [["hinten", 200, 306, 32]]),
  einzeln("gesaess", "Gesäß", "ruecken", KOERPER, [["hinten", 200, 388, 30]]),
  // Arme
  ...paar("schulter", "Schulter", "arme", KOERPER, [["vorn", 129, 165, 22], ["hinten", 129, 166, 22]]),
  ...paar("oberarm", "Oberarm", "arme", KOERPER, [["vorn", 118, 236, 16], ["hinten", 118, 236, 16]]),
  ...paar("ellenbogen", "Ellenbogen", "arme", KOERPER, [["vorn", 108, 303, 15], ["hinten", 108, 303, 15]], "Arm und Ellenbogen"),
  ...paar("unterarm", "Unterarm", "arme", KOERPER, [["vorn", 98, 366, 15], ["hinten", 98, 366, 15]]),
  ...paar("handgelenk", "Handgelenk", "arme", KOERPER, [["vorn", 88, 428, 12]]),
  ...paar("hand", "Hand und Finger", "arme", KOERPER, [["vorn", 81, 468, 17], ["hinten", 81, 468, 17]], "Hand und Handgelenk"),
  // Beine
  ...paar("huefte", "Hüfte", "beine", KOERPER, [["vorn", 144, 370, 15]], "Hüfte und Leiste"),
  ...paar("oberschenkel", "Oberschenkel", "beine", KOERPER, [["vorn", 160, 478, 22], ["hinten", 160, 478, 22]]),
  ...paar("knie", "Knie", "beine", KOERPER, [["vorn", 166, 568, 20], ["hinten", 166, 566, 18]]),
  ...paar("unterschenkel", "Unterschenkel", "beine", KOERPER, [["vorn", 168, 655, 18]]),
  ...paar("wade", "Wade und Achillessehne", "beine", KOERPER, [["hinten", 168, 668, 22]]),
  ...paar("sprunggelenk", "Sprunggelenk", "beine", KOERPER, [["vorn", 171, 744, 12]]),
  ...paar("fuss", "Fuß", "beine", KOERPER, [["vorn", 168, 786, 17], ["hinten", 168, 786, 17]], "Fuß und Sprunggelenk"),
  einzeln("ueberall", "An vielen Stellen", "ueberall", ["haut"]),
  // Mund (Zahnarztpraxis); dazu die Zähne als „zahn:NN“
  einzeln("mund:zahnfleisch", "Zahnfleisch", "mund", ["zahn"]),
  einzeln("mund:kiefergelenk", "Kiefer oder Kiefergelenk", "mund", ["zahn"]),
  einzeln("mund:zunge", "Zunge oder Mundboden", "mund", ["zahn"]),
  einzeln("mund:gaumen", "Gaumen", "mund", ["zahn"]),
  einzeln("mund:unklar", "Ich weiß nicht genau, wo", "mund", ["zahn"]),
];
export const ORT_NACH: ReadonlyMap<string, KurzOrt> = new Map(ORTE.map((o) => [o.id, o]));

/** Bereiche im Mund, die sich ohne Zahnnummer wählen lassen (Kennung ohne „mund:“). */
export const MUND_BEREICHE: { id: string; name: string }[] = ORTE.filter((o) => o.gruppe === "mund").map((o) => ({ id: o.id.slice(5), name: o.basis }));
/** Stellen einer Art in der Reihenfolge der Liste (ohne Zähne). */
export const orteFuer = (art: KurzArt): KurzOrt[] => ORTE.filter((o) => o.arten.includes(art));

const SEITE_WORT = { R: "rechts", L: "links" } as const;
/** Gültige Angabe zu „Wo?“ für diese Art: Zahn („zahn:36“), Mundbereich („mund:zahnfleisch“) oder eine Stelle aus ORTE. */
export function ortGueltig(art: KurzArt, ort: string): boolean {
  if (typeof ort !== "string" || ort.length > 30) return false;
  if (ort.startsWith("zahn:")) { const b = ort.slice(5); return art === "zahn" && /^\d\d$/.test(b) && !!zahnNach(b); }
  return !!ORT_NACH.get(ort)?.arten.includes(art);
}
/** Name einer Stelle auf Deutsch, z. B. „Knie rechts“. alt = Eintrag von vor den genaueren Orten (größer gefasste Namen). */
export function ortName(ort: string, alt = false): string {
  if (ort.startsWith("zahn:")) return `Zahn ${ort.slice(5)}`;
  const o = ORT_NACH.get(ort);
  if (!o) return ort;
  const basis = alt && o.alt ? o.alt : o.basis;
  return o.seite ? `${basis} ${SEITE_WORT[o.seite]}` : basis;
}
/** Nachbarzähne im selben Kieferviertel (zur Korrektur, wenn man einen kleinen Zahn verfehlt hat). */
export function nachbarZaehne(fdi: number): number[] {
  const q = Math.floor(fdi / 10), p = fdi % 10;
  return [p - 1, p + 1].filter((x) => x >= 1 && x <= 8).map((x) => q * 10 + x).filter((x) => ZAEHNE.some((z) => z.fdi === x));
}

export const SEIT = { heute: "seit heute", tage: "seit ein paar Tagen", wochen: "seit Wochen", monate: "seit Monaten oder länger" } as const;
export const SEIT_KURZ = { heute: "Heute", tage: "Ein paar Tage", wochen: "Wochen", monate: "Monate oder länger" } as const;

export const ZEICHEN: Record<KurzArt, { id: string; name: string }[]> = {
  zahn: [
    { id: "kalt", name: "Bei Kaltem" },
    { id: "heiss", name: "Bei Heißem oder Süßem" },
    { id: "kauen", name: "Beim Kauen oder Aufbeißen" },
    { id: "pochend", name: "Pochend, auch nachts" },
    { id: "blutet", name: "Zahnfleisch blutet" },
    { id: "geschwollen", name: "Geschwollen" },
    { id: "abgebrochen", name: "Etwas ist abgebrochen" },
    { id: "locker", name: "Zahn oder Füllung ist locker" },
  ],
  koerper: [
    { id: "stechend", name: "Stechend" },
    { id: "dumpf", name: "Dumpf oder drückend" },
    { id: "pochend", name: "Pochend" },
    { id: "brennend", name: "Brennend" },
    { id: "kribbelnd", name: "Kribbelnd oder taub" },
    { id: "steif", name: "Steif, schwer beweglich" },
    { id: "geschwollen", name: "Geschwollen" },
    { id: "bewegung", name: "Vor allem bei Bewegung" },
  ],
  auge: [
    { id: "rot", name: "Gerötet" },
    { id: "juckt", name: "Juckt oder brennt" },
    { id: "traenen", name: "Tränt" },
    { id: "trocken", name: "Trocken oder sandig" },
    { id: "verschwommen", name: "Ich sehe verschwommen" },
    { id: "licht", name: "Licht blendet" },
    { id: "druck", name: "Drückt oder schmerzt" },
    { id: "blitze", name: "Blitze, Schatten oder Flecken" },
  ],
  hno: [
    { id: "ohrdruck", name: "Druck im Ohr" },
    { id: "hoeren", name: "Ich höre schlechter" },
    { id: "geraeusch", name: "Ohrgeräusch, Pfeifen oder Rauschen" },
    { id: "schwindel", name: "Schwindel" },
    { id: "schlucken", name: "Schmerzt beim Schlucken" },
    { id: "nase", name: "Nase verstopft oder läuft" },
    { id: "heiser", name: "Heiser" },
    { id: "riechen", name: "Riechen oder Schmecken verändert" },
  ],
  haut: [
    { id: "juckt", name: "Juckt" },
    { id: "rot", name: "Gerötet" },
    { id: "schuppt", name: "Trocken oder schuppig" },
    { id: "naesst", name: "Nässt oder verkrustet" },
    { id: "blasen", name: "Bläschen oder Pickel" },
    { id: "fleck", name: "Fleck oder Muttermal verändert" },
    { id: "brennend", name: "Brennt oder schmerzt" },
    { id: "geschwollen", name: "Geschwollen" },
  ],
};

export const WICHTIG = {
  schnell: "Schnell weniger Beschwerden",
  ursache: "Verstehen, woher es kommt",
  kosten: "Kosten vorher kennen",
  angst: "Ich bin nervös vor der Behandlung",
  kontrolle: "Nur Kontrolle oder Vorsorge",
} as const;

/** Stand der Orte: 2 = genauere Orte (seit dem 3D-Modell). Fehlt er, gelten die größer gefassten Namen von damals. */
export const ORTE_STAND = 2 as const;
export const MAX_ORTE = 3;
export const kurzcheckSchema = (art: KurzArt) =>
  z
    .object({
      keine: z.boolean().default(false),
      orte: z.array(z.string().max(30)).max(MAX_ORTE).default([]),
      staerke: z.number().int().min(0).max(10).nullable().default(null),
      seit: z.enum(["heute", "tage", "wochen", "monate"]).nullable().default(null),
      zeichen: z.array(z.string().max(20)).max(4).default([]),
      wichtig: z.enum(["schnell", "ursache", "kosten", "angst", "kontrolle"]),
      notiz: z.string().max(200).transform((s) => s.replace(/\s+/g, " ").trim()).default(""),
      stand: z.literal(ORTE_STAND).optional(),
    })
    .transform((d) => (d.keine ? { ...d, orte: [], staerke: null, seit: null, zeichen: [] } : d))
    .refine((d) => d.keine || d.orte.length > 0, { message: "Bitte tippen Sie an, wo Sie Beschwerden haben." })
    .refine((d) => d.orte.every((o) => ortGueltig(art, o)), { message: "Diese Stelle gibt es nicht." })
    .refine((d) => d.keine || (d.staerke !== null && d.seit !== null), { message: "Bitte geben Sie an, wie stark und seit wann." })
    .refine((d) => d.zeichen.every((x) => ZEICHEN[art].some((e) => e.id === x)), { message: "Unbekannte Angabe." })
    .transform((d) => ({ ...d, art, orte: Array.from(new Set(d.orte)), zeichen: Array.from(new Set(d.zeichen)) }));

export type KurzAntworten = z.infer<ReturnType<typeof kurzcheckSchema>>;

/** Gespeicherte Antworten wieder lesen. Die Art wird ausdrücklich geprüft: Unbekanntes oder Kaputtes ergibt null. */
export function kurzcheckLesen(wert: unknown): KurzAntworten | null {
  const art = wert && typeof wert === "object" ? (wert as { art?: unknown }).art : undefined;
  if (typeof art !== "string" || !(KURZ_ARTEN as readonly string[]).includes(art)) return null;
  const p = kurzcheckSchema(art as KurzArt).safeParse(wert);
  return p.success ? p.data : null;
}

export const staerkeWort = (n: number) => (n === 0 ? "keine" : n <= 3 ? "leicht" : n <= 6 ? "mittel" : n <= 8 ? "stark" : "sehr stark");

/** Die Antworten in Sätzen, so wie die Praxis sie in der Akte liest. */
export function kurzcheckText(a: KurzAntworten): string[] {
  const zeilen: string[] = [];
  if (a.keine) zeilen.push("Keine Beschwerden angegeben.");
  else {
    zeilen.push(`Wo: ${a.orte.map((o) => ortName(o, a.stand !== ORTE_STAND)).join(", ")}`);
    zeilen.push(`Wie stark: ${a.staerke} von 10 (${staerkeWort(a.staerke ?? 0)}), ${a.seit ? SEIT[a.seit] : ""}`);
    if (a.zeichen.length) zeilen.push(`Wie es sich zeigt: ${a.zeichen.map((x) => ZEICHEN[a.art].find((e) => e.id === x)?.name ?? x).join(", ")}`);
  }
  zeilen.push(`Wichtig für den Termin: ${WICHTIG[a.wichtig]}`);
  if (a.notiz) zeilen.push(`Eigene Worte: „${a.notiz}“`);
  return zeilen;
}
