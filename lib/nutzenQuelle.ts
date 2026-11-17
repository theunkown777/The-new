// Herkunft einer Aussage im Kasten „Zum Nutzen“ (Feld `nutzenQuelle` in lib/specialties.ts).
// Grundsatz: Sorrida beschreibt, bewertet aber nicht. Eine Aussage zu Nutzen, Studienlage oder Rechtslage steht
// dort nur mit Quelle, und zwar als Bericht („Der IGeL-Monitor … bewertet … mit „tendenziell negativ““), nicht als
// eigenes Urteil. Ohne Quelle steht dort nur ein neutraler Satz oder eine reine Abrechnungstatsache
// („keine Kassenleistung“). Rein, ohne Server-Module: Website, Editor, Patientenansicht und Schreiben nutzen es.

export interface NutzenQuelle {
  /** Herausgeber oder Norm, z. B. „IGeL-Monitor (Medizinischer Dienst Bund)“ oder „§ 2 Abs. 2 KHEntgG“. */
  name: string;
  /** Titel der bewerteten Leistung, wie er auf der Seite steht. */
  titel?: string;
  /** Seite, auf der die Aussage steht (https). */
  url: string;
  /** Tag, an dem die Seite gelesen wurde (TT.MM.JJJJ). */
  stand: string;
}

/** Eine Quelle oder mehrere (z. B. wenn ein Angebot zwei Untersuchungen umfasst, die der IGeL-Monitor einzeln bewertet). */
export type NutzenQuellen = NutzenQuelle | NutzenQuelle[];

export const IGEL_MONITOR = "IGeL-Monitor (Medizinischer Dienst Bund)";

/** Neutraler Satz im Kasten „Zum Nutzen“, wo keine Quelle eine Bewertung enthält. Er sagt nichts zu Nutzen oder Studienlage. */
export const NUTZEN_FRAGEN = "Fragen Sie in der Praxis, was diese Leistung in Ihrer Situation leisten kann.";

/** Seite des IGeL-Monitors; `slug` ist der letzte Teil der Adresse ohne „.html“. */
export function igelMonitor(titel: string, slug: string, stand: string): NutzenQuelle {
  return { name: IGEL_MONITOR, titel, url: `https://igel-monitor.de/igel-a-z/igel/show/${slug}.html`, stand };
}

/** Eine oder mehrere Quellen als Liste. */
export const quellenListe = (q: NutzenQuellen | undefined | null): NutzenQuelle[] => (q ? (Array.isArray(q) ? q : [q]) : []);

/** Kurzer Linktext: „IGeL-Monitor“ statt des vollen Herausgebers; eine Norm bleibt, wie sie ist. */
export const quelleKurz = (q: NutzenQuelle) => q.name.replace(/\s*\([^)]*\)$/, "");

/** Für Text ohne Link (Schreiben an den Patienten): „Quelle: IGeL-Monitor (Medizinischer Dienst Bund), https://…, Stand 17.11.2026“. */
export function quellenText(q: NutzenQuellen | undefined | null): string {
  const liste = quellenListe(q);
  if (!liste.length) return "";
  return `${liste.length > 1 ? "Quellen" : "Quelle"}: ${liste.map((x) => `${x.name}, ${x.url}, Stand ${x.stand}`).join("; ")}`;
}
