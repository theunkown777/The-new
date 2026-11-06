import roh from "@/data/leistungskatalog/sorrida-leistungskatalog.json";
import zuordnung from "@/data/leistungskatalog/zuordnung-anlaesse.json";
import type { KostentraegerCode, Leistung, Leistungskatalog } from "@/data/leistungskatalog/sorrida-leistungskatalog.types";

export type { Leistung, Leistungskatalog, KostentraegerCode };

// Einzige Quelle der Wahrheit für die Leistungen, die Endkunden sehen.
// Daten nur im Generator ändern (data/leistungskatalog/build_katalog.py für
// Zahnmedizin und Ästhetik, medizin_katalog.py für die Medizin) und danach neu bauen; hier wird nur gelesen, gesucht
// und gefiltert.

export const KATALOG = roh as Leistungskatalog;
export const LEISTUNGEN: Leistung[] = KATALOG.leistungen;
/** Bereiche in Katalogreihenfolge */
export const BEREICHE: string[] = Array.from(new Set(LEISTUNGEN.map((l) => l.bereich)));
const BY_ID = new Map(LEISTUNGEN.map((l) => [l.id, l]));

export const leistung = (id: string) => BY_ID.get(id) ?? null;

/** Bereiche in Katalogreihenfolge, je Bereich die Kategorien mit ihren Leistungen. */
export function navigation(liste: Leistung[] = LEISTUNGEN): { bereich: string; kategorien: { kategorie: string; leistungen: Leistung[] }[] }[] {
  const out: { bereich: string; kategorien: { kategorie: string; leistungen: Leistung[] }[] }[] = [];
  for (const l of liste) {
    let b = out.find((x) => x.bereich === l.bereich);
    if (!b) out.push((b = { bereich: l.bereich, kategorien: [] }));
    let k = b.kategorien.find((x) => x.kategorie === l.kategorie);
    if (!k) b.kategorien.push((k = { kategorie: l.kategorie, leistungen: [] }));
    k.leistungen.push(l);
  }
  return out;
}

export const slugBereich = (b: string) => normalisieren(b).replace(/\s+/g, "-");
export const bereichAusSlug = (s: string) => BEREICHE.find((b) => slugBereich(b) === s) ?? null;

// ------------------------------------------------------------------ Suche --

/** Kleinbuchstaben, Umlaute als ae/oe/ue/ss, Satzzeichen zu Leerzeichen. */
export function normalisieren(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " und ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const STOPP = new Set(["der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "und", "oder", "bei", "beim", "fuer", "mit", "von", "vom", "im", "in", "am", "an", "zu", "zum", "zur", "auf", "ich", "mein", "meine", "was", "wie"]);

/** Tippfehlerabstand (Damerau-Levenshtein, optimal string alignment) mit Abbruch über `max`. */
export function abstand(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let zeileMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      zeileMin = Math.min(zeileMin, d[i][j]);
    }
    if (zeileMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

const erlaubt = (len: number) => (len >= 8 ? 2 : len >= 4 ? 1 : 0);

type Index = { l: Leistung; felder: { text: string; woerter: string[]; gewicht: number }[] };
const INDEX: Index[] = LEISTUNGEN.map((l) => ({
  l,
  felder: [
    { t: l.name, g: 4 },
    ...l.synonyme.map((s) => ({ t: s, g: 3 })),
    { t: l.fachbegriff, g: 3 },
    { t: `${l.kategorie} ${l.bereich}`, g: 1 },
    { t: l.beschreibung, g: 0.5 },
  ].map(({ t, g }) => {
    const text = normalisieren(t);
    return { text, woerter: text.split(" ").filter(Boolean), gewicht: g };
  }),
}));

/** Wie gut passt ein Suchwort zu einem Feld? 1 = enthalten, 0.6 = Tippfehler, 0 = gar nicht. */
function treffer(wort: string, feld: Index["felder"][number]): number {
  if (feld.text.includes(wort)) return 1;
  // zusammengeschriebene Wörter: "kreuzbandriss" findet "kreuzband riss"
  if (wort.length >= 6 && feld.text.replace(/ /g, "").includes(wort)) return 0.9;
  const max = erlaubt(wort.length);
  if (!max) return 0;
  for (const w of feld.woerter) {
    if (abstand(wort, w, max) <= max) return 0.6;
    // Tippfehler im Wortanfang langer Wörter: "kreutzband" in "kreuzbandplastik"
    if (w.length > wort.length && abstand(wort, w.slice(0, wort.length), max) <= max) return 0.5;
  }
  return 0;
}

export type Filter = { bereich?: string | null; kt?: KostentraegerCode | null; inv?: Leistung["invasivitaet"] | null; ausfall?: string | null };

export function filtern(liste: Leistung[], f: Filter): Leistung[] {
  return liste.filter(
    (l) =>
      (!f.bereich || l.bereich === f.bereich) &&
      (!f.kt || l.kostentraeger_code === f.kt) &&
      (!f.inv || l.invasivitaet === f.inv) &&
      (!f.ausfall || l.ausfallzeit === f.ausfall),
  );
}

/**
 * Suche über Name, Fachbegriff und Synonyme (dazu Kategorie und Beschreibung
 * mit wenig Gewicht). Jedes Suchwort muss irgendwo passen; Tippfehler und
 * Umlaut-Schreibweisen (ae/oe/ue) werden toleriert.
 */
export function suchen(anfrage: string, f: Filter = {}, limit = 50): Leistung[] {
  const q = normalisieren(anfrage);
  const woerter = q.split(" ").filter((w) => w && !STOPP.has(w));
  const basis = filtern(LEISTUNGEN, f);
  if (!woerter.length) return basis.slice(0, limit);
  const erlaubteIds = new Set(basis.map((l) => l.id));
  const ergebnis: { l: Leistung; score: number }[] = [];
  for (const e of INDEX) {
    if (!erlaubteIds.has(e.l.id)) continue;
    let score = 0;
    let alle = true;
    for (const w of woerter) {
      let best = 0;
      for (const feld of e.felder) best = Math.max(best, treffer(w, feld) * feld.gewicht);
      if (!best) {
        alle = false;
        break;
      }
      score += best;
    }
    if (!alle) continue;
    // ganze Anfrage als Phrase in Name oder Synonym
    if (e.felder.slice(0, -2).some((feld) => feld.text.includes(q))) score += 5;
    // exakter Name zählt immer; ein exaktes Synonym nur, wenn es mehr als ein kurzes Allerweltswort ist
    if (normalisieren(e.l.name) === q || e.l.synonyme.some((s) => normalisieren(s) === q && q.length >= 6)) score += 10;
    ergebnis.push({ l: e.l, score });
  }
  return ergebnis.sort((a, b) => b.score - a.score || a.l.name.localeCompare(b.l.name, "de")).slice(0, limit).map((x) => x.l);
}

// ------------------------------------------------------------- Rechtliches --

/**
 * Vorher-Nachher-Bilder (§ 11 Abs. 1 S. 3 Nr. 1 HWG, BGH I ZR 170/24):
 * "ja" = Werbung damit verboten, "prüfen" = nur mit Freigabe eines Admins,
 * "nein" = kein Verbot aus dem Katalog.
 */
export function vorherNachherErlaubt(l: Pick<Leistung, "hwg_vorher_nachher">, adminFreigabe = false): boolean {
  if (l.hwg_vorher_nachher === "ja") return false;
  if (l.hwg_vorher_nachher === "prüfen") return adminFreigabe;
  return true;
}

/** Kostenhinweis für Endkunden, ohne Gebührenziffern. */
export function kostenHinweis(l: Pick<Leistung, "kostentraeger_code" | "ust_pflichtig">): string {
  switch (l.kostentraeger_code) {
    case "GKV":
      return "Leistung der gesetzlichen Krankenkasse.";
    case "GKV_EA":
      return "Die Krankenkasse zahlt, mit Eigenanteil oder Zuzahlung.";
    case "IND":
      return "Die Krankenkasse zahlt, wenn sie medizinisch notwendig ist; sonst zahlen Sie selbst.";
    case "PKV":
      return "Private Krankenversicherung; gesetzlich Versicherte zahlen selbst.";
    case "SZ":
      return l.ust_pflichtig ? "Selbstzahlerleistung, zzgl. 19 % USt." : "Selbstzahlerleistung.";
  }
}

export const KT_LABEL: Record<KostentraegerCode, string> = {
  GKV: "Kasse",
  GKV_EA: "Kasse mit Eigenanteil",
  IND: "Kasse bei Indikation",
  PKV: "Privat versichert",
  SZ: "Selbstzahler",
};

export const INV_LABEL: Record<Leistung["invasivitaet"], string> = {
  "nicht-invasiv": "ohne Eingriff",
  "minimal-invasiv": "kleiner Eingriff",
  operativ: "Operation",
};

/** Ausfallzeiten in fester Reihenfolge (für den Filter). */
export const AUSFALLZEITEN = Object.values(KATALOG.meta.legende.ausfallzeit).filter((a) => LEISTUNGEN.some((l) => l.ausfallzeit === a));

/** Welcher Katalog-Bereich gehört zu welchem Sorrida-Fach (Fachseiten verlinken dorthin). */
export const FACH_BEREICH: Record<string, string[]> = {
  zahn: ["Zahnmedizin", "Ästhetische Zahnmedizin", "Kieferorthopädie", "Mund-, Kiefer- & Gesichtschirurgie"],
  aesthetik: ["Ästhetische Medizin (minimal-invasiv)", "Plastische & Ästhetische Chirurgie", "Weitere Selbstzahler-Eingriffe"],
  hausarzt: ["Allgemeinmedizin (Hausarzt)", "Vorsorge & Check-ups", "Impfungen & Reisemedizin"],
  kardio: ["Innere Medizin"],
  gastro: ["Innere Medizin"],
  pneumo: ["Innere Medizin"],
  endo: ["Innere Medizin"],
  gyn: ["Gynäkologie & Geburtshilfe"],
  uro: ["Urologie & Andrologie"],
  ortho: ["Orthopädie & Unfallchirurgie", "Sportmedizin"],
  chirurgie: ["Chirurgie"],
  neuro: ["Neurologie"],
  psych: ["Psychiatrie, Psychotherapie & Psychosomatik"],
  kinder: ["Kinder- & Jugendmedizin"],
  hno: ["HNO (Hals-Nasen-Ohren)"],
  augen: ["Augenheilkunde"],
  haut: ["Dermatologie (medizinisch)"],
  radiologie: ["Radiologie & Nuklearmedizin"],
  physio: ["Therapieberufe (Heilmittel)"],
  ergo: ["Therapieberufe (Heilmittel)"],
  logo: ["Therapieberufe (Heilmittel)"],
  podo: ["Therapieberufe (Heilmittel)"],
  hebamme: ["Hebammenhilfe"],
  pflege: ["Pflege"],
  apotheke: ["Digitale Gesundheit & Apotheke"],
  optik: ["Hilfsmittel & Gesundheitshandwerk"],
  hoerakustik: ["Hilfsmittel & Gesundheitshandwerk"],
  sanitaetshaus: ["Hilfsmittel & Gesundheitshandwerk"],
  heilpraktiker: ["Naturheilkunde & Komplementärmedizin"],
  klinik: ["Rehabilitation & Kur"],
};

export const bereicheFuerFach = (fach: string) => (FACH_BEREICH[fach] ?? []).filter((b) => BEREICHE.includes(b));

// Von Hand geprüfte Zuordnung: Anlass im Vorschlag (fach:anlassId) → Katalog-Leistungen.
// Bestehende Anlass-IDs, Vorschläge und Links bleiben unverändert; der Katalog
// ergänzt sie nur um die Erklärung für Patientinnen und Patienten.
export const ZUORDNUNG_ANLAESSE = zuordnung as Record<string, string[]>;
export const katalogFuerAnlass = (fach: string, anlassId: string): Leistung[] =>
  (ZUORDNUNG_ANLAESSE[`${fach}:${anlassId}`] ?? []).map((id) => BY_ID.get(id)).filter((l): l is Leistung => !!l);
