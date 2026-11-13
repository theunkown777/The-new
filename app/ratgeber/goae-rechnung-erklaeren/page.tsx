import type { Metadata } from "next";
import Link from "next/link";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("goae-rechnung-erklaeren");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

// Punktwert nach § 5 Abs. 1 Satz 3 GOÄ. Beispiel: Nr. 1 (Beratung) mit 80 Punkten.
const PUNKTWERT = 0.0582873;
const PUNKTE = 80;
const euro = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €`;
const betrag = (faktor: number) => euro(PUNKTE * PUNKTWERT * faktor);

export default function Page() {
  return (
    <ArticlePage slug="goae-rechnung-erklaeren">
      <h2>So entsteht ein Betrag</h2>
      <p>
        Jede Leistung der Gebührenordnung für Ärzte (GOÄ) hat eine Nummer und eine Punktzahl. Der Betrag ergibt sich aus drei Zahlen
        (§ 5 GOÄ):
      </p>
      <ol>
        <li><b>Punktzahl</b> der Leistung aus dem Gebührenverzeichnis</li>
        <li><b>Punktwert:</b> 5,82873 Cent, für alle Leistungen gleich</li>
        <li><b>Steigerungssatz</b> (Faktor), den die Praxis nach Schwierigkeit, Zeitaufwand und Umständen bestimmt</li>
      </ol>
      <p>Beispiel Nr. 1, Beratung, {PUNKTE} Punkte:</p>
      <table>
        <thead>
          <tr>
            <th>Faktor</th>
            <th>Betrag</th>
            <th>Bedeutung</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>1,0</td><td>{betrag(1)}</td><td>einfacher Gebührensatz</td></tr>
          <tr><td>2,3</td><td>{betrag(2.3)}</td><td>Regelfall, ohne Begründung möglich</td></tr>
          <tr><td>3,5</td><td>{betrag(3.5)}</td><td>Höchstsatz, nur mit schriftlicher Begründung</td></tr>
        </tbody>
      </table>

      <h2>Drei Gebührenrahmen</h2>
      <table>
        <thead>
          <tr>
            <th>Art der Leistung</th>
            <th>Rahmen</th>
            <th>Begründung nötig über</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Persönliche ärztliche Leistungen</td><td>1,0 bis 3,5</td><td>2,3</td></tr>
          <tr><td>Überwiegend technische Leistungen (Abschnitte A, E und O)</td><td>1,0 bis 2,5</td><td>1,8</td></tr>
          <tr><td>Labor (Abschnitt M) und Nr. 437</td><td>1,0 bis 1,3</td><td>1,15</td></tr>
        </tbody>
      </table>
      <p>
        Patienten fragen oft, warum „2,3-fach“ auf der Rechnung steht. Die Antwort: Das ist kein Aufschlag, sondern der Satz, den die
        Verordnung selbst als Regel nennt. Erst darüber muss die Praxis begründen.
      </p>

      <h2>Was auf der Rechnung stehen muss</h2>
      <p>Die Vergütung wird erst fällig, wenn eine Rechnung vorliegt, die der GOÄ entspricht (§ 12 Abs. 1). Sie muss insbesondere enthalten:</p>
      <ul>
        <li>das Datum, an dem die Leistung erbracht wurde</li>
        <li>Nummer und Bezeichnung jeder Leistung, den Betrag und den Steigerungssatz</li>
        <li>eine in der Leistungsbeschreibung genannte Mindestdauer</li>
        <li>bei Auslagen den Betrag und die Art der Auslage; über 25,56 € (50 DM) je Auslage gehört ein Beleg dazu</li>
        <li>bei Leistungen, die es im Verzeichnis nicht gibt (Analogleistung): eine verständliche Beschreibung, den Hinweis „entsprechend“ und Nummer und Bezeichnung der gleichwertigen Leistung</li>
        <li>bei Leistungen auf Verlangen, also über das medizinisch Notwendige hinaus: die Kennzeichnung als solche</li>
      </ul>

      <h2>Die Begründung über dem Schwellenwert</h2>
      <ul>
        <li>Sie muss schriftlich auf der Rechnung stehen, sich auf die einzelne Leistung beziehen und für den Zahlungspflichtigen verständlich und nachvollziehbar sein (§ 12 Abs. 3).</li>
        <li>Zulässige Gründe sind Schwierigkeit, Zeitaufwand und Umstände bei der Ausführung. Was schon in der Leistungsbeschreibung steckt, zählt nicht noch einmal (§ 5 Abs. 2).</li>
        <li>Auf Verlangen ist die Begründung näher zu erläutern. Eine konkrete Angabe zum Fall hilft dem Patienten auch gegenüber Versicherung und Beihilfe mehr als ein Textbaustein.</li>
      </ul>

      <h2>Mehr als der Höchstsatz: nur mit Vereinbarung</h2>
      <p>
        Eine andere Gebührenhöhe ist nur durch eine abweichende Vereinbarung möglich (§ 2 GOÄ): nach persönlicher Absprache im Einzelfall,
        vor der Leistung, in einem eigenen Schriftstück mit Nummer, Bezeichnung, Steigerungssatz und Betrag. Es muss den Hinweis
        enthalten, dass Erstattungsstellen die Vergütung möglicherweise nicht voll erstatten, und darf keine weiteren Erklärungen
        enthalten. Der Patient bekommt einen Abdruck. Für technische Leistungen und Labor (Abschnitte A, E, M und O) ist das nicht
        zulässig, Punktzahl und Punktwert lassen sich nie abweichend vereinbaren.
      </p>

      <h2>Gilt das auch für IGeL?</h2>
      <p>
        Ja. Auch Selbstzahlerleistungen für Kassenpatienten rechnen Ärzte nach der GOÄ ab, mit Nummer, Faktor und Betrag je Leistung.
        Ein frei gesetzter Pauschalpreis ohne diese Angaben ist keine Rechnung nach GOÄ. Was vorher zu vereinbaren ist, steht im
        Ratgeber <Link prefetch={false} href="/ratgeber/igel-vereinbarung">IGeL richtig vereinbaren</Link>.
      </p>

      <h2>Und die neue GOÄ?</h2>
      <p>
        Stand November 2026 gilt die bisherige GOÄ unverändert. Bundesärztekammer und PKV-Verband haben dem Bundesgesundheitsministerium
        im Juli 2026 einen aktualisierten gemeinsamen Entwurf übergeben, das Ministerium bereitet einen Referentenentwurf vor. Die
        Bundesärztekammer hält ein Inkrafttreten zum 1. Januar 2028 für realistisch. Beschlossen ist das noch nicht.
      </p>

      <h2>In drei Sätzen erklärt</h2>
      <blockquote className="border-l-4 border-brand-300 pl-4 italic text-slate-600">
        „Jede Leistung hat in der Gebührenordnung einen festen Grundbetrag. Den multiplizieren wir mit einem Faktor, im Normalfall 2,3,
        das ist der übliche Satz und kein Zuschlag. Wo wir darüber liegen, steht der Grund direkt bei der Leistung.“
      </blockquote>
      <p>
        Sorrida enthält einen Gebührenrechner für die GOÄ mit den drei Rahmen, zeigt den Betrag je Faktor und erinnert an die
        Begründung, sobald der Schwellenwert überschritten wird.
      </p>

      <h2>Quellen</h2>
      <ul className="text-sm">
        <li>
          <a href="https://www.gesetze-im-internet.de/go__1982/__5.html" rel="noopener">
            § 5 GOÄ
          </a>{" "}
          (Punktwert, Gebührenrahmen, Schwellenwerte)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/go__1982/__12.html" rel="noopener">
            § 12 GOÄ
          </a>{" "}
          (Fälligkeit, Pflichtangaben, Begründung)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/go__1982/__2.html" rel="noopener">
            § 2 GOÄ
          </a>{" "}
          (abweichende Vereinbarung)
        </li>
        <li>
          <a href="https://www.bundesaerztekammer.de/neue-goae" rel="noopener">
            Bundesärztekammer: Neue GOÄ
          </a>{" "}
          (Stand des Reformverfahrens)
        </li>
      </ul>
    </ArticlePage>
  );
}
