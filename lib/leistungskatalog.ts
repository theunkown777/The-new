import roh from "@/data/leistungskatalog/sorrida-leistungskatalog.json";
import zuordnung from "@/data/leistungskatalog/zuordnung-anlaesse.json";
import fruehere from "@/data/leistungskatalog/fruehere-namen.json";
import type { KostentraegerCode, Leistung, Leistungskatalog } from "@/data/leistungskatalog/sorrida-leistungskatalog.types";
import type { KatalogVorschlag } from "@/lib/katalogUebernahme";
export { ohneHandelsnamen } from "@/lib/handelsnamen";

export type { Leistung, Leistungskatalog, KostentraegerCode };

// Einzige Quelle der Wahrheit für die Leistungen, die Endkunden sehen.
// Daten nur im Generator ändern (data/leistungskatalog/build_katalog.py für
// Zahnmedizin und Ästhetik, medizin_katalog.py für die Medizin) und danach neu bauen; hier wird nur gelesen, gesucht
// und gefiltert.

export const KATALOG = roh as Leistungskatalog;
export const LEISTUNGEN: Leistung[] = KATALOG.leistungen;
/** Bereiche alphabetisch: So steht kein Fach (etwa die Zahnmedizin) nur wegen der Datenreihenfolge vorne. */
const nachBereich = (a: string, b: string) => a.localeCompare(b, "de");
export const BEREICHE: string[] = Array.from(new Set(LEISTUNGEN.map((l) => l.bereich))).sort(nachBereich);
const BY_ID = new Map(LEISTUNGEN.map((l) => [l.id, l]));

export const leistung = (id: string) => BY_ID.get(id) ?? null;

/** Bereiche alphabetisch, je Bereich die Kategorien (in Katalogreihenfolge) mit ihren Leistungen. */
export function navigation(liste: Leistung[] = LEISTUNGEN): { bereich: string; kategorien: { kategorie: string; leistungen: Leistung[] }[] }[] {
  const out: { bereich: string; kategorien: { kategorie: string; leistungen: Leistung[] }[] }[] = [];
  for (const l of liste) {
    let b = out.find((x) => x.bereich === l.bereich);
    if (!b) out.push((b = { bereich: l.bereich, kategorien: [] }));
    let k = b.kategorien.find((x) => x.kategorie === l.kategorie);
    if (!k) b.kategorien.push((k = { kategorie: l.kategorie, leistungen: [] }));
    k.leistungen.push(l);
  }
  return out.sort((a, b) => nachBereich(a.bereich, b.bereich));
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

const STOPP = new Set(["der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "und", "oder", "bei", "beim", "fuer", "mit", "von", "vom", "im", "in", "am", "an", "zu", "zum", "zur", "auf", "gegen", "ich", "mein", "meine", "was", "wie"]);

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

/**
 * Suchwörter, mit denen Menschen suchen, die aber nicht angezeigt werden dürfen: Wörter mit Wirkversprechen („Brille weg“),
 * frühere werbende Namen („Fett-weg-Spritze“) und Handelsnamen von Arzneimitteln und Geräten („Botox“, „Invisalign“;
 * § 10 Abs. 1 und § 3 HWG). Sie stehen nur im Suchindex unten. Seiten, Titel, Meta-Angaben, Sitemap und „Auch gesucht als“
 * lesen nur die Felder des Katalogs; die nennen keinen Handelsnamen und werben nicht (lib/rechtsgrenzen.test.ts).
 */
const NUR_SUCHE_JE_LEISTUNG: Record<string, string[]> = {
  "zahnmedizin-professionelle-zahnreinigung": ["Airflow"],
  "zahnmedizin-digitaler-abdruck": ["iTero"],
  "zahnmedizin-frueherkennung-karies": ["DIAGNOdent"],
  "zahnmedizin-fluoridierung": ["Zahnschutz"],
  "zahnmedizin-zahnersatz-in-einer-sitzung-cerec": ["CEREC", "Same-Day-Krone"],
  "zahnmedizin-kariesinfiltration": ["Icon", "Initialkaries ohne Bohren"],
  "zahnmedizin-regenerative-parodontaltherapie": ["Emdogain"],
  "zahnmedizin-plaettchenreiches-fibrin-prf": ["A-PRF"],
  "zahnmedizin-sofortimplantat": ["Implantat am selben Tag"],
  "zahnmedizin-feste-zaehne-an-einem-tag": ["Feste Zähne an einem Tag", "All-on-4", "All-on-6"],
  "zahnmedizin-vollkeramikkrone": ["Emax"],
  "zahnmedizin-implantatgetragene-prothese": ["Locator"],
  "zahnmedizin-computergesteuerte-betaeubung": ["The Wand"],
  "aesthetische-zahnmedizin-bleaching-in-der-praxis": ["weiße Zähne"],
  "aesthetische-zahnmedizin-zahnschmuck": ["Twinkles"],
  "aesthetische-zahnmedizin-keramik-veneers": ["Hollywood-Lächeln"],
  "aesthetische-zahnmedizin-non-prep-veneers": ["Lumineers"],
  "aesthetische-zahnmedizin-digitales-smile-design": ["Smile Makeover", "Digital Smile Design", "DSD"],
  "aesthetische-zahnmedizin-komplettes-smile-makeover": ["neues Lächeln", "Smile Makeover"],
  "kieferorthopaedie-unsichtbare-zahnspange": ["unsichtbare Zahnspange", "Invisalign"],
  "kieferorthopaedie-innenliegende-zahnspange": ["Incognito"],
  "aesthetische-medizin-minimal-invasiv-brauenlifting-mit-botox": ["Fox Eyes", "Brauenlifting", "Browlift", "Chemisches Browlift", "Augenbrauen anheben", "Brauen anheben"],
  "aesthetische-medizin-minimal-invasiv-lip-flip": ["Lippen voller wirken lassen ohne Filler"],
  "aesthetische-medizin-minimal-invasiv-botox-hals": ["Nefertiti Lift"],
  "aesthetische-medizin-minimal-invasiv-gesicht-verschmaelern-masseter-botox": ["V-Shape", "Jawline slimming", "Gesicht verschmälern", "Kaumuskel verkleinern", "Masseter-Reduktion"],
  "aesthetische-medizin-minimal-invasiv-lippenunterspritzung": ["volle Lippen"],
  "aesthetische-medizin-minimal-invasiv-wangenaufbau": ["Wangenknochen betonen"],
  "aesthetische-medizin-minimal-invasiv-kinnaufbau-mit-filler": ["Kinn vergrößern"],
  "aesthetische-medizin-minimal-invasiv-nasenkorrektur-ohne-op": ["Nasenkorrektur ohne OP", "Liquid Nose Job", "15-Minuten-Nase"],
  "aesthetische-medizin-minimal-invasiv-handverjuengung": ["Hände jünger", "Handverjüngung"],
  "aesthetische-medizin-minimal-invasiv-full-face-behandlung": ["Liquid Facelift", "Liquid Lift", "8-Punkt-Lift"],
  "aesthetische-medizin-minimal-invasiv-skinbooster": ["Profhilo"],
  "aesthetische-medizin-minimal-invasiv-kollagen-stimulator": ["Sculptra", "Radiesse", "Kollagenaufbau"],
  "aesthetische-medizin-minimal-invasiv-polynukleotide": ["Rejuran"],
  "aesthetische-medizin-minimal-invasiv-vampir-lifting": ["Vampir-Lifting", "Vampire Facial"],
  "aesthetische-medizin-minimal-invasiv-fett-weg-spritze": ["Doppelkinn weg", "Fett-weg-Spritze", "Fettwegspritze"],
  "aesthetische-medizin-minimal-invasiv-microneedling": ["Dermapen"],
  "aesthetische-medizin-minimal-invasiv-radiofrequenz-microneedling": ["Morpheus8", "Potenza"],
  "aesthetische-medizin-minimal-invasiv-laser-skin-resurfacing": ["Hautverjüngung", "Fraxel"],
  "aesthetische-medizin-minimal-invasiv-ipl-photoverjuengung": ["Photoverjüngung"],
  "aesthetische-medizin-minimal-invasiv-laser-haarentfernung": ["Haare weglasern"],
  "aesthetische-medizin-minimal-invasiv-tattooentfernung": ["Tattoo weglasern"],
  "aesthetische-medizin-minimal-invasiv-aknenarben-behandeln": ["Narben glätten"],
  "aesthetische-medizin-minimal-invasiv-ultraschall-lifting": ["Facelift ohne OP", "Ultraschall-Lifting", "Ultherapy"],
  "aesthetische-medizin-minimal-invasiv-radiofrequenz-straffung": ["Radiofrequenz-Straffung", "RF-Straffung", "Thermage"],
  "aesthetische-medizin-minimal-invasiv-fett-wegfrieren": ["Fett wegfrieren", "Fettabbau Kälte", "CoolSculpting"],
  "aesthetische-medizin-minimal-invasiv-muskelaufbau-fettreduktion-per-geraet": ["Muskelaufbau per Gerät", "Body Contouring", "Emsculpt", "HIFEM"],
  "aesthetische-medizin-minimal-invasiv-haartransplantation": ["DHI"],
  "plastische-aesthetische-chirurgie-fettabsaugung": ["Vaser"],
  "plastische-aesthetische-chirurgie-bauchdeckenstraffung": ["Mommy Makeover"],
  "plastische-aesthetische-chirurgie-intimbereich-verjuengung": ["Intimverjüngung", "Intimbereich-Verjüngung"],
  "weitere-selbstzahler-eingriffe-augenlasern-lasik-femto-lasik": ["Brille weg"],
  "weitere-selbstzahler-eingriffe-augenlasern-smile": ["SMILE", "ReLEx SMILE", "schnittarmes Lasern"],
  "weitere-selbstzahler-eingriffe-linsentausch": ["ICL"],
  "weitere-selbstzahler-eingriffe-hydrafacial": ["Hydrafacial", "Aquafacial"],
  "impfungen-reisemedizin-guertelrose-impfung": ["Shingrix"],
  "allgemeinmedizin-hausarzt-ernaehrungs-und-gewichtsberatung": ["Abnehmspritze"],
  "innere-medizin-medikamentoese-adipositastherapie": ["Abnehmspritze"],
  "sportmedizin-kinesio-taping": ["Kinesiotape"],
  "dermatologie-medizinisch-muttermal-check-mit-auflichtmikroskop": ["Fotofinder"],
  "hilfsmittel-gesundheitshandwerk-hoertest-beim-hoerakustiker": ["Hörtest kostenlos"],
};

/**
 * Frühere Namen umbenannter Leistungen (id → Name) und frühere Kategorien (alt → neu), vom Generator aus id_name geschrieben.
 * Nur für die Suche und für den Abgleich mit Leistungen, die eine Praxis früher übernommen hat; nie zum Anzeigen.
 */
export const FRUEHERE_NAMEN: Record<string, string> = fruehere.namen;
export const FRUEHERE_KATEGORIEN: Record<string, string> = fruehere.kategorien;

/** Wer „Botox“ sucht, findet jede Leistung mit dem Wirkstoff Botulinumtoxin; angezeigt wird nur der Wirkstoff. */
export const BOTULINUMTOXIN_IDS = LEISTUNGEN.filter((l) => /Botulinumtoxin/.test(`${l.kategorie} ${l.name} ${l.fachbegriff}`)).map((l) => l.id);

export const NUR_SUCHE: Record<string, string[]> = {};
const nurSuche = (id: string, w: string) => {
  const liste = (NUR_SUCHE[id] ??= []);
  if (!liste.some((x) => normalisieren(x) === normalisieren(w))) liste.push(w);
};
for (const [id, woerter] of Object.entries(NUR_SUCHE_JE_LEISTUNG)) for (const w of woerter) nurSuche(id, w);
// Wer den früheren Namen kennt („Botox gegen Zähneknirschen“), findet die Leistung weiter.
for (const [id, alt] of Object.entries(FRUEHERE_NAMEN)) nurSuche(id, alt);
for (const id of BOTULINUMTOXIN_IDS) nurSuche(id, "Botox");

type Index = { l: Leistung; felder: { text: string; woerter: string[]; gewicht: number }[] };
const INDEX: Index[] = LEISTUNGEN.map((l) => ({
  l,
  felder: [
    { t: l.name, g: 4 },
    ...l.synonyme.map((s) => ({ t: s, g: 3 })),
    ...(NUR_SUCHE[l.id] ?? []).map((s) => ({ t: s, g: 3 })),
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

/**
 * Katalog-Leistung als Vorlage für eine eigene Leistung der Praxis (Einstellungen → Fachgebiet → „Aus dem Leistungskatalog
 * übernehmen“). `kasseWenn` erscheint beim Patienten als „Kasse zahlt: …“; dafür gibt es nur bei „Kasse bei Indikation“
 * einen passenden Satz. Der Katalog-Hinweis (Rechtsnorm, Altersgrenze, Vorgabe an Werbende) gehört nicht dorthin.
 */
export function alsEigeneLeistung(l: Leistung): { name: string; kategorie: string; kasse: boolean; kasseWenn?: string } {
  return {
    name: l.name,
    kategorie: l.kategorie,
    kasse: l.kostentraeger_code === "GKV" || l.kostentraeger_code === "GKV_EA",
    kasseWenn: l.kostentraeger_code === "IND" ? kostenHinweis(l) : undefined,
  };
}

/**
 * Vorschlag im Feld „Aus dem Leistungskatalog übernehmen“: dazu der frühere Name (eine Praxis, die die Leistung unter dem
 * alten Namen übernommen hat, bekommt sie nicht doppelt angeboten) und die Suchwörter. Die Seite ist nur für die Praxis
 * (Fachkreise), deshalb dürfen dort auch Handelsnamen gefunden werden („Botox“).
 */
export function katalogVorschlag(l: Leistung): KatalogVorschlag {
  const suche = (NUR_SUCHE[l.id] ?? []).join(" "); // enthält auch den früheren Namen
  return { ...alsEigeneLeistung(l), ...(FRUEHERE_NAMEN[l.id] ? { frueher: FRUEHERE_NAMEN[l.id] } : {}), ...(suche ? { suche } : {}) };
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

/**
 * Welche Katalogleistungen gehören zu welchem Sorrida-Fach. Ein Eintrag ist
 * ein Bereich ("Pflege"), eine Kategorie darin ("Innere Medizin › Kardiologie (Herz)")
 * oder eine einzelne Leistung ("#id").
 */
export const FACH_LEISTUNGEN: Record<string, string[]> = {
  zahn: ["Zahnmedizin", "Ästhetische Zahnmedizin", "Kieferorthopädie", "Mund-, Kiefer- & Gesichtschirurgie"],
  aesthetik: ["Ästhetische Medizin (minimal-invasiv)", "Plastische & Ästhetische Chirurgie", "Weitere Selbstzahler-Eingriffe › Kosmetik (nicht ärztlich)"],
  hausarzt: ["Allgemeinmedizin (Hausarzt)", "Vorsorge & Check-ups", "Impfungen & Reisemedizin", "Geriatrie & Palliativmedizin › Altersmedizin", "Arbeits- & Betriebsmedizin", "Labor & Humangenetik"],
  kardio: ["Innere Medizin › Kardiologie (Herz)", "Innere Medizin › Angiologie (Gefäße)", "#vorsorge-check-ups-herz-check", "#vorsorge-check-ups-bauchaorten-screening"],
  gastro: ["Innere Medizin › Gastroenterologie (Magen-Darm)", "#vorsorge-check-ups-darmkrebs-vorsorge-stuhltest", "#vorsorge-check-ups-vorsorge-darmspiegelung", "#labor-humangenetik-unvertraeglichkeitstests"],
  pneumo: ["Innere Medizin › Pneumologie (Lunge)", "#allgemeinmedizin-hausarzt-raucherentwoehnung", "#allgemeinmedizin-hausarzt-lungenfunktionstest"],
  endo: ["Innere Medizin › Endokrinologie & Diabetologie", "Therapieberufe (Heilmittel) › Ernährung"],
  gyn: ["Gynäkologie & Geburtshilfe", "#vorsorge-check-ups-gebaermutterhalskrebs-vorsorge", "#vorsorge-check-ups-mammographie-screening", "#vorsorge-check-ups-ultraschall-eierstoecke-gebaermutter", "#vorsorge-check-ups-ultraschall-der-brust", "#impfungen-reisemedizin-hpv-impfung"],
  uro: ["Urologie & Andrologie", "#vorsorge-check-ups-prostatakrebs-vorsorge", "#vorsorge-check-ups-psa-test", "#radiologie-nuklearmedizin-prostata-mrt"],
  ortho: ["Orthopädie & Unfallchirurgie", "Sportmedizin", "Schmerzmedizin & Anästhesie"],
  chirurgie: ["Chirurgie", "Plastische & Ästhetische Chirurgie › Haut-Chirurgie"],
  neuro: ["Neurologie"],
  psych: ["Psychiatrie, Psychotherapie & Psychosomatik"],
  kinder: ["Kinder- & Jugendmedizin", "#vorsorge-check-ups-kinder-vorsorgeuntersuchungen", "#impfungen-reisemedizin-kinderimpfungen", "#impfungen-reisemedizin-hpv-impfung"],
  hno: ["HNO (Hals-Nasen-Ohren)"],
  augen: ["Augenheilkunde", "Weitere Selbstzahler-Eingriffe › Augen", "#vorsorge-check-ups-augeninnendruck-messung"],
  haut: ["Dermatologie (medizinisch)", "Ästhetische Medizin (minimal-invasiv)", "#vorsorge-check-ups-hautkrebs-screening", "#plastische-aesthetische-chirurgie-muttermal-entfernen"],
  radiologie: ["Radiologie & Nuklearmedizin", "#vorsorge-check-ups-mammographie-screening", "#vorsorge-check-ups-ganzkoerper-mrt"],
  physio: ["Therapieberufe (Heilmittel) › Physiotherapie", "#rehabilitation-kur-reha-sport", "#naturheilkunde-komplementaermedizin-osteopathie"],
  ergo: ["Therapieberufe (Heilmittel) › Ergotherapie"],
  logo: ["Therapieberufe (Heilmittel) › Logopädie"],
  podo: ["Therapieberufe (Heilmittel) › Podologie"],
  hebamme: ["Hebammenhilfe"],
  pflege: ["Pflege", "Geriatrie & Palliativmedizin › Palliativ"],
  apotheke: ["Digitale Gesundheit & Apotheke"],
  optik: ["Hilfsmittel & Gesundheitshandwerk › Augenoptik", "#hilfsmittel-gesundheitshandwerk-brillen-kontaktlinsen"],
  hoerakustik: ["Hilfsmittel & Gesundheitshandwerk › Hörakustik", "#hilfsmittel-gesundheitshandwerk-hoergeraeteanpassung"],
  sanitaetshaus: [
    "Hilfsmittel & Gesundheitshandwerk › Sanitätshaus",
    "#hilfsmittel-gesundheitshandwerk-orthopaedische-einlagen-schuhe",
    "#hilfsmittel-gesundheitshandwerk-prothesen-orthesen",
    "#hilfsmittel-gesundheitshandwerk-kompressionsstruempfe",
    "#hilfsmittel-gesundheitshandwerk-rollstuhl-mobilitaetshilfen",
  ],
  heilpraktiker: ["Naturheilkunde & Komplementärmedizin"],
  klinik: ["Krankenhaus & Wahlleistungen", "Rehabilitation & Kur"],
};

const passt = (eintrag: string, l: Leistung) => {
  if (eintrag.startsWith("#")) return l.id === eintrag.slice(1);
  const [bereich, kategorie] = eintrag.split(" › ");
  return l.bereich === bereich && (!kategorie || l.kategorie === kategorie);
};

/** Alle Katalogleistungen eines Fachs, in Katalogreihenfolge. */
export function leistungenFuerFach(fach: string): Leistung[] {
  const e = FACH_LEISTUNGEN[fach] ?? [];
  return LEISTUNGEN.filter((l) => e.some((x) => passt(x, l)));
}

/** Bereiche, die ein Fach (ganz oder teilweise) abdeckt; für Links auf /leistungen. */
export const bereicheFuerFach = (fach: string) => Array.from(new Set(leistungenFuerFach(fach).map((l) => l.bereich)));

// Von Hand geprüfte Zuordnung: Anlass im Vorschlag (fach:anlassId) → Katalog-Leistungen.
// Bestehende Anlass-IDs, Vorschläge und Links bleiben unverändert; der Katalog
// ergänzt sie nur um die Erklärung für Patientinnen und Patienten.
export const ZUORDNUNG_ANLAESSE = zuordnung as Record<string, string[]>;
export const katalogFuerAnlass = (fach: string, anlassId: string): Leistung[] =>
  (ZUORDNUNG_ANLAESSE[`${fach}:${anlassId}`] ?? []).map((id) => BY_ID.get(id)).filter((l): l is Leistung => !!l);
