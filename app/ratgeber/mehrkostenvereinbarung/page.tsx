import type { Metadata } from "next";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("mehrkostenvereinbarung");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

export default function Page() {
  return (
    <ArticlePage slug="mehrkostenvereinbarung">
      <h2>Worum es geht</h2>
      <p>
        Wählt ein gesetzlich versicherter Patient bei einer Füllung eine aufwendigere Versorgung als die Kassenleistung, etwa ein
        Mehrschicht-Komposit im Seitenzahnbereich oder ein Keramik-Inlay, regelt § 28 Abs. 2 SGB V die Abrechnung: Die Kasse zahlt die
        vergleichbare preisgünstigste Kassenfüllung, den Rest trägt der Patient. Voraussetzung ist eine schriftliche Vereinbarung vor
        Beginn der Behandlung.
      </p>

      <h2>Was die Kasse weiter zahlt</h2>
      <p>
        Abgerechnet wird über die Praxissoftware die passende BEMA-Füllungsposition für Zahn und Flächenzahl. Der Patient zahlt die
        Differenz zwischen der privaten Berechnung nach GOZ und diesem Kassenbetrag. Für den Patienten heißt das: Er bekommt nicht
        alles privat berechnet, die Kasse beteiligt sich immer.
      </p>

      <h2>Wann keine Mehrkosten entstehen</h2>
      <ul>
        <li>
          Im Frontzahnbereich ist die adhäsive Kompositfüllung bereits Kassenleistung. Hier gibt es keinen Grund für eine
          Mehrkostenvereinbarung über Komposit.
        </li>
        <li>
          Im Seitenzahnbereich gibt es seit dem Ende von Amalgam als Regelmaterial eine Kassenfüllung aus selbstadhäsivem Material. Wer
          diese wählt, zahlt nichts dazu.
        </li>
        <li>Bei Zahnersatz gelten eigene Regeln (Festzuschuss, gleich- und andersartige Versorgung), keine Mehrkostenvereinbarung.</li>
      </ul>

      <h2>Häufige Fehler</h2>
      <ol>
        <li>Die Vereinbarung wird erst nach der Behandlung unterschrieben. Sie muss vorher vorliegen.</li>
        <li>Die Kassenposition wird vergessen. Dann zahlt der Patient zu viel, und es gibt Ärger bei Rückfragen der Kasse.</li>
        <li>Es fehlt ein Betrag. Der Patient sollte vor der Unterschrift wissen, wie viel er ungefähr zahlt.</li>
        <li>
          Die Kassenalternative wird nicht genannt. Patienten müssen wissen, dass es eine Füllung ohne Zuzahlung gibt, sonst fühlt sich
          das Angebot wie Verkauf an.
        </li>
      </ol>

      <h2>So sprechen Sie es an</h2>
      <blockquote className="border-l-4 border-brand-300 pl-4 italic text-slate-600">
        „Ihre Kasse bezahlt eine haltbare Füllung ohne Zuzahlung. Alternativ kann ich eine Kunststofffüllung in Schichttechnik legen,
        die dichter abschließt und zahnfarben ist. Dafür zahlen Sie etwa 105 Euro dazu. Beides ist in Ordnung.“
      </blockquote>
    </ArticlePage>
  );
}
