import type { Metadata } from "next";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("heil-und-kostenplan-verstehen");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

export default function Page() {
  return (
    <ArticlePage slug="heil-und-kostenplan-verstehen">
      <h2>Warum der HKP Patienten überfordert</h2>
      <p>
        Der Heil- und Kostenplan ist ein Antrag an die Krankenkasse. Er enthält Befundkürzel, Festzuschuss-Befundnummern, BEMA- und
        GOZ-Positionen und eine Kostenschätzung, oft verteilt auf zwei Seiten und eine Anlage. Für die Kasse ist das vollständig. Der
        Patient sucht darin eine einzige Zahl: wie viel er selbst bezahlt. Die muss er sich oft selbst ausrechnen, aus Gesamtkosten
        minus Festzuschuss.
      </p>
      <p>
        Die Folge kennt jede Rezeption: „Ich überlege es mir.“ Ein Teil dieser Patienten meldet sich nicht mehr. Selten steckt echte
        Ablehnung dahinter, meistens fehlen verständliche Zahlen für die Entscheidung.
      </p>

      <h2>Die drei Zahlen, die zählen</h2>
      <table>
        <thead>
          <tr>
            <th>Zahl</th>
            <th>Wo sie im HKP steht</th>
            <th>Was Sie dem Patienten sagen</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Gesamtkosten</td>
            <td>Teil 2, Kostenschätzung (Honorar, Material, Labor)</td>
            <td>„So viel kostet die Versorgung insgesamt.“</td>
          </tr>
          <tr>
            <td>Festzuschuss</td>
            <td>Teil 1, Summe der Festzuschüsse, wird von der Kasse eingetragen</td>
            <td>„Diesen Betrag übernimmt Ihre Kasse fest.“</td>
          </tr>
          <tr>
            <td>Eigenanteil</td>
            <td>Differenz der beiden, ggf. abzüglich Zusatzversicherung</td>
            <td>„Das bleibt für Sie.“</td>
          </tr>
        </tbody>
      </table>

      <h2>Alternativen nebeneinander zeigen</h2>
      <p>
        Patienten entscheiden leichter, wenn sie Möglichkeiten vergleichen können. Bewährt hat sich eine kurze Liste: oben die
        Regelversorgung, darunter die medizinisch sinnvollen Alternativen, jeweils mit einem Satz zum Nutzen und dem Eigenanteil.
      </p>
      <ul>
        <li>Brücke, Regelversorgung: Nachbarzähne werden beschliffen. Eigenanteil ca. 1.059 €.</li>
        <li>Vollkeramik-Brücke: zahnfarben, gleicher Festzuschuss. Eigenanteil ca. 1.759 €.</li>
        <li>Implantat mit Krone: Nachbarzähne bleiben unberührt. Eigenanteil ca. 2.709 €.</li>
      </ul>
      <p>
        Beispielwerte mit Bonusheft 10 Jahre und den Festzuschüssen 2026 (Befund 2.1: 691,20 €) bei Praxispreisen von 1.750 €, 2.450 € und 3.400 €. Die Kassenleistung steht immer zuerst, damit niemand glaubt, er müsse die teure Variante
        nehmen.
      </p>

      <h2>Schriftlich mitgeben</h2>
      <p>
        Nach § 630c Abs. 3 BGB müssen Patienten vor der Behandlung in Textform über voraussichtliche Kosten informiert werden, wenn die
        Kasse nicht alles übernimmt. Ein verständliches Schreiben oder ein Link, den der Patient zu Hause in Ruhe ansehen kann, erfüllt
        diesen Zweck und erspart Rückfragen.
      </p>

      <h2>Typische Fragen am Empfang</h2>
      <ul>
        <li>
          <b>„Ist das schon genehmigt?“</b> Erst wenn die Kasse den Plan bewilligt und zurückgeschickt hat. Vorher ist der
          Festzuschuss eine Schätzung.
        </li>
        <li>
          <b>„Zahlt meine Zusatzversicherung?“</b> Oft einen Teil des Eigenanteils. Den HKP vor Behandlungsbeginn dort einreichen.
        </li>
        <li>
          <b>„Kann ich in Raten zahlen?“</b> Viele Praxen bieten das über einen Abrechnungsdienstleister an. Am besten gleich im
          Gespräch erwähnen.
        </li>
      </ul>
    </ArticlePage>
  );
}
