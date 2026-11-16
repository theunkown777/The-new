// Vom Satz zum Vorschlag: ordnet Stichworte aus dem Gespräch den Anlässen eines Fachs zu.
// Rein regelbasiert, ohne KI und ohne Netz: Das Ergebnis ist vorhersehbar, sofort da und
// verlässt den Browser nicht. Es ist nur eine Vorschlagsliste. Angekreuzt wird ein Anlass
// erst, wenn die Person in der Praxis ihn bestätigt.
//
// Woher die Wörter kommen:
// - aus den Bezeichnungen der Anlässe und ihrer Leistungen (lib/specialties.ts, lib/fachangebote.ts),
// - aus der Tabelle SYNONYME unten (übliche Wörter aus dem Praxisalltag je Anlass).
// Umlaute (ä/ae), Groß- und Kleinschreibung, Wortendungen und zusammengesetzte Wörter werden
// ausgeglichen. Verneinte Stichworte („kein Tinnitus“, „ohne Akupunktur“, „nicht gewünscht“)
// werden nicht vorgeschlagen, sondern getrennt als verneint gemeldet.

export interface AnlassEintrag {
  id: string;
  label: string;
  /** Kategorie wie „Vorsorge“ oder „Reisemedizin“. */
  bereich?: string;
  /** Namen der Leistungen des Anlasses. */
  optionen?: string[];
}

export interface ErkannterAnlass {
  id: string;
  label: string;
  /** Die Wörter aus dem Text, an denen der Anlass erkannt wurde. */
  treffer: string[];
  punkte: number;
}

export interface AnlassErkennung {
  erkannt: ErkannterAnlass[];
  /** Im Text genannt, aber verneint: wird nicht vorgeschlagen. */
  verneint: { id: string; label: string; treffer: string[] }[];
}

/** Übliche Wörter je Anlass. Schlüssel: „fach:anlass“ oder, wenn die Bedeutung in jedem Fach gleich ist, nur „anlass“. */
export const SYNONYME: Record<string, string[]> = {
  // Hausarztpraxis
  checkup: ["Check-up", "Gesundheitscheck", "Gesundheitsuntersuchung", "durchchecken", "Blutwerte", "Blutbild", "Labor", "Vitamin D"],
  reise: ["Reise", "Urlaub", "Fernreise", "Auslandsreise", "Reiseimpfung", "Reiseimpfungen", "Malaria", "Tropen", "Gelbfieber"],
  sport: ["Sportuntersuchung", "Sporttauglichkeit", "Sportcheck", "Sportmedizin", "Marathon", "Wettkampf", "Belastungs-EKG"],
  impfen: ["Impfung", "impfen", "Auffrischung", "Auffrischimpfung", "Tetanus", "Grippe", "Grippeimpfung", "Gürtelrose", "STIKO", "Impfpass"],
  chroniker: ["Diabetes", "KHK", "Asthma", "COPD", "DMP", "Chroniker", "Chronikerprogramm", "Behandlungsprogramm", "koronare Herzkrankheit"],
  // Augenheilkunde
  glaukom: ["Glaukom", "Grüner Star", "Augendruck", "Augeninnendruck", "Sehnerv", "Glaukomvorsorge"],
  netzhaut: ["Netzhaut", "Makula", "AMD", "Makuladegeneration", "Makulaödem", "OCT"],
  fuehrerschein: ["Führerschein", "Sehtest", "Fahrerlaubnis", "Gutachten", "Fahrtauglichkeit"],
  trockenes_auge: ["trockene Augen", "trockenes Auge", "Augenbrennen", "Sicca", "Lidrand", "IPL", "tränende Augen"],
  lasern: ["Augenlasern", "lasern", "LASIK", "Linsenchirurgie", "ohne Brille", "Brille loswerden", "Femto"],
  // Dermatologie
  hautkrebs: ["Hautkrebs", "Hautkrebsscreening", "Screening", "Muttermal", "Muttermale", "Leberfleck", "Leberflecke", "Melanom", "Auflicht", "Auflichtmikroskopie", "Dermatoskopie", "Videodermatoskopie", "Hautcheck"],
  "haut:aesthetik": ["Ästhetik", "ästhetisch", "kosmetisch", "Peeling", "Laserbehandlung", "Äderchen", "Couperose"],
  haare: ["Haarausfall", "Haare", "Haaranalyse", "Trichogramm", "Haarverlust"],
  akne: ["Akne", "Pickel", "Hautbild", "unreine Haut", "Mitesser", "Peeling"],
  // Frauenheilkunde
  krebsvorsorge: ["Krebsvorsorge", "Krebsfrüherkennung", "Abstrich", "PAP", "Gebärmutter", "Gebärmutterhals", "Eierstöcke", "HPV-Test"],
  brust: ["Brust", "Brustultraschall", "Tastuntersuchung", "Brustkrebs", "Mammasonographie"],
  schwangerschaft: ["schwanger", "Schwangerschaft", "Toxoplasmose", "3D-Ultraschall", "Mutterschaftsvorsorge", "SSW"],
  verhuetung: ["Verhütung", "verhüten", "Pille", "Spirale", "Kupferspirale", "Hormonspirale"],
  wechseljahre: ["Wechseljahre", "Menopause", "Hitzewallungen", "Hormonstatus", "Klimakterium"],
  hpv: ["HPV-Impfung", "Impfung gegen HPV"],
  // Urologie
  prostata: ["Prostata", "PSA", "PSA-Test", "Prostatakrebs", "Krebsvorsorge", "Tastuntersuchung"],
  inkontinenz: ["Inkontinenz", "Blasenschwäche", "Urinverlust", "Harnverlust", "Beckenboden", "Restharn", "Reizblase"],
  hwi: ["Harnwegsinfekt", "Harnwegsinfekte", "Blasenentzündung", "HWI", "Zystitis", "Urinkultur", "Brennen beim Wasserlassen"],
  maennergesundheit: ["Erektionsstörung", "Erektion", "Potenz", "Potenzstörung", "Impotenz", "Testosteron", "Männergesundheit"],
  vasektomie: ["Vasektomie", "Sterilisation", "sterilisieren", "Samenleiter"],
  // Orthopädie
  gelenkschmerz: ["Gelenkschmerz", "Gelenkschmerzen", "Gelenk", "Knie", "Knieschmerzen", "Schulter", "Hüfte", "Arthrose", "Sehne", "Sehnenschmerz", "Tennisarm", "Tennisellenbogen", "Fersensporn", "Kalkschulter", "Stoßwelle", "Stoßwellentherapie", "Hyaluron", "Hyaluronsäure", "Akupunktur"],
  osteoporose: ["Osteoporose", "Knochendichte", "Knochendichtemessung", "DXA", "Knochenschwund"],
  ruecken: ["Rücken", "Rückenschmerzen", "Kreuzschmerz", "Kreuzschmerzen", "LWS", "HWS", "Bandscheibe", "Hexenschuss", "Ischias", "Wirbelsäule", "Lumbago", "Nacken", "Verspannung", "Akupunktur"],
  arbeitsunfall: ["Arbeitsunfall", "Wegeunfall", "Berufsgenossenschaft", "BG", "BG-Fall", "Unfall bei der Arbeit", "D-Arzt", "Durchgangsarzt"],
  // HNO
  hoeren: ["Hörtest", "hören", "schwerhörig", "Schwerhörigkeit", "Hörminderung", "hört schlecht", "hört nicht gut", "Audiometrie", "Hörsturz"],
  schnarchen: ["schnarchen", "schnarcht", "Schlafapnoe", "Atemaussetzer", "Schlaflabor", "Polygraphie"],
  tinnitus: ["Tinnitus", "Ohrgeräusch", "Ohrgeräusche", "Ohrensausen", "Pfeifen im Ohr", "Klingeln im Ohr"],
  allergie: ["Allergie", "Heuschnupfen", "Allergietest", "Pollen", "Hyposensibilisierung", "Desensibilisierung", "Pricktest", "Hausstaub"],
  // Kinder- und Jugendmedizin
  vorsorge_kind: ["U-Untersuchung", "Vorsorgeuntersuchung", "Kindervorsorge", "U1", "U2", "U3", "U4", "U5", "U6", "U7", "U7a", "U8", "U9", "J1", "gelbes Heft"],
  sport_kind: ["Sporttauglichkeit", "Sportbescheinigung", "Sportattest", "Bescheinigung", "Attest", "Verein", "Reise", "Reiseimpfung", "Urlaub"],
  impfen_kind: ["Impfung", "impfen", "Impfkalender", "Masern", "MMR", "Sechsfachimpfung", "STIKO", "Auffrischung", "Impfpass"],
  u10: ["U10", "U11", "J2"],
  // Kardiologie
  herzcheck: ["Herz-Check", "Herzvorsorge", "Herzuntersuchung", "Halsschlagader", "Halsschlagadern", "Carotis", "Belastungs-EKG", "Ergometrie"],
  rhythmus: ["Herzrhythmusstörung", "Rhythmusstörung", "Vorhofflimmern", "Herzstolpern", "Herzrasen", "Langzeit-EKG", "Smartwatch", "Extrasystolen"],
  sportkardio: ["Sportkardiologie", "Leistungssport", "Sportuntersuchung", "Sporttauglichkeit", "Herzultraschall", "Marathon", "Wettkampf"],
  // Radiologie
  mrt_wunsch: ["MRT", "CT", "Kernspin", "Kernspintomographie", "Ganzkörper-MRT", "Schnittbild", "Computertomographie"],
  mamma: ["Mammographie", "Mammografie", "Brustkrebs", "Brust", "Screening"],
  knochen: ["Knochendichte", "Knochendichtemessung", "DXA", "Osteoporose"],
  // Neurologie
  gedaechtnis: ["Gedächtnis", "vergesslich", "Vergesslichkeit", "Demenz", "Konzentration", "Konzentrationsstörung", "Gedächtnistest", "Alzheimer"],
  gefaesse: ["Gefäße", "Gefäßultraschall", "Halsschlagader", "Halsschlagadern", "Carotis", "Doppler", "Duplex"],
  kopfschmerz: ["Kopfschmerz", "Kopfschmerzen", "Migräne", "Spannungskopfschmerz", "Akupunktur"],
  // Psychiatrie und Psychotherapie
  therapieplatz: ["Psychotherapie", "Therapieplatz", "Therapie", "Depression", "Angst", "Angststörung", "Panik", "Verhaltenstherapie", "Sprechstunde"],
  coaching: ["Coaching", "Stress", "Stressbewältigung", "Lebensberatung", "Paarberatung", "ohne Krankheitswert"],
  // Gastroenterologie
  darm: ["Darmkrebs", "Darmkrebsvorsorge", "Darmspiegelung", "Koloskopie", "Stuhltest", "Blut im Stuhl"],
  unvertraeglich: ["Unverträglichkeit", "Nahrungsmittelunverträglichkeit", "Intoleranz", "Atemtest", "Laktose", "Fruktose", "Laktoseintoleranz", "Histamin", "Gluten", "Zöliakie"],
  atemtest: ["Reizdarm", "H2-Atemtest", "Atemtest", "Laktose", "Fruktose", "Blähungen", "Unverträglichkeit"],
  // Pneumologie
  lunge: ["Lunge", "Lungenfunktion", "Lungen-Check", "Spirometrie", "Atemnot", "Luftnot", "Husten", "Raucher-Check", "Asthma", "COPD"],
  rauchstopp: ["Rauchstopp", "Rauchentwöhnung", "Rauchen aufhören", "aufhören zu rauchen", "Nichtraucher", "Nikotin", "rauchfrei"],
  // Endokrinologie und Diabetologie
  glukose: ["Glukosesensor", "Sensor", "CGM", "Glukosemessung", "Blutzucker", "Zuckermessung", "Diabetes", "Insulin"],
  schilddruese: ["Schilddrüse", "TSH", "Schilddrüsenwerte", "Hashimoto", "Struma", "Schilddrüsenultraschall"],
  ernaehrung: ["Ernährung", "Ernährungsberatung", "abnehmen", "Übergewicht", "Adipositas", "Diät", "Gewicht"],
  // Chirurgie, Phlebologie
  venen: ["Krampfadern", "Krampfader", "Besenreiser", "Venen", "Varizen", "Verödung", "veröden", "schwere Beine"],
  haut_entfernung: ["Hautveränderung", "Muttermal", "Leberfleck", "Warze", "Lipom", "Atherom", "Fibrom", "Entfernung", "entfernen"],
  // Plastische und Ästhetische Chirurgie
  gesicht: ["Falten", "Faltenbehandlung", "Botox", "Botulinum", "Hyaluron", "Unterspritzung", "Filler", "Lippen", "Stirn", "Zornesfalte"],
  lider: ["Schlupflider", "Schlupflid", "Lidstraffung", "Lidkorrektur", "Oberlid", "Augenlider", "Tränensäcke"],
  // Physiotherapie
  "physio:ruecken": ["Rücken", "Rückenschmerzen", "Gelenk", "Gelenkbeschwerden", "Knie", "Schulter", "Hüfte", "Nacken", "LWS", "HWS", "Bandscheibe", "Hexenschuss", "Ischias", "Verspannung", "Krankengymnastik", "KG", "Osteopathie", "manuelle Therapie"],
  praevention: ["Training", "Gerätetraining", "Prävention", "Präventionskurs", "Rückenkurs", "Rückenschule", "KGG"],
  lymph: ["Lymphdrainage", "Lymphödem", "Lymphe", "MLD", "Lipödem"],
  beckenboden: ["Beckenboden", "Beckenbodentraining", "Beckenbodenkurs", "Rückbildung", "Inkontinenz", "Blasenschwäche"],
  // Ergotherapie
  ergo_behandlung: ["Ergotherapie", "Ergo", "Hirnleistungstraining", "Hirnleistung", "Feinmotorik"],
  ergo_hausbesuch: ["Hausbesuch", "zu Hause", "zuhause", "bettlägerig"],
  ergo_privat: ["Konzentrationstraining", "Lerntraining", "Handtherapie", "ohne Verordnung", "Selbstzahler"],
  // Logopädie
  sprache: ["Logopädie", "Sprachtherapie", "Sprechtherapie", "Stimmtherapie", "Sprache", "Stottern", "Lispeln", "Aussprache", "Sprachentwicklung", "Sprachstörung", "Heiserkeit", "Aphasie"],
  logo_schlucken: ["Schluckstörung", "schlucken", "Schlucktherapie", "Dysphagie", "verschlucken"],
  logo_stimme_beruf: ["Stimmtraining", "Sprechberuf", "Sprechberufe", "Lehrer", "Lehrerin", "Lehrkraft", "Callcenter"],
  // Podologie
  fuss: ["Fußbehandlung", "Podologie", "podologische Therapie", "diabetischer Fuß", "Diabetes", "Hornhaut", "Hühnerauge", "Hühneraugen"],
  nagelspange: ["eingewachsener Nagel", "eingewachsen", "Nagelspange", "Nagelkorrektur", "Nagelkorrekturspange", "Spange"],
  fusspflege: ["Fußpflege", "Pediküre", "Nägel schneiden"],
  // Versorgung (derzeit ausgeblendet, die Daten bleiben)
  geburt: ["Geburtsvorbereitung", "Geburtsvorbereitungskurs", "Babymassage", "Akupunktur"],
  wochenbett: ["Wochenbett", "Stillzeit", "stillen", "Stillberatung", "Rückbildung", "Rückbildungskurs"],
  kurse_privat: ["Babymassage", "Rufbereitschaft", "Beleggeburt"],
  pflegeplan: ["Pflege", "Pflegegrad", "Pflegesachleistung", "Betreuung", "Hauswirtschaft"],
  entlastung: ["Entlastung", "Entlastungsbetrag", "Haushaltshilfe", "Verhinderungspflege", "Kurzzeitpflege"],
  beratung_pf: ["Beratungsbesuch", "Beratungseinsatz", "Pflegegeld"],
  behandlungspflege: ["Behandlungspflege", "Medikamentengabe", "Injektion", "Verband", "Verbandwechsel", "Wundversorgung"],
  rezept: ["Rezept", "Kassenrezept", "Arzneimittel", "Medikament", "Selbstmedikation", "rezeptfrei"],
  pdl: ["Medikationsberatung", "Medikationsanalyse", "Polymedikation", "Inhalation", "Inhalationstechnik", "Blutdruck", "Organtransplantation", "Tumortherapie"],
  impfen_apo: ["Impfung", "impfen", "Grippeimpfung", "Corona", "COVID"],
  hilfsmittel_apo: ["Kompressionsstrümpfe", "Pflegehilfsmittel", "Blutdruckmessgerät", "Hilfsmittel"],
  check_apo: ["Blutzucker", "HbA1c", "Cholesterin", "Gesundheitscheck"],
  service_apo: ["Botendienst", "Lieferung", "Blister", "Verblisterung", "Reiseapotheke", "Hautanalyse"],
  hoergeraet: ["Hörgerät", "Hörgeräte", "Hörsystem"],
  hoertest_hk: ["Hörtest"],
  gehoerschutz: ["Gehörschutz", "Otoplastik", "Lärmschutz"],
  tinnitus_hk: ["Tinnitus", "Noiser", "Ohrgeräusch"],
  brille: ["Brille", "Gleitsicht", "Gleitsichtbrille", "Lesebrille", "Blaulichtfilter", "Gläser", "Fassung"],
  kontaktlinsen: ["Kontaktlinsen", "Linsen", "Monatslinsen"],
  fuehrerschein_op: ["Führerschein", "Sehtest"],
  kinderbrille: ["Kinderbrille"],
  einlagen: ["Einlagen", "Schuheinlagen"],
  kompression: ["Kompressionsstrümpfe", "Kompression", "Stützstrümpfe"],
  bandagen: ["Bandage", "Orthese", "Schiene"],
  mobilitaet: ["Rollator", "Rollstuhl", "Pflegebett", "Gehhilfe"],
  brustprothetik: ["Brustprothese", "Brustprothetik", "Spezial-BH"],
  stoma: ["Stoma", "Inkontinenzartikel", "Inkontinenz"],
  naturheil: ["Naturheilkunde", "Naturheilverfahren", "Erstanamnese", "Homöopathie"],
  akupunktur_hp: ["Akupunktur"],
  aufenthalt: ["stationär", "Aufenthalt", "Einbettzimmer", "Zweibettzimmer", "Wahlleistung", "Chefarzt", "Wahlarzt"],
  begleitperson: ["Begleitperson", "Mitaufnahme", "Begleitung"],
};

/** Kleinschreibung, Umlaute ausschreiben, Akzente entfernen. „Hörtest“ und „Hoertest“ werden gleich. */
export function normWort(w: string): string {
  return w
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Einfacher Wortstamm: häufige deutsche Endungen abschneiden („Impfungen“ → „impfung“, „Schmerzen“ → „schmerz“). */
export function wortstamm(n: string): string {
  if (n.length <= 4 || /\d/.test(n)) return n;
  if (n.endsWith("ungen")) return n.slice(0, -2);
  for (const endung of ["ern", "en", "em", "er", "es", "e", "n", "s"]) {
    if (n.endsWith(endung) && n.length - endung.length >= 4) return n.slice(0, -endung.length);
  }
  return n;
}

// Wörter, die in fast jeder Bezeichnung stehen und allein nichts über den Anlass sagen.
const FUELLWOERTER = new Set(
  ("und oder up der die das des dem den ein eine einer eines einem einen mit ohne bei auf fuer von vom zur zum zu im in am an als nach vor je z b zb zzgl inkl inklusive ggf auch bis ab aus ueber unter wenn falls ist sind wird werden " +
    "patient patientin patienten wuenscht wunsch moechte will beschwerden verdacht befund risiko risikofaktoren eigenen sitzung einheit einheiten termin termine " +
    "behandlung behandlungen untersuchung untersuchungen abklaerung diagnostik beratung vorsorge frueherkennung check test kasse kassenleistung selbstzahler privat verordnung " +
    "zusaetzlich zusaetzliche zusaetzlicher zusatz erweitert erweiterte erweitertes medizinisch medizinische medizinischer chronisch chronische chronischer ursache leitlinie plan " +
    "stunde tag monat jahre lebensjahr gruenden indikation standard weitere neue neuer kleine kleiner gelistet digitale erkrankung ausdruecklichen").split(" "),
);

const VERNEINER = new Set(["kein", "keine", "keinen", "keiner", "keinem", "keines", "nicht", "ohne", "nie", "weder"]);
// Wörter, die einen neuen Gedanken beginnen: Eine Verneinung davor gilt danach nicht mehr.
const TRENNER = new Set(["aber", "sondern", "jedoch", "dafuer", "stattdessen", "dagegen", "allerdings"]);
const ABLEHNUNG = new Set(["abgelehnt", "entfaellt", "unerwuenscht"]);
const NICHT_GEWOLLT = new Set(["gewuenscht", "gewollt", "erwuenscht", "noetig", "notwendig", "erforderlich", "besprochen", "angesprochen", "relevant"]);

interface Token { roh: string; n: string; s: string; bruch: boolean }

function zerlege(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(/[\p{L}\p{N}]+|[,.;:!?\n]/gu)) {
    const roh = m[0];
    if (/^[,.;:!?\n]$/.test(roh)) out.push({ roh, n: "", s: "", bruch: true });
    else {
      const n = normWort(roh);
      out.push({ roh, n, s: wortstamm(n), bruch: TRENNER.has(n) });
    }
  }
  return out;
}

interface Stichwort { woerter: { n: string; s: string }[]; gewicht: number; fest: boolean }

const alsWoerter = (text: string) => zerlege(text).filter((t) => !t.bruch || t.n).map((t) => ({ n: t.n, s: t.s }));

/** Stichwörter aus einer Bezeichnung: ohne Füllwörter; „ohne X“ bleibt als Wortfolge zusammen. */
function ausBezeichnung(text: string, gewicht: number): Stichwort[] {
  const w = alsWoerter(text);
  const out: Stichwort[] = [];
  for (let i = 0; i < w.length; i++) {
    if (w[i].n === "ohne" && w[i + 1] && !FUELLWOERTER.has(w[i + 1].n)) {
      out.push({ woerter: [w[i], w[i + 1]], gewicht, fest: false });
      i++;
      continue;
    }
    if (FUELLWOERTER.has(w[i].n) || w[i].n.length < 2) continue;
    out.push({ woerter: [w[i]], gewicht, fest: false });
  }
  return out;
}

/** Feste Stichwörter aus der Tabelle; „Check-up“ gilt auch als „Checkup“. */
function ausSynonym(s: string): Stichwort[] {
  const w = alsWoerter(s);
  if (w.length === 0) return [];
  const out: Stichwort[] = [{ woerter: w, gewicht: 3, fest: true }];
  if (s.includes("-") && w.length > 1) {
    const n = w.map((x) => x.n).join("");
    out.push({ woerter: [{ n, s: wortstamm(n) }], gewicht: 3, fest: true });
  }
  return out;
}

/** Wie gut passt ein Wort aus dem Text zu einem Stichwort? 3 = gleiches Wort, 2 = Wortanfang, 1 = Wortteil, 0 = nicht. */
function passt(t: Token, k: { n: string; s: string }): number {
  if (t.s === k.s || t.n === k.n) return 3;
  const nadel = k.s.length >= 6 ? k.s : k.n;
  if (nadel.length >= 5 && t.n.startsWith(nadel)) return 2;
  if (nadel.length >= 6 && t.n.includes(nadel)) return 1;
  return 0;
}

function verneint(tokens: Token[], von: number, bis: number): boolean {
  // davor: „kein Tinnitus“, „ohne Akupunktur“, „weder Hörtest noch Tinnitus“
  let woerter = 0;
  for (let i = von - 1; i >= 0 && woerter < 3; i--) {
    const t = tokens[i];
    if (t.bruch) break;
    woerter++;
    if (t.n === "noch" && tokens.slice(0, i).some((x) => x.n === "weder")) return true;
    if (VERNEINER.has(t.n) && !(t.n === "nicht" && tokens[i + 1]?.n === "nur")) return true;
  }
  // danach: „Akupunktur nicht gewünscht“, „Akupunktur abgelehnt“, „lehnt Akupunktur ab“ steht davor nicht, deshalb hier „lehnt … ab“
  woerter = 0;
  for (let i = bis + 1; i < tokens.length && woerter < 4; i++) {
    const t = tokens[i];
    if (t.bruch) break;
    woerter++;
    if (ABLEHNUNG.has(t.n)) return true;
    if (t.n === "nicht" && tokens[i + 1] && NICHT_GEWOLLT.has(tokens[i + 1].n)) return true;
  }
  for (let i = von - 1, n = 0; i >= 0 && n < 3; i--, n++) {
    if (tokens[i].bruch) break;
    if (tokens[i].n === "lehnt" || tokens[i].n === "lehnen") {
      for (let j = bis + 1, m = 0; j < tokens.length && m < 3; j++, m++) {
        if (tokens[j].bruch) break;
        if (tokens[j].n === "ab") return true;
      }
    }
  }
  return false;
}

/** Ab so vielen Punkten wird ein Anlass vorgeschlagen (ein festes Stichwort oder ein eindeutiges Wort der Bezeichnung reicht). */
export const ERKENNUNG_SCHWELLE = 2;

/**
 * Ordnet den Text den Anlässen zu. `fach` wählt fachspezifische Stichwörter (z. B. „physio:ruecken“).
 * Die Reihenfolge der Vorschläge: beste Übereinstimmung zuerst, sonst wie in der Liste.
 */
export function erkenneAnlaesse(text: string, anlaesse: AnlassEintrag[], opt: { fach?: string | null } = {}): AnlassErkennung {
  const tokens = zerlege(text.slice(0, 4000));
  if (!tokens.some((t) => t.n)) return { erkannt: [], verneint: [] };

  // Stichwörter je Anlass: fest (Tabelle) und aus den Bezeichnungen. Wörter, die in mehreren
  // Anlässen vorkommen (z. B. „Ultraschall“), zählen entsprechend weniger.
  const jeAnlass = anlaesse.map((a) => {
    const fest = (SYNONYME[`${opt.fach}:${a.id}`] ?? SYNONYME[a.id] ?? []).flatMap(ausSynonym);
    const frei = [...ausBezeichnung(a.label, 2), ...(a.bereich ? ausBezeichnung(a.bereich, 2) : []), ...(a.optionen ?? []).flatMap((o) => ausBezeichnung(o, 1))];
    return { a, fest, frei };
  });
  const haeufig = new Map<string, number>();
  for (const x of jeAnlass) {
    const eigene = new Set(x.frei.map((k) => k.woerter.map((w) => w.s).join(" ")));
    for (const s of eigene) haeufig.set(s, (haeufig.get(s) ?? 0) + 1);
  }

  type Fund = { index: number; von: number; bis: number; gewicht: number; guete: number; nein: boolean };
  const funde: Fund[] = [];
  jeAnlass.forEach((x, index) => {
    const alle = [...x.fest, ...x.frei.map((k) => ({ ...k, gewicht: k.gewicht / (haeufig.get(k.woerter.map((w) => w.s).join(" ")) ?? 1) }))];
    for (const k of alle) {
      for (let i = 0; i + k.woerter.length <= tokens.length; i++) {
        let guete = 3;
        for (let j = 0; j < k.woerter.length && guete > 0; j++) {
          const t = tokens[i + j];
          guete = t.bruch && !t.n ? 0 : Math.min(guete, passt(t, k.woerter[j]));
          // In einer Wortfolge muss jedes Wort mindestens am Wortanfang passen.
          if (k.woerter.length > 1 && guete < 2) guete = 0;
        }
        if (guete === 0) continue;
        const bis = i + k.woerter.length - 1;
        funde.push({ index, von: i, bis, gewicht: k.gewicht, guete: guete + (k.woerter.length - 1) * 0.5, nein: verneint(tokens, i, bis) });
      }
    }
  });

  // Passt ein Wort bei einem Anlass genau und bei einem anderen nur als Wortteil („Reiseimpfung“), gilt nur der genaue Treffer.
  const besteGuete = new Map<number, number>();
  for (const f of funde) for (let i = f.von; i <= f.bis; i++) besteGuete.set(i, Math.max(besteGuete.get(i) ?? 0, f.guete));
  const gueltig = funde.filter((f) => f.guete >= (besteGuete.get(f.von) ?? 0));

  const erkannt: ErkannterAnlass[] = [];
  const nein: AnlassErkennung["verneint"] = [];
  jeAnlass.forEach((x, index) => {
    // Je Stelle im Text zählt nur der beste Treffer dieses Anlasses.
    const jeStelle = new Map<number, Fund>();
    for (const f of gueltig) {
      if (f.index !== index) continue;
      const alt = jeStelle.get(f.von);
      if (!alt || f.gewicht > alt.gewicht || (f.gewicht === alt.gewicht && f.bis > alt.bis)) jeStelle.set(f.von, f);
    }
    const stellen = [...jeStelle.values()].sort((p, q) => p.von - q.von);
    const wort = (f: Fund) => tokens.slice(f.von, f.bis + 1).map((t) => t.roh).join(" ");
    const einmalig = (l: string[]) => [...new Set(l)];
    const ja = stellen.filter((f) => !f.nein);
    const punkte = ja.reduce((s, f) => s + f.gewicht, 0);
    if (punkte >= ERKENNUNG_SCHWELLE) {
      erkannt.push({ id: x.a.id, label: x.a.label, treffer: einmalig(ja.map(wort)), punkte: Math.round(punkte * 100) / 100 });
      return;
    }
    const abgelehnt = stellen.filter((f) => f.nein);
    if (punkte + abgelehnt.reduce((s, f) => s + f.gewicht, 0) >= ERKENNUNG_SCHWELLE) {
      nein.push({ id: x.a.id, label: x.a.label, treffer: einmalig(abgelehnt.map(wort)) });
    }
  });

  const platz = new Map(anlaesse.map((a, i) => [a.id, i]));
  erkannt.sort((p, q) => q.punkte - p.punkte || (platz.get(p.id) ?? 0) - (platz.get(q.id) ?? 0));
  return { erkannt, verneint: nein };
}

/** Anlässe eines Fachs (und eigene Leistungen) in die Form für die Erkennung bringen. */
export function anlassEintraege(
  anlaesse: { id: string; label: string; bereich?: string; options?: { name: string }[] }[],
  eigene: { id: string; anlass: string; name: string }[] = [],
  eigenePraefix = "",
): AnlassEintrag[] {
  return [
    ...anlaesse.map((a) => ({ id: a.id, label: a.label, bereich: a.bereich, optionen: (a.options ?? []).map((o) => o.name) })),
    ...eigene.map((c) => ({ id: `${eigenePraefix}${c.id}`, label: `${c.anlass}: ${c.name}` })),
  ];
}
