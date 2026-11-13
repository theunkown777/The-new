import type { Metadata } from "next";
import Link from "next/link";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("zuzahlungen-2027");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

// Beträge nach § 61 SGB V: Fassung bis 31.12.2026 und Fassung ab 1.1.2027
// (GKV-Beitragssatzstabilisierungsgesetz, BGBl. 2026 I Nr. 228, Artikel 1 Nr. 23, Artikel 8 Abs. 2).
const ROWS = [
  { was: "Arzneimittel auf Kassenrezept", alt: "10 %, mindestens 5 €, höchstens 10 €", neu: "10 %, mindestens 7,50 €, höchstens 15 €" },
  { was: "Hilfsmittel (z. B. Einlagen, Bandage, Hörgerät)", alt: "10 %, mindestens 5 €, höchstens 10 €", neu: "10 %, mindestens 7,50 €, höchstens 15 €" },
  { was: "Heilmittel (Physiotherapie, Ergotherapie, Logopädie, Podologie)", alt: "10 % der Kosten plus 10 € je Verordnung", neu: "10 % der Kosten plus 15 € je Verordnung" },
  { was: "Häusliche Krankenpflege", alt: "10 % der Kosten plus 10 € je Verordnung", neu: "10 % der Kosten plus 15 € je Verordnung" },
  { was: "Krankenhaus, stationär (höchstens 28 Tage im Kalenderjahr)", alt: "10 € je Kalendertag", neu: "15 € je Kalendertag" },
];

export default function Page() {
  return (
    <ArticlePage slug="zuzahlungen-2027">
      <h2>Das Wichtigste in drei Sätzen</h2>
      <ul>
        <li>Zum 1. Januar 2027 steigen die festen Beträge der gesetzlichen Zuzahlungen um die Hälfte: aus 5 € werden 7,50 €, aus 10 € werden 15 €.</li>
        <li>Der Anteil von 10 % bleibt gleich, ebenso die Befreiung für Kinder und Jugendliche und die Belastungsgrenze.</li>
        <li>Die Praxis oder abgebende Stelle zieht die Zuzahlung wie bisher ein und quittiert sie.</li>
      </ul>

      <h2>Die Beträge im Vergleich</h2>
      <p>
        Grundlage ist das GKV-Beitragssatzstabilisierungsgesetz vom 24. Juli 2026 (BGBl. 2026 I Nr. 228). Es fasst § 61 SGB V neu; die
        neue Fassung tritt am 1. Januar 2027 in Kraft.
      </p>
      <table>
        <thead>
          <tr>
            <th>Leistung</th>
            <th>bis 31.12.2026</th>
            <th>ab 1.1.2027</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.was}>
              <td>{r.was}</td>
              <td>{r.alt}</td>
              <td>{r.neu}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Bei Arznei- und Hilfsmitteln zahlt niemand mehr als das Mittel kostet. Bei Hilfsmitteln, die zum Verbrauch bestimmt sind
        (etwa Inkontinenzprodukte), beträgt die Zuzahlung 10 % des Kassenbetrags, nach dem neuen § 33 Abs. 8 SGB V höchstens 15 € für
        den Monatsbedarf statt bisher 10 €.
      </p>

      <h2>Was gleich bleibt</h2>
      <ul>
        <li>
          <b>Belastungsgrenze:</b> Niemand zahlt im Kalenderjahr mehr als 2 % der jährlichen Bruttoeinnahmen zum Lebensunterhalt,
          schwerwiegend chronisch Kranke 1 % (§ 62 SGB V). Wer die Grenze erreicht, bekommt von der Kasse eine Befreiung für den Rest
          des Jahres. Mehr dazu im Ratgeber <Link prefetch={false} href="/ratgeber/zuzahlungsbefreiung-belastungsgrenze">Zuzahlungsbefreiung</Link>.
        </li>
        <li>
          <b>Kinder und Jugendliche:</b> Die Zuzahlung zu Heilmitteln und Hilfsmitteln gilt erst ab dem vollendeten 18. Lebensjahr.
        </li>
        <li>
          <b>Einzug und Quittung:</b> Die Praxis, Apotheke oder das Sanitätshaus zieht die Zuzahlung ein und muss sie quittieren. Eine
          Gebühr für die Quittung gibt es nicht.
        </li>
      </ul>

      <h2>Was sich 2027 sonst noch ändert</h2>
      <ul>
        <li>
          <b>Zahnersatz:</b> Der Festzuschuss sinkt von 60, 70 und 75 % auf 50, 60 und 65 %. Für Festzuschüsse, die vor dem 1. Januar
          2027 bewilligt wurden, gelten die alten Sätze weiter. Details im Ratgeber{" "}
          <Link prefetch={false} href="/ratgeber/festzuschuss-2027">Festzuschuss 2027</Link>.
        </li>
        <li>
          <b>Homöopathie:</b> Krankenkassen dürfen homöopathische und anthroposophische Arzneimittel und Leistungen ab 2027 nicht
          mehr als Satzungsleistung anbieten (§ 11 Abs. 6 SGB V in der neuen Fassung).
        </li>
        <li>
          <b>Check-up und Hautkrebs-Screening:</b> Der Gemeinsame Bundesausschuss muss beide Untersuchungen überprüfen und bis zum
          31. Dezember 2027 über eine Anpassung beschließen. Bis dahin gilt der bisherige Anspruch.
        </li>
        <li>
          <b>Zweitmeinung vor planbaren Eingriffen:</b> Der Gemeinsame Bundesausschuss bestimmt erstmals bis zum 31. März 2027
          Eingriffe, bei denen die Praxis oder Klinik nur vergütet wird, wenn vorher ein Nachweis über eine Zweitmeinung vorliegt.
          Welche Eingriffe das sind, steht noch nicht fest.
        </li>
      </ul>

      <h2>Was Ihr Team jetzt tun sollte</h2>
      <ol>
        <li>Preisaushang, Merkblätter und Textbausteine prüfen: Überall, wo „10 € je Verordnung“ oder „5 bis 10 €“ steht, gilt ab Januar ein neuer Betrag.</li>
        <li>Praxissoftware und Kasse: nachfragen, ab wann das Update mit den neuen Beträgen eingespielt wird.</li>
        <li>
          Verordnungen über den Jahreswechsel: Das Gesetz nennt für die Zuzahlung nur das Datum 1. Januar 2027 und enthält dafür keine
          eigene Übergangsregel. Halten Sie sich bei laufenden Verordnungen an die Umsetzungshinweise der Kassen und Ihres Verbands.
        </li>
        <li>Patienten mit vielen Verordnungen früh auf die Belastungsgrenze hinweisen. Belege sammeln lohnt sich 2027 schneller.</li>
      </ol>

      <h2>In zwei Sätzen erklärt</h2>
      <blockquote className="border-l-4 border-brand-300 pl-4 italic text-slate-600">
        „Der Gesetzgeber hat die Zuzahlungen zum 1. Januar 2027 angehoben, bei einer Verordnung für Krankengymnastik sind das zum Beispiel 5 Euro mehr als bisher. Wenn
        Sie im Jahr über 2 Prozent Ihres Einkommens an Zuzahlungen kommen, befreit Ihre Kasse Sie für den Rest des Jahres, heben Sie
        deshalb die Quittungen auf.“
      </blockquote>
      <p>
        Sorrida rechnet die Heilmittel-Zuzahlung nach dem Datum: 10 % plus 10 € bis Ende 2026, 10 % plus 15 € ab 2027. Bei Kindern und
        Jugendlichen entfällt sie; für Erwachsene legt Sorrida die Aufgabe an, die Zuzahlung zu kassieren oder die Befreiung zu prüfen.
      </p>

      <h2>Quellen</h2>
      <ul className="text-sm">
        <li>
          <a href="https://www.recht.bund.de/bgbl/1/2026/228/VO.html" rel="noopener">
            GKV-Beitragssatzstabilisierungsgesetz vom 24. Juli 2026, BGBl. 2026 I Nr. 228
          </a>{" "}
          (Artikel 1 Nr. 8, 9, 10, 12a, 22 und 23; Inkrafttreten in Artikel 8)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/sgb_5/__61.html" rel="noopener">
            § 61 SGB V
          </a>{" "}
          (Zuzahlungen, dort noch die Fassung bis 31.12.2026)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/sgb_5/__62.html" rel="noopener">
            § 62 SGB V
          </a>{" "}
          (Belastungsgrenze)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/sgb_5/__33.html" rel="noopener">
            § 33 SGB V
          </a>{" "}
          (Hilfsmittel, Absatz 8)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/sgb_5/__39.html" rel="noopener">
            § 39 SGB V
          </a>{" "}
          (Krankenhaus, höchstens 28 Tage im Kalenderjahr)
        </li>
      </ul>
    </ArticlePage>
  );
}
