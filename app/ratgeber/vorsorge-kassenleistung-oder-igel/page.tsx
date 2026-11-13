import type { Metadata } from "next";
import Link from "next/link";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("vorsorge-kassenleistung-oder-igel");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

// Früherkennung für Erwachsene nach der Übersicht des Gemeinsamen Bundesausschusses, Stand November 2026.
const KASSE: [string, string, string][] = [
  ["Gesundheits-Check-up", "Frauen und Männer ab 18", "von 18 bis 34 einmal, ab 35 alle drei Jahre"],
  ["Screening auf Hepatitis B und C", "Frauen und Männer ab 35", "einmal"],
  ["Hautkrebs-Screening", "Frauen und Männer ab 35", "alle zwei Jahre"],
  ["Früherkennung Gebärmutterhalskrebs", "Frauen von 20 bis 34", "jährlich, mit Abstrich"],
  ["Früherkennung Gebärmutterhalskrebs", "Frauen ab 35", "alle drei Jahre, Abstrich zusammen mit HPV-Test"],
  ["Tastuntersuchung der Brust", "Frauen ab 30", "jährlich"],
  ["Mammographie-Screening", "Frauen von 50 bis 75", "alle zwei Jahre, mit Einladung"],
  ["Früherkennung Prostatakrebs (Tastuntersuchung)", "Männer ab 45", "jährlich"],
  ["Darmkrebs: Stuhltest", "Frauen und Männer ab 50", "alle zwei Jahre"],
  ["Darmkrebs: Darmspiegelung", "Frauen und Männer ab 50", "statt des Stuhltests, höchstens zweimal im Abstand von zehn Jahren"],
  ["Lungenkrebs: Niedrigdosis-CT", "starke aktive und ehemalige Raucher von 50 bis 75", "jährlich, seit April 2026"],
  ["Ultraschall der Bauchschlagader", "Männer ab 65", "einmal"],
  ["Chlamydien-Test", "Frauen bis 25", "jährlich"],
];

// Bewertungen des IGeL-Monitors (Medizinischer Dienst Bund), Stand November 2026.
const IGEL: [string, string, string][] = [
  ["PSA-Test zur Früherkennung von Prostatakrebs", "tendenziell negativ", "bei Beschwerden, Verdacht oder zur Verlaufskontrolle"],
  ["Ultraschall der Eierstöcke zur Krebsfrüherkennung", "negativ", "bei Beschwerden oder auffälligem Befund"],
  ["Ultraschall der Brust zur Krebsfrüherkennung", "unklar", "bei Tastbefund oder Verdacht"],
  ["Augenspiegelung mit Augeninnendruckmessung zur Glaukom-Früherkennung", "tendenziell negativ", "bei Verdacht, Risikofaktoren oder Beschwerden"],
  ["Ultraschall der Halsschlagadern zur Schlaganfallvorsorge", "tendenziell negativ", "bei Beschwerden oder zur Abklärung"],
  ["Früherkennung auf Vitamin-D-Mangel", "unklar", "bei begründetem Verdacht"],
];

export default function Page() {
  return (
    <ArticlePage slug="vorsorge-kassenleistung-oder-igel">
      <h2>Die Grundregel</h2>
      <p>
        Untersuchungen zur Früherkennung zahlt die Kasse, wenn der Gemeinsame Bundesausschuss (G-BA) sie in seine Richtlinien
        aufgenommen hat, und zwar für das dort genannte Alter und im dort genannten Abstand. Dieselbe Untersuchung früher, häufiger
        oder ohne Anlass ist eine Selbstzahlerleistung. Gibt es Beschwerden oder einen begründeten Verdacht, ist die Abklärung keine
        Vorsorge mehr, sondern Krankenbehandlung und damit Kassenleistung.
      </p>

      <h2>Was die Kasse für Erwachsene zahlt</h2>
      <table>
        <thead>
          <tr>
            <th>Untersuchung</th>
            <th>Für wen</th>
            <th>Wie oft</th>
          </tr>
        </thead>
        <tbody>
          {KASSE.map(([u, wer, oft], i) => (
            <tr key={i}>
              <td>{u}</td>
              <td>{wer}</td>
              <td>{oft}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Quelle: Übersicht „Früherkennungsuntersuchungen“ des G-BA, Stand November 2026. Für gesetzliche Früherkennung fällt keine
        Zuzahlung an.
      </p>

      <h2>Was sich gerade ändert</h2>
      <ul>
        <li>
          <b>Mammographie:</b> Der G-BA hat im Oktober 2026 mitgeteilt, dass das Screening künftig auch Frauen von 45 bis 49 Jahren
          offensteht. In seiner Übersicht steht noch die Spanne 50 bis 75; ab wann Einladungen an die Jüngeren gehen, sollten Sie vor
          einer Auskunft prüfen.
        </li>
        <li>
          <b>Check-up und Hautkrebs-Screening:</b> Der Gesetzgeber hat den G-BA beauftragt, beide zu überprüfen, beim Hautkrebs auch
          ein Screening nach Risiko und andere Abstände. Der Beschluss muss bis zum 31. Dezember 2027 fallen (§ 25 Abs. 4 SGB V). Bis
          dahin gilt der Anspruch in der Tabelle.
        </li>
      </ul>

      <h2>Häufige Selbstzahlerleistungen daneben</h2>
      <table>
        <thead>
          <tr>
            <th>Leistung ohne Anlass</th>
            <th>Bewertung im IGeL-Monitor</th>
            <th>Kassenleistung, wenn</th>
          </tr>
        </thead>
        <tbody>
          {IGEL.map(([l, b, k]) => (
            <tr key={l}>
              <td>{l}</td>
              <td>{b}</td>
              <td>{k}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Dazu kommen Untersuchungen außerhalb der Altersgrenzen, etwa ein Hautkrebs-Screening vor dem 35. Geburtstag. Manche Kassen
        übernehmen so etwas als freiwillige Zusatzleistung. Ein kurzer Hinweis „Fragen Sie vorher bei Ihrer Kasse nach“ kostet
        nichts und erspart dem Patienten unter Umständen die Rechnung.
      </p>

      <h2>So bleibt das Gespräch sauber</h2>
      <ol>
        <li>Erst sagen, was die Kasse in diesem Alter zahlt und wann der nächste Termin dafür fällig ist.</li>
        <li>Dann die Zusatzleistung nennen, mit Preis und mit dem, was über den Nutzen bekannt ist.</li>
        <li>Nach Beschwerden fragen. Wer welche hat, bekommt die Untersuchung auf Kasse.</li>
        <li>
          Entscheidet sich der Patient dafür: schriftliche Vereinbarung vor der Leistung, siehe{" "}
          <Link prefetch={false} href="/ratgeber/igel-vereinbarung">IGeL richtig vereinbaren</Link>.
        </li>
      </ol>

      <h2>In drei Sätzen erklärt</h2>
      <blockquote className="border-l-4 border-brand-300 pl-4 italic text-slate-600">
        „In Ihrem Alter bezahlt die Kasse [Untersuchung] alle [Abstand], das machen wir heute. Zusätzlich bieten wir [Leistung] an,
        die kostet [Betrag] und ist ohne Beschwerden keine Kassenleistung; ob sie Ihnen nützt, ist wissenschaftlich [Einordnung].
        Wenn Sie Beschwerden haben, sagen Sie es bitte, dann übernimmt die Kasse die Abklärung.“
      </blockquote>
      <p>
        In Sorrida steht bei jedem Anlass die Kassenleistung oben, bei Vorsorge mit dem Alter, ab dem sie gilt. Darunter folgen die
        Selbstzahlerleistungen mit Preis, mit dem Hinweis, wann die Kasse zahlt, und mit einer Zeile zum Nutzen.
      </p>

      <h2>Quellen</h2>
      <ul className="text-sm">
        <li>
          <a href="https://www.g-ba.de/themen/methodenbewertung/frueherkennungsuntersuchungen/" rel="noopener">
            Gemeinsamer Bundesausschuss: Früherkennungsuntersuchungen im Überblick
          </a>{" "}
          (Alter und Abstände aller Untersuchungen)
        </li>
        <li>
          <a href="https://www.recht.bund.de/bgbl/1/2026/228/VO.html" rel="noopener">
            GKV-Beitragssatzstabilisierungsgesetz vom 24. Juli 2026, BGBl. 2026 I Nr. 228
          </a>{" "}
          (Artikel 1 Nr. 9: Überprüfung von Check-up und Hautkrebs-Screening bis 31.12.2027)
        </li>
        <li>
          <a href="https://www.igel-monitor.de/igel-a-z.html" rel="noopener">
            IGeL-Monitor des Medizinischen Dienstes Bund, IGeL A–Z
          </a>{" "}
          (Bewertungen der genannten Selbstzahlerleistungen)
        </li>
      </ul>
    </ArticlePage>
  );
}
