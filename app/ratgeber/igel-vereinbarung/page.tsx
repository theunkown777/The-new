import type { Metadata } from "next";
import Link from "next/link";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("igel-vereinbarung");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

export default function Page() {
  return (
    <ArticlePage slug="igel-vereinbarung">
      <h2>Worum es geht</h2>
      <p>
        Individuelle Gesundheitsleistungen (IGeL) sind Leistungen, die nicht zur vertragsärztlichen Versorgung gehören und die ein
        gesetzlich versicherter Patient deshalb selbst bezahlt. Der Bundesmantelvertrag-Ärzte (BMV-Ä) erlaubt einer Vertragsarztpraxis
        nur in drei Fällen, von einem Kassenpatienten Geld zu verlangen (§ 18 Abs. 8 Satz 3 BMV-Ä). Zwei davon betreffen
        Selbstzahlerleistungen.
      </p>
      <table>
        <thead>
          <tr>
            <th>Fall</th>
            <th>Voraussetzung nach BMV-Ä</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Leistung, die nicht Bestandteil der vertragsärztlichen Versorgung ist (klassische IGeL)</td>
            <td>Vorher schriftliche Zustimmung des Versicherten und Hinweis auf die Pflicht, die Kosten zu übernehmen (Nr. 3)</td>
          </tr>
          <tr>
            <td>Patient möchte eine Kassenleistung ausdrücklich privat</td>
            <td>Er verlangt das vor Beginn der Behandlung ausdrücklich und bestätigt es der Praxis schriftlich (Nr. 2)</td>
          </tr>
        </tbody>
      </table>
      <p>
        Derselbe Absatz stellt klar: Wer Versicherte dahin beeinflusst, statt der ihnen zustehenden Kassenleistung eine privatärztliche
        Versorgung zu nehmen, verstößt gegen seine vertragsärztlichen Pflichten. Die Kassenleistung gehört deshalb immer zuerst auf den Tisch.
      </p>

      <h2>Drei Regeln, die zusammen gelten</h2>
      <ol>
        <li>
          <b>Schriftliche Zustimmung vor der Leistung</b> mit Kostenhinweis (§ 18 Abs. 8 BMV-Ä).
        </li>
        <li>
          <b>Voraussichtliche Kosten in Textform</b> vor Beginn der Behandlung (§ 630c Abs. 3 BGB). Siehe Ratgeber{" "}
          <Link prefetch={false} href="/ratgeber/wirtschaftliche-aufklaerung-630c-bgb">Wirtschaftliche Aufklärung</Link>.
        </li>
        <li>
          <b>Rechnung nach der GOÄ</b> mit Nummer, Bezeichnung, Steigerungssatz und Betrag je Leistung (§ 12 GOÄ). Leistungen über das
          medizinisch Notwendige hinaus sind als Leistung auf Verlangen zu kennzeichnen. Siehe Ratgeber{" "}
          <Link prefetch={false} href="/ratgeber/goae-rechnung-erklaeren">GOÄ-Rechnung erklären</Link>.
        </li>
      </ol>

      <h2>Was in die Vereinbarung gehört</h2>
      <p>Der BMV-Ä schreibt kein Formular vor. In der Praxis bewährt sich ein Blatt mit diesen Angaben:</p>
      <ul>
        <li>Name des Patienten, Praxis, Datum</li>
        <li>die Leistung in verständlichen Worten</li>
        <li>die GOÄ-Nummern mit Steigerungssatz und der voraussichtliche Gesamtbetrag in Euro</li>
        <li>der Satz, dass die Leistung keine Leistung der gesetzlichen Krankenversicherung ist und der Patient die Kosten selbst trägt</li>
        <li>der Hinweis, welche Kassenleistung es für den Anlass gibt</li>
        <li>Unterschrift des Patienten vor der Behandlung; ein Exemplar für den Patienten</li>
      </ul>

      <h2>Häufige Fehler</h2>
      <ol>
        <li>Die Unterschrift kommt erst nach der Leistung. Dann fehlt die Voraussetzung für die Vergütung.</li>
        <li>Pauschalpreis statt GOÄ. Die Rechnung muss jede Leistung mit Nummer und Faktor ausweisen.</li>
        <li>Eine Kassenleistung wird als IGeL angeboten. Ein Ultraschall bei Beschwerden oder eine Untersuchung bei begründetem Verdacht ist Kassenleistung.</li>
        <li>Kein Betrag. „Das kostet eine Kleinigkeit“ ist keine Kosteninformation.</li>
        <li>Druck am Empfang. Der Bundesmantelvertrag nennt keine Wartefrist, aber wer Bedenkzeit anbietet, vermeidet Ärger und Beschwerden bei der Kassenärztlichen Vereinigung.</li>
        <li>Der Nutzen wird größer dargestellt, als er belegt ist.</li>
      </ol>

      <h2>Ehrlich zum Nutzen</h2>
      <p>
        Der IGeL-Monitor des Medizinischen Dienstes Bund bewertet Selbstzahlerleistungen nach der Studienlage. Einige Beispiele
        (Stand November 2026):
      </p>
      <table>
        <thead>
          <tr>
            <th>Leistung</th>
            <th>Bewertung im IGeL-Monitor</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Ultraschall der Eierstöcke zur Krebsfrüherkennung</td><td>negativ</td></tr>
          <tr><td>Augenspiegelung mit Augeninnendruckmessung zur Glaukom-Früherkennung</td><td>tendenziell negativ</td></tr>
          <tr><td>PSA-Test zur Früherkennung von Prostatakrebs</td><td>tendenziell negativ</td></tr>
          <tr><td>Ultraschall der Halsschlagadern zur Schlaganfallvorsorge</td><td>tendenziell negativ</td></tr>
          <tr><td>Ultraschall der Brust zur Krebsfrüherkennung</td><td>unklar</td></tr>
          <tr><td>Akupunktur zur Vorbeugung von Migräneanfällen</td><td>tendenziell positiv</td></tr>
        </tbody>
      </table>
      <p>
        Patienten kennen diese Bewertungen oft schon. Wer sie von sich aus nennt und trotzdem erklärt, für wen die Leistung im
        Einzelfall sinnvoll sein kann, wirkt glaubwürdiger als jedes Faltblatt.
      </p>

      <h2>In drei Sätzen erklärt</h2>
      <blockquote className="border-l-4 border-brand-300 pl-4 italic text-slate-600">
        „Ihre Kasse bezahlt bei diesem Anlass [Kassenleistung]. Zusätzlich gibt es [Leistung], das ist keine Kassenleistung und kostet
        [Betrag]. Der Nutzen ist [ehrliche Einordnung]; Sie müssen sich heute nicht entscheiden, ich gebe Ihnen alles schriftlich mit.“
      </blockquote>
      <p>
        Sorrida stellt Kassenleistung und Selbstzahlerleistung nebeneinander, nennt bei jedem Angebot, wann die Kasse zahlt und was
        zum Nutzen bekannt ist, und legt für das Team die Aufgabe an, die schriftliche Vereinbarung vor der Leistung einzuholen.
      </p>

      <h2>Quellen</h2>
      <ul className="text-sm">
        <li>
          <a href="https://www.kbv.de/documents/infothek/rechtsquellen/bundesmantelvertrag/bmv-aerzte.pdf" rel="noopener">
            Bundesmantelvertrag-Ärzte in der Fassung vom 1. November 2026, § 18 Abs. 8
          </a>{" "}
          (wann eine Vertragsarztpraxis von Versicherten eine Vergütung fordern darf)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/bgb/__630c.html" rel="noopener">
            § 630c BGB
          </a>{" "}
          (Kosteninformation in Textform)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/go__1982/__12.html" rel="noopener">
            § 12 GOÄ
          </a>{" "}
          (Inhalt der Rechnung, Kennzeichnung von Leistungen auf Verlangen)
        </li>
        <li>
          <a href="https://www.igel-monitor.de/igel-a-z.html" rel="noopener">
            IGeL-Monitor des Medizinischen Dienstes Bund, IGeL A–Z
          </a>{" "}
          (Bewertungen einzelner Selbstzahlerleistungen)
        </li>
      </ul>
    </ArticlePage>
  );
}
