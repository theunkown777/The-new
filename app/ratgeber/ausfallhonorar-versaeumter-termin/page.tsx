import type { Metadata } from "next";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("ausfallhonorar-versaeumter-termin");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

export default function Page() {
  return (
    <ArticlePage slug="ausfallhonorar-versaeumter-termin">
      <h2>Die Rechtsgrundlage</h2>
      <p>
        Eine eigene Vorschrift zum Ausfallhonorar gibt es nicht, auch keine Ziffer in einer Gebührenordnung. Grundlage ist der
        Annahmeverzug im Dienstvertragsrecht: Nimmt der Patient die angebotene Behandlung nicht an, kann die Praxis die vereinbarte
        Vergütung verlangen, ohne nachleisten zu müssen (§ 615 BGB). Der Bundesgerichtshof hat 2022 bestätigt, dass diese Vorschrift
        auch für Behandlungsverträge gilt (Urteil vom 12. Mai 2022, III ZR 78/21). Der Fall betraf eine Ergotherapiepraxis.
      </p>

      <h2>Was der Bundesgerichtshof entschieden hat</h2>
      <ul>
        <li>§ 615 BGB ist auf Behandlungsverträge anwendbar. Der Anspruch richtet sich auch gegen gesetzlich versicherte Patienten persönlich, denn die Krankenkasse bezahlt keine ausgefallenen Termine.</li>
        <li>Ob ein Termin so verbindlich ist, dass schon das Nichterscheinen den Annahmeverzug auslöst, hängt von den Umständen ab. Im entschiedenen Fall genügte es, dass die Praxis Termine exklusiv vergab, sie nicht kurzfristig neu belegen konnte und die Patientenseite das erkennen konnte.</li>
        <li>Die Absage eines einzelnen Termins ist keine Kündigung des Behandlungsvertrags.</li>
        <li>Bringen Eltern ihr Kind zur Behandlung, kommt der Vertrag in der Regel mit den Eltern zustande. Sie sind dann auch Schuldner eines Ausfallhonorars.</li>
        <li>Kein Annahmeverzug, wenn die Praxis selbst nicht hätte behandeln können oder dürfen. Deshalb ging die Praxis in diesem Fall leer aus.</li>
        <li>Offen gelassen hat das Gericht, ob eine vorformulierte Klausel mit 24 Stunden Absagefrist und Pauschale einer Inhaltskontrolle standhält.</li>
      </ul>

      <h2>Wann ein Ausfallhonorar in Betracht kommt</h2>
      <table>
        <thead>
          <tr>
            <th>Voraussetzung</th>
            <th>Was das im Alltag heißt</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Fester Termin, nur für diesen Patienten reserviert</td><td>Bestellpraxis mit längeren Terminen. Bei offener Sprechstunde oder Mehrfachbelegung fehlt es daran</td></tr>
          <tr><td>Der Patient kennt die Regel</td><td>Hinweis bei der Terminvergabe, am besten unterschrieben oder in Textform bestätigt</td></tr>
          <tr><td>Die Praxis war bereit und in der Lage zu behandeln</td><td>Behandler und Raum standen zur Verfügung</td></tr>
          <tr><td>Es ist ein Ausfall entstanden</td><td>Wurde der Termin anders vergeben, ist das anzurechnen, ebenso ersparte Kosten wie Material (§ 615 Satz 2 BGB)</td></tr>
        </tbody>
      </table>

      <h2>Was unsicher bleibt</h2>
      <ul>
        <li>Die Höhe. Das Gesetz spricht von der vereinbarten Vergütung abzüglich des Ersparten. Eine feste Pauschale ist nirgends vorgegeben, Gerichte beurteilen Pauschalen unterschiedlich.</li>
        <li>Die Absagefrist. 24 oder 48 Stunden sind verbreitet, eine gesetzliche Frist gibt es nicht.</li>
        <li>Die Form der Vereinbarung. Vorformulierte Klauseln unterliegen der Kontrolle für Allgemeine Geschäftsbedingungen. Lassen Sie Ihre Formulierung einmal von Ihrem Berufsverband oder anwaltlich prüfen.</li>
      </ul>

      <h2>Checkliste für die Terminvereinbarung</h2>
      <ol>
        <li>Regel schriftlich festhalten: Absage bis wann, auf welchem Weg, welcher Betrag sonst anfällt.</li>
        <li>Bei der ersten Terminvergabe aushändigen und bestätigen lassen. Ein Aushang allein ist schwach.</li>
        <li>Unverschuldetes Fernbleiben ausnehmen, etwa bei akuter Erkrankung oder Unfall. Das ist fair und vermeidet Streit.</li>
        <li>Absagen dokumentieren: wann, wie, von wem.</li>
        <li>Vor der Rechnung prüfen, ob der Termin neu vergeben wurde. Dann gibt es nichts zu berechnen.</li>
        <li>Die Rechnung geht an den Patienten, bei Kindern an die Eltern, nie an die Kasse.</li>
        <li>Vorher erinnern. Eine Erinnerung am Vortag verhindert mehr Ausfälle als jede Klausel.</li>
      </ol>

      <h2>In zwei Sätzen erklärt</h2>
      <blockquote className="border-l-4 border-brand-300 pl-4 italic text-slate-600">
        „Wir halten diesen Termin nur für Sie frei. Wenn Sie nicht kommen können, sagen Sie bitte bis [Frist] ab, sonst müssen wir
        Ihnen die ausgefallene Zeit mit [Betrag] berechnen, weil Ihre Kasse das nicht übernimmt.“
      </blockquote>
      <p>
        Sorrida erzeugt zu jedem Termin einen Bestätigungs- und einen Erinnerungstext zum Versenden und zeigt die Ausfallquote der
        letzten Wochen. Ein Ausfallhonorar berechnet Sorrida nicht automatisch; das bleibt eine Entscheidung der Praxis.
      </p>

      <h2>Quellen</h2>
      <ul className="text-sm">
        <li>
          <a href="https://www.gesetze-im-internet.de/bgb/__615.html" rel="noopener">
            § 615 BGB
          </a>{" "}
          (Vergütung bei Annahmeverzug, Anrechnung)
        </li>
        <li>
          Bundesgerichtshof, Urteil vom 12. Mai 2022, III ZR 78/21 (Ausfallpauschale einer Ergotherapiepraxis; § 615 BGB bei Behandlungsverträgen)
        </li>
      </ul>
    </ArticlePage>
  );
}
