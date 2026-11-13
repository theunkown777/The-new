import type { Metadata } from "next";
import Link from "next/link";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("selbstzahler-physiotherapie");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

export default function Page() {
  return (
    <ArticlePage slug="selbstzahler-physiotherapie">
      <h2>Vier Fälle, vier Antworten</h2>
      <table>
        <thead>
          <tr>
            <th>Fall</th>
            <th>Was gilt</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Kassenpatient mit Verordnung</td>
            <td>Kassenleistung. Der Patient zahlt nur die <Link prefetch={false} href="/ratgeber/heilmittel-zuzahlung">gesetzliche Zuzahlung</Link></td>
          </tr>
          <tr>
            <td>Privatpatient oder Selbstzahler mit ärztlicher Verordnung (Privatrezept)</td>
            <td>Behandlung zum vereinbarten Preis Ihrer Praxis. Der Patient reicht die Rechnung bei Versicherung oder Beihilfe ein</td>
          </tr>
          <tr>
            <td>Behandlung einer Erkrankung ohne ärztliche Verordnung</td>
            <td>Heilkunde. Dafür braucht die behandelnde Person eine Heilpraktikererlaubnis, die auf Physiotherapie beschränkt sein kann</td>
          </tr>
          <tr>
            <td>Prävention, Training, Wohlbefinden ohne Krankheitsbezug</td>
            <td>Ohne Verordnung möglich, zum Preis Ihrer Praxis</td>
          </tr>
        </tbody>
      </table>

      <h2>Ohne Verordnung behandeln: die Grenze</h2>
      <p>
        Wer Heilkunde ausübt, ohne Arzt zu sein, braucht eine Erlaubnis nach dem Heilpraktikergesetz. Physiotherapeutinnen und
        Physiotherapeuten behandeln Krankheiten deshalb auf ärztliche Verordnung. Das Bundesverwaltungsgericht hat 2009 entschieden,
        dass sie eine auf die Physiotherapie beschränkte Heilpraktikererlaubnis erhalten können und dann in diesem Bereich
        eigenverantwortlich ohne Verordnung behandeln dürfen (Urteil vom 26. August 2009, 3 C 19.08). Das Verfahren regeln die Länder.
      </p>
      <p>
        Ohne diese Erlaubnis bleibt ohne Verordnung nur, was keine Heilbehandlung ist: Präventionskurse, Gerätetraining, Massagen zum
        Wohlbefinden. Beschreiben Sie solche Angebote auch so und versprechen Sie keine Heilung oder Linderung von Krankheiten.
      </p>

      <h2>Preise richtig vereinbaren</h2>
      <ul>
        <li>Für Privatpatienten und Selbstzahler gibt es in der Physiotherapie keine staatliche Gebührenordnung. Es gilt der Preis, den Praxis und Patient vereinbaren. Eine eigene Preisliste je Leistung ist die Grundlage.</li>
        <li>Preis vor der ersten Behandlung in Textform nennen. Die Praxis weiß bei Selbstzahlern, dass kein Dritter sicher zahlt (<Link prefetch={false} href="/ratgeber/wirtschaftliche-aufklaerung-630c-bgb">§ 630c Abs. 3 BGB</Link>).</li>
        <li>Privatversicherte und Beihilfeberechtigte darauf hinweisen, dass ihr Tarif oder die Beihilfe möglicherweise nur einen Höchstbetrag erstattet. Für Bundesbeamte stehen die Höchstbeträge für Heilmittel in Anlage 9 der Bundesbeihilfeverordnung.</li>
        <li>Regel für abgesagte Termine gleich mit vereinbaren, siehe <Link prefetch={false} href="/ratgeber/ausfallhonorar-versaeumter-termin">Ausfallhonorar</Link>.</li>
      </ul>

      <h2>Kassenleistung und Selbstzahlerleistung sauber trennen</h2>
      <ol>
        <li>Erst sagen, was die Verordnung abdeckt und was die Kasse bezahlt.</li>
        <li>Zusätzliche Leistungen ausdrücklich als freiwillig kennzeichnen, mit eigenem Preis und eigener Rechnung. Für die verordnete Kassenleistung selbst fällt nur die gesetzliche Zuzahlung an.</li>
        <li>Wer nach dem Ende der Verordnung als Selbstzahler weitermachen will, sollte wissen: Mit einer neuen Verordnung wäre die Behandlung wieder Kassenleistung.</li>
        <li>Nichts unterschreiben lassen, was der Patient nicht in Ruhe lesen konnte.</li>
      </ol>

      <h2>Wann die Kasse doch etwas dazugibt</h2>
      <ul>
        <li><b>Präventionskurse:</b> Viele Krankenkassen bezuschussen Kurse, etwa Rückenschule, wenn der Kurs zertifiziert ist (§ 20 SGB V). Die Höhe legt jede Kasse selbst fest.</li>
        <li><b>Osteopathie und Ähnliches:</b> Manche Kassen erstatten einen Teil als freiwillige Zusatzleistung nach ihrer Satzung, oft mit Bedingungen wie einer ärztlichen Empfehlung. Der Patient sollte vorher bei seiner Kasse nachfragen.</li>
      </ul>

      <h2>Steuern nicht vergessen</h2>
      <p>
        Umsatzsteuerfrei sind Heilbehandlungen. Leistungen ohne therapeutisches Ziel, etwa Wellness oder allgemeines Fitnesstraining,
        fallen nicht darunter. Klären Sie mit Ihrer Steuerberatung, welche Ihrer Selbstzahlerangebote wie zu behandeln sind, bevor Sie
        die Preisliste drucken.
      </p>

      <h2>In drei Sätzen erklärt</h2>
      <blockquote className="border-l-4 border-brand-300 pl-4 italic text-slate-600">
        „Ihre Verordnung deckt sechs Behandlungen ab, dafür zahlen Sie nur die gesetzliche Zuzahlung. Wenn Sie danach weitermachen
        möchten, geht das mit einer neuen Verordnung Ihrer Ärztin wieder über die Kasse oder als Selbstzahler für [Betrag] je Termin.
        Ich gebe Ihnen beides schriftlich mit, entscheiden Sie in Ruhe.“
      </blockquote>
      <p>
        In Sorrida steht die Behandlung auf Verordnung mit der gesetzlichen Zuzahlung zuerst. Darunter folgen Ihre
        Selbstzahlerleistungen nach Ihrer Preisliste, jeweils mit dem Hinweis, wann die Kasse zahlt oder bezuschusst.
      </p>

      <h2>Quellen</h2>
      <ul className="text-sm">
        <li>
          Bundesverwaltungsgericht, Urteil vom 26. August 2009, 3 C 19.08 (auf Physiotherapie beschränkte Heilpraktikererlaubnis)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/bgb/__630c.html" rel="noopener">
            § 630c BGB
          </a>{" "}
          (Kosteninformation in Textform)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/bbhv/__23.html" rel="noopener">
            § 23 Bundesbeihilfeverordnung
          </a>{" "}
          (Heilmittel, Höchstbeträge nach Anlage 9)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/sgb_5/__20.html" rel="noopener">
            § 20 SGB V
          </a>{" "}
          (Leistungen der Kassen zur Prävention)
        </li>
      </ul>
    </ArticlePage>
  );
}
