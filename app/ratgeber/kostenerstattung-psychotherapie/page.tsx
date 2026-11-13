import type { Metadata } from "next";
import Link from "next/link";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("kostenerstattung-psychotherapie");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

export default function Page() {
  return (
    <ArticlePage slug="kostenerstattung-psychotherapie">
      <h2>Der Grundsatz</h2>
      <p>
        Gesetzlich Versicherte erhalten Psychotherapie als Sachleistung bei Therapeutinnen und Therapeuten mit Kassenzulassung. Kann
        die Kasse eine unaufschiebbare Leistung nicht rechtzeitig erbringen oder lehnt sie eine Leistung zu Unrecht ab, muss sie die
        Kosten der selbst beschafften Leistung in der entstandenen Höhe erstatten, soweit die Leistung notwendig war (§ 13 Abs. 3
        Satz 1 SGB V). Das ist der Weg, über den Privatpraxen ohne Kassenzulassung Kassenpatienten behandeln können.
      </p>

      <h2>Die Voraussetzungen</h2>
      <table>
        <thead>
          <tr>
            <th>Voraussetzung</th>
            <th>Was dahinter steht</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Die Behandlung ist notwendig und unaufschiebbar</td><td>Es liegt eine behandlungsbedürftige Erkrankung vor, und längeres Warten ist nicht zumutbar</td></tr>
          <tr><td>Die Kasse kann nicht rechtzeitig leisten</td><td>Bei zugelassenen Praxen ist in zumutbarer Zeit kein Therapieplatz zu bekommen</td></tr>
          <tr><td>Die Behandlerin oder der Behandler ist qualifiziert</td><td>Erstattungsfähig sind nur Leistungen von Psychotherapeuten, die die Voraussetzungen für den Eintrag ins Arztregister erfüllen: Approbation und Fachkunde (§ 13 Abs. 3 Satz 3, § 95c SGB V)</td></tr>
          <tr><td>Die Kasse wurde vorher gefragt</td><td>Der Antrag wird vor Beginn der Behandlung gestellt, damit die Kasse selbst einen Platz anbieten kann</td></tr>
        </tbody>
      </table>

      <h2>Welche Nachweise Patienten üblicherweise brauchen</h2>
      <p>
        Das Gesetz nennt keine Liste. Die Bundespsychotherapeutenkammer empfiehlt, dem Antrag diese Unterlagen beizulegen; die
        Anforderungen der einzelnen Kassen unterscheiden sich:
      </p>
      <ol>
        <li>die Bescheinigung aus einer psychotherapeutischen Sprechstunde bei einer zugelassenen Praxis, dass eine Psychotherapie notwendig ist und nicht aufgeschoben werden kann</li>
        <li>ein Protokoll der vergeblichen Suche: angefragte Kassenpraxen mit Datum, Uhrzeit und genannter Wartezeit</li>
        <li>die schriftliche Bestätigung der Privatpraxis, dass sie die Behandlung kurzfristig übernehmen kann, mit Angabe von Approbation und Fachkunde</li>
        <li>den Antrag auf Psychotherapie und Kostenerstattung nach § 13 Abs. 3 SGB V</li>
      </ol>

      <h2>Fristen der Kasse</h2>
      <ul>
        <li>Die Kasse muss zügig entscheiden, spätestens drei Wochen nach Eingang des Antrags. Holt sie ein Gutachten ein, etwa beim Medizinischen Dienst, sind es fünf Wochen (§ 13 Abs. 3a SGB V).</li>
        <li>Kann sie die Frist nicht halten, muss sie das rechtzeitig mit Gründen mitteilen. Ohne Mitteilung eines hinreichenden Grundes gilt die Leistung nach Ablauf der Frist als genehmigt.</li>
        <li>Gegen eine Ablehnung kann der Patient Widerspruch einlegen. Die Frist steht in der Rechtsbehelfsbelehrung des Bescheids.</li>
      </ul>

      <h2>Was die Praxis beachten sollte</h2>
      <ol>
        <li>Vertragspartner ist der Patient. Er schuldet das Honorar auch dann, wenn die Kasse ablehnt oder nur einen Teil erstattet. Das gehört vor der ersten Sitzung in Textform in seine Hand (<Link prefetch={false} href="/ratgeber/wirtschaftliche-aufklaerung-630c-bgb">§ 630c Abs. 3 BGB</Link>).</li>
        <li>Keine Zusage machen, dass die Kasse zahlt. Sagen Sie, was Sie beitragen können: Bestätigung, Qualifikationsnachweis, Kostenaufstellung.</li>
        <li>Mit dem Beginn warten, bis die Kasse entschieden hat, außer der Patient trägt das Kostenrisiko bewusst selbst.</li>
        <li>Die Rechnung nach der Gebührenordnung stellen und die Bewilligung beachten: Art der Therapie, Zahl der Sitzungen, Satz.</li>
        <li>Die Regel für abgesagte Sitzungen vorher vereinbaren, siehe <Link prefetch={false} href="/ratgeber/ausfallhonorar-versaeumter-termin">Ausfallhonorar</Link>. Ausgefallene Stunden erstattet die Kasse nicht.</li>
      </ol>

      <h2>Nicht verwechseln</h2>
      <p>
        Daneben gibt es die gewählte Kostenerstattung nach § 13 Abs. 2 SGB V: Versicherte können allgemein Kostenerstattung statt
        Sachleistung wählen und sind daran mindestens ein Kalendervierteljahr gebunden. Praxen ohne Zulassung dürfen sie dabei nur
        nach vorheriger Zustimmung der Kasse in Anspruch nehmen, und erstattet wird höchstens, was die Kasse als Sachleistung gezahlt
        hätte. Für den fehlenden Therapieplatz ist Absatz 3 der übliche Weg.
      </p>

      <h2>In drei Sätzen erklärt</h2>
      <blockquote className="border-l-4 border-brand-300 pl-4 italic text-slate-600">
        „Ihre Kasse bezahlt Psychotherapie grundsätzlich nur bei zugelassenen Praxen. Wenn Sie dort trotz dringendem Bedarf keinen
        Platz bekommen, können Sie bei Ihrer Kasse beantragen, dass sie die Kosten bei uns erstattet; die Unterlagen dafür stelle ich
        Ihnen zusammen. Bis die Kasse zugestimmt hat, wäre jede Sitzung auf Ihre eigene Rechnung, zum Preis von [Betrag].“
      </blockquote>
      <p>
        Sorrida zeigt in der Psychotherapie die Richtlinientherapie auf Kasse zuerst, erklärt die Kostenerstattung als Weg und nennt
        den Preis der Selbstzahler-Sitzung. Den Antrag bei der Kasse stellt Sorrida nicht.
      </p>

      <h2>Quellen</h2>
      <ul className="text-sm">
        <li>
          <a href="https://www.gesetze-im-internet.de/sgb_5/__13.html" rel="noopener">
            § 13 SGB V
          </a>{" "}
          (Kostenerstattung, Absätze 2, 3 und 3a)
        </li>
        <li>
          <a href="https://www.bptk.de/neuigkeiten/weiterhin-anspruch-auf-kostenerstattung-in-psychotherapeutischer-privatpraxis/" rel="noopener">
            Bundespsychotherapeutenkammer: Weiterhin Anspruch auf Kostenerstattung in psychotherapeutischer Privatpraxis
          </a>{" "}
          (empfohlene Nachweise)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/bgb/__630c.html" rel="noopener">
            § 630c BGB
          </a>{" "}
          (Kosteninformation in Textform)
        </li>
      </ul>
    </ArticlePage>
  );
}
