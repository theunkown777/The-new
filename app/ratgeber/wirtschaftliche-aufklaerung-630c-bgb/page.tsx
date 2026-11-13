import type { Metadata } from "next";
import Link from "next/link";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("wirtschaftliche-aufklaerung-630c-bgb");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

export default function Page() {
  return (
    <ArticlePage slug="wirtschaftliche-aufklaerung-630c-bgb">
      <h2>Die Pflicht in einem Satz</h2>
      <p>
        Weiß die Praxis, dass ein Dritter (Krankenkasse, private Versicherung, Beihilfe) die Behandlungskosten nicht sicher vollständig
        übernimmt, oder gibt es dafür hinreichende Anhaltspunkte, muss sie den Patienten vor Beginn der Behandlung in Textform über die
        voraussichtlichen Kosten informieren (§ 630c Abs. 3 Satz 1 BGB). Juristen nennen das wirtschaftliche Aufklärung oder
        wirtschaftliche Information.
      </p>
      <p>
        Die Vorschrift gehört zum Behandlungsvertrag und gilt deshalb nicht nur für Ärzte und Zahnärzte, sondern für alle, die
        medizinische Behandlungen zusagen, also auch für Psychotherapie- und Therapiepraxen.
      </p>

      <h2>Wann sie greift</h2>
      <table>
        <thead>
          <tr>
            <th>Situation</th>
            <th>Kosteninformation nötig?</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Kassenpatient, reine Kassenleistung</td><td>Keine gesonderte Kosteninformation. Auf gesetzliche Zuzahlungen weist das Team trotzdem hin</td></tr>
          <tr><td>Kassenpatient, Selbstzahlerleistung oder Mehrkosten</td><td>Ja. Die Praxis weiß, dass die Kasse nicht zahlt</td></tr>
          <tr><td>Privatpatient, übliche Behandlung</td><td>In der Regel nein. Den Tarif kennt nur der Patient</td></tr>
          <tr><td>Privatpatient, Leistung mit bekannten Erstattungsproblemen</td><td>Ja, sobald die Praxis Anhaltspunkte hat, etwa bei nicht allgemein anerkannten Methoden</td></tr>
        </tbody>
      </table>

      <h2>Was Textform bedeutet</h2>
      <ul>
        <li>Eine lesbare Erklärung, in der die Praxis als Absender genannt ist, auf einem dauerhaften Datenträger (§ 126b BGB). Papier, E-Mail oder ein gespeichertes PDF genügen.</li>
        <li>Eine Unterschrift verlangt die Textform nicht. Das mündliche Gespräch allein reicht aber nicht.</li>
        <li>
          Strengere Formvorschriften gehen vor (§ 630c Abs. 3 Satz 2 BGB). Beispiele: die schriftliche Zustimmung zu
          Selbstzahlerleistungen in der Arztpraxis, die schriftliche{" "}
          <Link prefetch={false} href="/ratgeber/mehrkostenvereinbarung">Mehrkostenvereinbarung</Link> bei Füllungen und die abweichende Vereinbarung
          nach § 2 GOÄ.
        </li>
      </ul>

      <h2>Was hineingehört</h2>
      <ol>
        <li>Die geplante Leistung in Worten, die der Patient versteht.</li>
        <li>Die voraussichtlichen Kosten als Betrag in Euro. Ein „ungefähr“ ist erlaubt, ein fehlender Betrag nicht.</li>
        <li>Der Hinweis, dass die Kasse oder Versicherung die Kosten nicht oder möglicherweise nicht ganz übernimmt.</li>
        <li>Die Alternative, die die Kasse bezahlt, wenn es eine gibt. Das Gesetz verlangt sie an dieser Stelle nicht ausdrücklich, sie gehört aber zur Aufklärung über Behandlungsalternativen und schafft Vertrauen.</li>
        <li>Datum und Name der Praxis.</li>
      </ol>

      <h2>Wann die Information entfallen kann</h2>
      <p>
        Nur ausnahmsweise: wenn die Behandlung unaufschiebbar ist oder der Patient ausdrücklich verzichtet (§ 630c Abs. 4 BGB). Im
        Alltag einer Praxis mit planbaren Leistungen ist das selten.
      </p>

      <h2>Was passiert, wenn sie fehlt</h2>
      <ul>
        <li>Der Patient kann Schadensersatz verlangen und ihn der Rechnung entgegenhalten. Im Ergebnis kann die Praxis auf ihrem Honorar sitzen bleiben.</li>
        <li>
          Der Patient muss allerdings beweisen, dass er sich bei richtiger Information gegen die Behandlung entschieden hätte. Eine
          Umkehr der Beweislast gibt es nicht (Bundesgerichtshof, Urteil vom 28. Januar 2020, VI ZR 92/19).
        </li>
        <li>Unabhängig vom Recht: Die meisten Beschwerden über Rechnungen beginnen mit dem Satz „Das hat mir vorher niemand gesagt“.</li>
      </ul>

      <h2>In zwei Sätzen erklärt</h2>
      <blockquote className="border-l-4 border-brand-300 pl-4 italic text-slate-600">
        „Diese Leistung übernimmt Ihre Kasse nicht, sie kostet voraussichtlich [Betrag]. Ich gebe Ihnen das schriftlich mit, dann
        können Sie in Ruhe entscheiden, und die Kassenleistung bekommen Sie in jedem Fall.“
      </blockquote>
      <p>
        Sorrida erzeugt nach dem Gespräch eine Patienteninformation in Textform mit den Kosten je Option, die Kassenleistung steht
        zuerst. Der Patient erhält sie als Link aufs Handy und kann von dort zurückmelden, wofür er sich entscheidet.
      </p>

      <h2>Quellen</h2>
      <ul className="text-sm">
        <li>
          <a href="https://www.gesetze-im-internet.de/bgb/__630c.html" rel="noopener">
            § 630c BGB
          </a>{" "}
          (Informationspflichten, Absatz 3 und 4)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/bgb/__126b.html" rel="noopener">
            § 126b BGB
          </a>{" "}
          (Textform)
        </li>
        <li>
          Bundesgerichtshof, Urteil vom 28. Januar 2020, VI ZR 92/19 (Folgen einer unterlassenen Kosteninformation, Beweislast)
        </li>
        <li>
          <a href="https://www.kbv.de/documents/infothek/rechtsquellen/bundesmantelvertrag/bmv-aerzte.pdf" rel="noopener">
            Bundesmantelvertrag-Ärzte, § 18 Abs. 8
          </a>{" "}
          (strengere Form bei Selbstzahlerleistungen in der Vertragsarztpraxis)
        </li>
      </ul>
    </ArticlePage>
  );
}
