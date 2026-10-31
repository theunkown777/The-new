import type { Metadata } from "next";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("haertefall-zahnersatz");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

export default function Page() {
  return (
    <ArticlePage slug="haertefall-zahnersatz">
      <h2>Was die Härtefallregelung bedeutet</h2>
      <p>
        Versicherte mit geringem Einkommen erhalten beim Zahnersatz den doppelten Festzuschuss, höchstens jedoch die tatsächlichen
        Kosten der Regelversorgung. Wer sich für die Regelversorgung entscheidet, zahlt dann in der Regel nichts selbst (§ 55 Abs. 2
        SGB V).
      </p>

      <h2>Wer als Härtefall gilt</h2>
      <ul>
        <li>Versicherte, deren monatliche Bruttoeinnahmen 40 % der monatlichen Bezugsgröße nicht übersteigen. Den aktuellen Betrag nennt die Krankenkasse; er erhöht sich für Angehörige im Haushalt.</li>
        <li>Empfänger von Bürgergeld, Sozialhilfe, Grundsicherung im Alter oder bei Erwerbsminderung.</li>
        <li>Empfänger von BAföG oder Berufsausbildungsbeihilfe.</li>
        <li>Menschen, deren Heimunterbringung ein Sozialhilfeträger oder die Kriegsopferfürsorge trägt.</li>
      </ul>

      <h2>Gleitende Härtefallregelung</h2>
      <p>
        Liegt das Einkommen etwas über der Grenze, gibt es einen Teil-Ausgleich: Die Kasse zahlt über den normalen Festzuschuss hinaus
        einen Betrag, der vom Einkommen abhängt (§ 55 Abs. 3 SGB V). Den genauen Betrag errechnet die Kasse nach Vorlage des
        Heil- und Kostenplans.
      </p>

      <h2>Was bei Alternativen gilt</h2>
      <p>
        Wählt ein Härtefall-Patient eine gleich- oder andersartige Versorgung, etwa Vollkeramik oder ein Implantat, bleibt es beim
        doppelten Festzuschuss. Die Mehrkosten trägt er selbst. Das sollte vor der Entscheidung klar sein.
      </p>

      <h2>Die Kürzung 2027 trifft Härtefälle nicht</h2>
      <p>
        Die Absenkung der Festzuschüsse ab 1. Januar 2027 lässt die Härtefallregelung unverändert. Für diese Patienten gibt es also keinen
        Grund, den Heil- und Kostenplan noch 2026 bewilligen zu lassen. In Sorrida blendet ein gesetzter Härtefall den Jahresvergleich
        deshalb aus.
      </p>

      <h2>Tipps für die Rezeption</h2>
      <ol>
        <li>Bei Anzeichen für geringes Einkommen diskret nachfragen. Viele wissen nicht, dass es die Regelung gibt.</li>
        <li>Den Härtefall beantragt der Patient bei seiner Kasse. Den Heil- und Kostenplan reicht er mit den Nachweisen ein.</li>
        <li>Die Regelversorgung als vollwertige Option vorstellen, nicht als Notlösung.</li>
      </ol>
    </ArticlePage>
  );
}
