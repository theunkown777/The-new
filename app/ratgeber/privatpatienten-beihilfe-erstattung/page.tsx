import type { Metadata } from "next";
import Link from "next/link";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("privatpatienten-beihilfe-erstattung");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

export default function Page() {
  return (
    <ArticlePage slug="privatpatienten-beihilfe-erstattung">
      <h2>Wer schuldet die Rechnung?</h2>
      <p>
        Der Patient. Bei Privatversicherten und Beihilfeberechtigten besteht der Behandlungsvertrag nur zwischen Praxis und Patient.
        Versicherung und Beihilfestelle erstatten dem Patienten später, was Tarif und Beihilferecht vorsehen. Die Rechnung ist deshalb
        unabhängig davon zu bezahlen, ob und wann erstattet wird. Fällig wird sie, sobald sie der Gebührenordnung entspricht (bei
        Ärzten § 12 Abs. 1 GOÄ).
      </p>

      <h2>Private Krankenversicherung</h2>
      <ul>
        <li>Der Versicherer erstattet im vereinbarten Umfang die Aufwendungen für medizinisch notwendige Heilbehandlung (§ 192 Abs. 1 Versicherungsvertragsgesetz). Was „vereinbart“ ist, steht im Tarif, den nur der Patient kennt.</li>
        <li>Viele Tarife haben einen Selbstbehalt oder erstatten bestimmte Leistungen nur anteilig, etwa Heilmittel, Hilfsmittel, Psychotherapie oder Zahnersatz.</li>
        <li>Rechnungen über dem Schwellenwert (bei Ärzten 2,3-fach) prüfen Versicherer genauer. Eine konkrete Begründung auf der Rechnung erspart dem Patienten Rückfragen, siehe <Link prefetch={false} href="/ratgeber/goae-rechnung-erklaeren">GOÄ-Rechnung erklären</Link>.</li>
        <li>Im Basistarif gelten begrenzte Steigerungssätze. Fragen Sie danach, bevor Sie behandeln.</li>
      </ul>

      <h2>Beihilfe</h2>
      <p>
        Beamte und ihre Angehörigen erhalten vom Dienstherrn einen prozentualen Anteil der beihilfefähigen Aufwendungen, den
        Bemessungssatz. Den Rest deckt in der Regel eine private Restkostenversicherung. Für Bundesbeamte gilt die
        Bundesbeihilfeverordnung (§ 46 BBhV):
      </p>
      <table>
        <thead>
          <tr>
            <th>Person</th>
            <th>Bemessungssatz Bund</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Beihilfeberechtigte (aktive Beamte)</td><td>50 %</td></tr>
          <tr><td>Beihilfeberechtigte mit zwei oder mehr berücksichtigungsfähigen Kindern</td><td>70 %</td></tr>
          <tr><td>Versorgungsempfänger (Pensionäre)</td><td>70 %</td></tr>
          <tr><td>Berücksichtigungsfähige Ehe- und Lebenspartner</td><td>70 %</td></tr>
          <tr><td>Berücksichtigungsfähige Kinder und Waisen</td><td>80 %</td></tr>
        </tbody>
      </table>
      <p>
        Die Länder haben eigene Beihilfevorschriften mit teils anderen Sätzen und Regeln. Fragen Sie deshalb nie „Sie haben doch
        50 Prozent?“, sondern überlassen Sie die Zahl dem Patienten.
      </p>

      <h2>Warum trotzdem eine Lücke bleiben kann</h2>
      <ul>
        <li>Beihilfefähig sind nur notwendige und wirtschaftlich angemessene Aufwendungen (§ 6 Abs. 3 BBhV). Leistungen auf Verlangen und manche Methoden fallen heraus.</li>
        <li>Für Heilmittel wie Physiotherapie, Ergotherapie oder Logopädie nennt die Bundesbeihilfeverordnung Höchstbeträge (§ 23 und Anlage 9 BBhV). Liegt der Preis der Praxis darüber, trägt der Patient den Unterschied, soweit seine Versicherung ihn nicht übernimmt.</li>
        <li>Selbstbehalte, Tarifgrenzen und Ausschlüsse der privaten Versicherung.</li>
      </ul>
      <p>
        Hat die Praxis Anhaltspunkte, dass nicht alles erstattet wird, muss sie vor der Behandlung in Textform über die
        voraussichtlichen Kosten informieren, siehe{" "}
        <Link prefetch={false} href="/ratgeber/wirtschaftliche-aufklaerung-630c-bgb">Wirtschaftliche Aufklärung nach § 630c BGB</Link>.
      </p>

      <h2>Was am Empfang hilft</h2>
      <ol>
        <li>Bei der Anmeldung fragen: privat versichert, beihilfeberechtigt, Basistarif? Das gehört in die Stammdaten.</li>
        <li>Vor teureren Behandlungen einen Kostenvoranschlag mitgeben. Patienten können ihn bei Versicherung und Beihilfestelle vorab einreichen.</li>
        <li>Keine Zusagen zur Erstattung. Die Praxis kennt weder Tarif noch Beihilfebescheid.</li>
        <li>Rechnung vollständig und verständlich stellen. Jede Rückfrage der Versicherung landet sonst wieder am Empfang.</li>
        <li>Zahlungsziel nennen und freundlich erklären, dass es nicht von der Erstattung abhängt.</li>
      </ol>

      <h2>In drei Sätzen erklärt</h2>
      <blockquote className="border-l-4 border-brand-300 pl-4 italic text-slate-600">
        „Sie bekommen von uns eine Rechnung nach der Gebührenordnung, die Sie bei Ihrer Versicherung und, wenn Sie beihilfeberechtigt
        sind, bei der Beihilfestelle einreichen. Was erstattet wird, hängt von Ihrem Tarif ab, das können wir leider nicht für Sie
        prüfen. Wenn Sie vorher Sicherheit möchten, gebe ich Ihnen gern einen Kostenvoranschlag mit.“
      </blockquote>
      <p>
        Sorrida führt privat Versicherte und Beihilfe als eigene Abrechnungsarten und erstellt die Kosteninformation mit den Preisen
        Ihrer Praxis. Wie viel ein Tarif oder eine Beihilfestelle erstattet, berechnet Sorrida nicht.
      </p>

      <h2>Quellen</h2>
      <ul className="text-sm">
        <li>
          <a href="https://www.gesetze-im-internet.de/bbhv/__46.html" rel="noopener">
            § 46 Bundesbeihilfeverordnung
          </a>{" "}
          (Bemessungssätze des Bundes)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/bbhv/__6.html" rel="noopener">
            § 6 Bundesbeihilfeverordnung
          </a>{" "}
          (notwendige und wirtschaftlich angemessene Aufwendungen)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/bbhv/__23.html" rel="noopener">
            § 23 Bundesbeihilfeverordnung
          </a>{" "}
          (Heilmittel, Höchstbeträge nach Anlage 9)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/vvg_2008/__192.html" rel="noopener">
            § 192 Versicherungsvertragsgesetz
          </a>{" "}
          (Leistung der privaten Krankenversicherung)
        </li>
        <li>
          <a href="https://www.gesetze-im-internet.de/go__1982/__12.html" rel="noopener">
            § 12 GOÄ
          </a>{" "}
          (Fälligkeit und Inhalt der Rechnung)
        </li>
      </ul>
    </ArticlePage>
  );
}
