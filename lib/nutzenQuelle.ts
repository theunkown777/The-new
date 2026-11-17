// Herkunft einer Aussage im Kasten „Zum Nutzen“ (Feld `nutzenQuelle` in lib/specialties.ts).
// Grundsatz: Sorrida beschreibt, bewertet aber nicht. Eine Aussage zu Nutzen, Studienlage oder Rechtslage steht
// dort nur mit Quelle, und zwar als Bericht („Der IGeL-Monitor … bewertet … mit „tendenziell negativ““), nicht als
// eigenes Urteil. Ohne Quelle steht dort nur ein neutraler Satz oder eine reine Abrechnungstatsache
// („keine Kassenleistung“). Rein, ohne Server-Module: Website, Editor, Patientenansicht und Schreiben nutzen es.

/** Die Bewertungsstufen des IGeL-Monitors, wörtlich wie auf seinen Seiten. */
export const IGEL_STUFEN = ["positiv", "tendenziell positiv", "unklar", "tendenziell negativ", "negativ"] as const;
export type IgelStufe = (typeof IGEL_STUFEN)[number];

export interface NutzenQuelle {
  /** Herausgeber oder Norm, z. B. „IGeL-Monitor (Medizinischer Dienst Bund)“ oder „§ 2 Abs. 2 KHEntgG“. */
  name: string;
  /** Titel der bewerteten Leistung, wie er auf der Seite steht. */
  titel?: string;
  /** Seite, auf der die Aussage steht (https). */
  url: string;
  /** Tag, an dem die Seite gelesen wurde (TT.MM.JJJJ). */
  stand: string;
  /**
   * Nur beim IGeL-Monitor: seine Bewertungsstufe auf dieser Seite, wie sie auch im Satz steht. Die Auswertung der
   * Praxis (lib/analytics.ts) zählt danach; Vorschläge, die vor diesem Feld gespeichert wurden, haben es nicht.
   */
  bewertung?: IgelStufe;
  /**
   * Nur beim IGeL-Monitor, wo die Seite die Bewertung auf eine Gruppe beschränkt („Die Bewertung bezieht sich auf …“):
   * diese Gruppe, wie sie wörtlich im Satz steht (z. B. „für nicht-schwangere Erwachsene ohne Beschwerden“).
   */
  geltung?: string;
}

/** Eine Quelle oder mehrere (z. B. wenn ein Angebot zwei Untersuchungen umfasst, die der IGeL-Monitor einzeln bewertet). */
export type NutzenQuellen = NutzenQuelle | NutzenQuelle[];

export const IGEL_MONITOR = "IGeL-Monitor (Medizinischer Dienst Bund)";

/** Neutraler Satz im Kasten „Zum Nutzen“, wo keine Quelle eine Bewertung enthält. Er sagt nichts zu Nutzen oder Studienlage. */
export const NUTZEN_FRAGEN = "Fragen Sie in der Praxis, was in Ihrer Situation für und was gegen diese Leistung spricht.";

/**
 * Die einzigen Sätze, die ohne Quelle im Kasten „Zum Nutzen“ stehen dürfen: der neutrale Satz und reine
 * Abrechnungstatsachen. Geprüft in lib/haltbarkeit.test.ts; genutzt auch, um ältere Schreiben zu erkennen.
 */
export const NUTZEN_OHNE_QUELLE: ReadonlySet<string> = new Set([
  NUTZEN_FRAGEN,
  "Ersetzt keine ärztliche Untersuchung.",
  "Keine Krankenbehandlung und keine Kassenleistung.",
  "Behandlung aus kosmetischem Wunsch, keine Kassenleistung.",
  "Training ohne Krankheitswert, keine Kassenleistung.",
]);

/**
 * Für gespeicherte Schreiben an den Patienten (TreatmentProposal.letterText): true, wenn eine Zeile „Zum Nutzen:“ weder
 * eine Quelle nennt noch einer der erlaubten Sätze ist. Das trifft Schreiben, die vor der Regel „Nutzen nur mit Quelle“
 * gespeichert wurden (z. B. „Ohne Beschwerden ist kein Nutzen belegt.“). Sie bleiben als Nachweis gespeichert, werden
 * aber nicht mehr zum Versand angeboten.
 */
export function schreibenMitNutzenOhneQuelle(letterText: string): boolean {
  return letterText.split("\n").some((zeile) => {
    const m = /^\s*Zum Nutzen: (.*)$/.exec(zeile);
    if (!m) return false;
    if (/\(Quellen?: /.test(m[1])) return false;
    return !NUTZEN_OHNE_QUELLE.has(m[1].trim());
  });
}

/**
 * Seite des IGeL-Monitors; `slug` ist der letzte Teil der Adresse ohne „.html“, `bewertung` die Stufe auf der Seite,
 * `geltung` die Gruppe, auf die die Seite die Bewertung beschränkt (steht dann wörtlich im Satz).
 */
export function igelMonitor(titel: string, slug: string, stand: string, bewertung: IgelStufe, geltung?: string): NutzenQuelle {
  return { name: IGEL_MONITOR, titel, url: `https://igel-monitor.de/igel-a-z/igel/show/${slug}.html`, stand, bewertung, ...(geltung ? { geltung } : {}) };
}

/** Eine oder mehrere Quellen als Liste. */
export const quellenListe = (q: NutzenQuellen | undefined | null): NutzenQuelle[] => (q ? (Array.isArray(q) ? q : [q]) : []);

/**
 * Für die Auswertung: true, wenn das Angebot mindestens eine Quelle des IGeL-Monitors hat und jede davon die hinterlegte
 * Bewertung „negativ“ oder „tendenziell negativ“ trägt. Gemischte Bewertungen (z. B. „unklar“ und „tendenziell
 * negativ“), Angebote ohne Quelle oder ohne hinterlegte Bewertung: false.
 */
export const igelNegativ = (q: NutzenQuellen | undefined | null): boolean => {
  const igel = quellenListe(q).filter((x) => x.name === IGEL_MONITOR);
  return igel.length > 0 && igel.every((x) => x.bewertung === "negativ" || x.bewertung === "tendenziell negativ");
};

/** Kurzer Linktext: „IGeL-Monitor“ statt des vollen Herausgebers; eine Norm bleibt, wie sie ist. */
export const quelleKurz = (q: NutzenQuelle) => q.name.replace(/\s*\([^)]*\)$/, "");

/**
 * Für Text ohne Link (Schreiben an den Patienten): „Quelle: IGeL-Monitor (Medizinischer Dienst Bund), https://…,
 * abgerufen am 17.11.2026“. `stand` ist der Tag, an dem die Seite gelesen wurde, nicht das Datum der Bewertung.
 */
export function quellenText(q: NutzenQuellen | undefined | null): string {
  const liste = quellenListe(q);
  if (!liste.length) return "";
  return `${liste.length > 1 ? "Quellen" : "Quelle"}: ${liste.map((x) => `${x.name}, ${x.url}, abgerufen am ${x.stand}`).join("; ")}`;
}
