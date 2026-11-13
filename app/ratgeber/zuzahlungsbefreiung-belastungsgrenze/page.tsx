import type { Metadata } from "next";
import Link from "next/link";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("zuzahlungsbefreiung-belastungsgrenze");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

export default function Page() {
  return (
    <ArticlePage slug="zuzahlungsbefreiung-belastungsgrenze">
      <h2>Die Regel</h2>
      <p>
        Gesetzlich Versicherte leisten in einem Kalenderjahr Zuzahlungen nur bis zu ihrer Belastungsgrenze. Sie beträgt 2 % der
        jährlichen Bruttoeinnahmen zum Lebensunterhalt, für schwerwiegend chronisch Kranke 1 % (§ 62 SGB V). Ist die Grenze erreicht,
        stellt die Krankenkasse eine Bescheinigung aus, dass für den Rest des Kalenderjahres keine Zuzahlungen mehr anfallen.
      </p>
      <table>
        <thead>
          <tr>
            <th>Beispiel: alleinstehend, Bruttoeinnahmen im Jahr</th>
            <th>Grenze 2 %</th>
            <th>Grenze 1 % (chronisch krank)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>20.000 €</td><td>400 €</td><td>200 €</td></tr>
          <tr><td>30.000 €</td><td>600 €</td><td>300 €</td></tr>
          <tr><td>45.000 €</td><td>900 €</td><td>450 €</td></tr>
        </tbody>
      </table>

      <h2>Wie gerechnet wird</h2>
      <ul>
        <li>Es zählt der Haushalt: Einnahmen und Zuzahlungen von Ehe- oder Lebenspartner und den Kindern im gemeinsamen Haushalt werden zusammengerechnet.</li>
        <li>Für Angehörige im Haushalt werden vorher Freibeträge abgezogen. Die Höhe richtet sich nach der jährlichen Bezugsgröße der Sozialversicherung und bei Kindern nach den steuerlichen Kinderfreibeträgen; die Kasse rechnet das aus.</li>
        <li>Wer Hilfe zum Lebensunterhalt, Grundsicherung im Alter oder Leistungen zur Sicherung des Lebensunterhalts nach dem SGB II erhält, wird nur mit dem Regelbedarf der Stufe 1 angesetzt. Die Grenze ist dann für die ganze Bedarfsgemeinschaft ein niedriger fester Betrag.</li>
      </ul>

      <h2>Was zählt und was nicht</h2>
      <table>
        <thead>
          <tr>
            <th>Zählt mit</th>
            <th>Zählt nicht mit</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Zuzahlung zu Arzneimitteln auf Kassenrezept</td><td>Selbstzahlerleistungen (IGeL)</td></tr>
          <tr><td>Zuzahlung zu Heilmitteln, etwa Physiotherapie</td><td>Eigenanteil beim Zahnersatz</td></tr>
          <tr><td>Zuzahlung zu Hilfsmitteln</td><td>Mehrkosten für eine aufwendigere Versorgung, etwa beim Hörgerät</td></tr>
          <tr><td>Zuzahlung im Krankenhaus und bei häuslicher Krankenpflege</td><td>frei gekaufte Arzneimittel ohne Rezept</td></tr>
        </tbody>
      </table>

      <h2>Wer als schwerwiegend chronisch krank gilt</h2>
      <p>
        Nach der Chroniker-Richtlinie des Gemeinsamen Bundesausschusses muss die Krankheit wenigstens ein Jahr lang mindestens einmal
        im Quartal ärztlich behandelt worden sein. Zusätzlich muss eines dieser Merkmale vorliegen:
      </p>
      <ul>
        <li>Pflegegrad 3, 4 oder 5</li>
        <li>ein Grad der Behinderung oder der Schädigungsfolgen von mindestens 60 oder eine Minderung der Erwerbsfähigkeit von mindestens 60 %, zumindest auch wegen dieser Krankheit</li>
        <li>eine kontinuierliche medizinische Versorgung ist nötig, ohne die sich die Krankheit lebensbedrohlich verschlimmern, die Lebenserwartung sinken oder die Lebensqualität dauerhaft leiden würde</li>
      </ul>
      <p>
        Die Dauerbehandlung weist der Patient mit einer ärztlichen Bescheinigung nach. Die Feststellung selbst trifft die Krankenkasse,
        nicht die Praxis.
      </p>

      <h2>Was die Praxis tun muss</h2>
      <ol>
        <li>Jede Zuzahlung quittieren (§ 61 SGB V), am besten mit Name, Datum, Betrag und Art der Leistung. Ohne Belege kann der Patient die Grenze nicht nachweisen.</li>
        <li>Befreiungsbescheinigung zeigen lassen und das Jahr notieren. Sie gilt nur bis zum 31. Dezember; im Januar wird wieder kassiert, bis eine neue vorliegt.</li>
        <li>Keine Auskunft zur Höhe der Grenze geben. Auf der Bescheinigung steht aus gutem Grund nichts zum Einkommen, und die Rechnung ist Sache der Kasse.</li>
        <li>Patienten mit vielen Verordnungen früh ansprechen. Ab 2027 steigen die <Link prefetch={false} href="/ratgeber/zuzahlungen-2027">Zuzahlungen</Link>, die Belastungsgrenze bleibt gleich. Sie wird also schneller erreicht.</li>
      </ol>

      <h2>In drei Sätzen erklärt</h2>
      <blockquote className="border-l-4 border-brand-300 pl-4 italic text-slate-600">
        „Niemand muss im Jahr mehr als 2 Prozent seines Einkommens an Zuzahlungen leisten, mit einer schweren chronischen Erkrankung
        1 Prozent. Heben Sie alle Quittungen auf und reichen Sie sie bei Ihrer Kasse ein, sobald Sie die Grenze erreichen. Dann
        bekommen Sie eine Befreiung für den Rest des Jahres, die Sie uns bitte zeigen.“
      </blockquote>
      <p>
        Wo eine gesetzliche Zuzahlung anfällt, legt Sorrida für das Team die Aufgabe an, sie zu kassieren oder den Befreiungsbescheid
        zu prüfen. Im Kostenüberblick für den Patienten steht der Hinweis, dass Versicherte mit Befreiung nichts zuzahlen.
      </p>

      <h2>Quellen</h2>
      <ul className="text-sm">
        <li>
          <a href="https://www.gesetze-im-internet.de/sgb_5/__62.html" rel="noopener">
            § 62 SGB V
          </a>{" "}
          (Belastungsgrenze, Haushalt, Bescheinigung)
        </li>
        <li>
          <a href="https://www.g-ba.de/richtlinien/8/" rel="noopener">
            Chroniker-Richtlinie des Gemeinsamen Bundesausschusses
          </a>{" "}
          (Definition der schwerwiegenden chronischen Krankheit, Nachweise)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/sgb_5/__61.html" rel="noopener">
            § 61 SGB V
          </a>{" "}
          (Quittung für geleistete Zuzahlungen)
        </li>
      </ul>
    </ArticlePage>
  );
}
