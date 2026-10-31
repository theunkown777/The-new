import type { Metadata } from "next";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("festzuschuss-2027");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

const ROWS = [
  { bonus: "ohne Bonus", s26: 60, s27: 50 },
  { bonus: "Bonusheft 5 Jahre", s26: 70, s27: 60 },
  { bonus: "Bonusheft 10 Jahre", s26: 75, s27: 65 },
];
const REGEL = 1750;
const euro = (n: number) => `${Math.round(n).toLocaleString("de-DE")} €`;

export default function Page() {
  return (
    <ArticlePage slug="festzuschuss-2027">
      <h2>Das Wichtigste in drei Sätzen</h2>
      <ul>
        <li>Für Zahnersatz zahlen die gesetzlichen Kassen ab 1. Januar 2027 einen um zehn Prozentpunkte niedrigeren Festzuschuss.</li>
        <li>Es zählt das Datum, an dem die Kasse den Heil- und Kostenplan bewilligt. Der Termin der Behandlung spielt keine Rolle.</li>
        <li>Wer noch 2026 bewilligt bekommt, behält die alten Sätze, auch wenn die Krone erst im Frühjahr eingesetzt wird.</li>
      </ul>

      <h2>Die Sätze im Vergleich</h2>
      <p>
        Der Festzuschuss richtet sich nach dem Befund und deckt einen Prozentsatz der Kosten der Regelversorgung. Die Eurobeträge je
        Befund legt der Gemeinsame Bundesausschuss fest. Grundlage der Kürzung ist das GKV-Beitragssatzstabilisierungsgesetz.
      </p>
      <table>
        <thead>
          <tr>
            <th>Bonus</th>
            <th>bewilligt bis 31.12.2026</th>
            <th>bewilligt ab 1.1.2027</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.bonus}>
              <td>{r.bonus}</td>
              <td>{r.s26} %</td>
              <td>{r.s27} %</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Härtefälle erhalten weiterhin die vollen Kosten der Regelversorgung.</p>

      <h2>Rechenbeispiel: Brücke als Regelversorgung</h2>
      <p>
        Angenommen, die Regelversorgung für eine Lücke an Zahn 36 kostet {euro(REGEL)}. So ändert sich der Eigenanteil des Patienten:
      </p>
      <table>
        <thead>
          <tr>
            <th>Bonus</th>
            <th>Eigenanteil 2026</th>
            <th>Eigenanteil 2027</th>
            <th>Mehr</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => {
            const e26 = REGEL * (1 - r.s26 / 100);
            const e27 = REGEL * (1 - r.s27 / 100);
            return (
              <tr key={r.bonus}>
                <td>{r.bonus}</td>
                <td>{euro(e26)}</td>
                <td>{euro(e27)}</td>
                <td>+{euro(e27 - e26)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>
        Bei gleich- und andersartiger Versorgung, also etwa einer Vollkeramik-Brücke oder einem Implantat, bleibt der Festzuschuss an
        die Regelversorgung gebunden. Der Mehrbetrag ist deshalb in Euro derselbe, nur der Gesamtbetrag ist höher.
      </p>

      <h2>Checkliste für die Rezeption bis Jahresende</h2>
      <ol>
        <li>Offene Heil- und Kostenpläne für Zahnersatz in der Praxissoftware heraussuchen, die noch nicht bewilligt sind.</li>
        <li>Patienten anrufen, deren Plan schon besprochen ist, und auf das Datum hinweisen. Den Mehrbetrag in Euro nennen.</li>
        <li>Neue Pläne zügig einreichen. Die Kasse braucht für die Bewilligung oft ein bis drei Wochen, zwischen den Feiertagen auch länger.</li>
        <li>Bei Gutachterverfahren genug Vorlauf einplanen oder den Patienten ehrlich sagen, dass es knapp wird.</li>
        <li>Nach der Bewilligung gilt der Plan in der Regel sechs Monate. Den Behandlungstermin innerhalb dieser Frist legen.</li>
      </ol>

      <h2>So erklären Sie es Patienten</h2>
      <blockquote className="border-l-4 border-brand-300 pl-4 italic text-slate-600">
        „Ab Januar zahlt Ihre Krankenkasse für Zahnersatz weniger dazu. Wenn wir den Plan noch in diesem Jahr einreichen und die Kasse
        ihn bewilligt, sparen Sie bei dieser Brücke etwa 175 Euro. Behandeln können wir trotzdem in Ruhe im neuen Jahr.“
      </blockquote>
      <p>
        Wichtig ist, keinen Druck aufzubauen. Die Information gehört zur wirtschaftlichen Aufklärung, die Entscheidung trifft der
        Patient.
      </p>

      <h2>Quellen</h2>
      <ul className="text-sm">
        <li>
          <a href="https://www.zm-online.de/news/detail/krankenkassenreform-verteuert-zahnersatz" rel="noopener">
            zm-online: Festzuschüsse sinken – Krankenkassenreform verteuert Zahnersatz
          </a>{" "}
          (Sätze 2026 und 2027, Härtefallregelung unverändert)
        </li>
        <li>
          <a href="https://improdent-gt.de/blog/zahnersatz-festzuschuss-2027/" rel="noopener">
            improdent: Zahnersatz 2027 – Festzuschuss sinkt
          </a>{" "}
          (vor dem 1.1.2027 bewilligte Festzuschüsse behalten die bisherigen Sätze)
        </li>
        <li>Verbindlich: § 55 SGB V in der ab 1.1.2027 geltenden Fassung und die Festzuschuss-Beträge des G-BA bzw. Ihrer KZV.</li>
      </ul>
    </ArticlePage>
  );
}
