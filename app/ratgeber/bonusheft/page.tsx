import type { Metadata } from "next";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("bonusheft");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

export default function Page() {
  return (
    <ArticlePage slug="bonusheft">
      <h2>Was das Bonusheft wert ist</h2>
      <p>
        Wer regelmäßig zur Kontrolle geht und das nachweisen kann, bekommt beim Zahnersatz einen höheren Festzuschuss. Der Bonus
        beträgt nach fünf Jahren zehn Prozentpunkte und nach zehn Jahren fünfzehn Prozentpunkte zusätzlich.
      </p>
      <table>
        <thead>
          <tr>
            <th>Nachweis</th>
            <th>bewilligt bis 31.12.2026</th>
            <th>bewilligt ab 1.1.2027</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>kein Bonus</td><td>60 %</td><td>50 %</td></tr>
          <tr><td>5 Jahre lückenlos</td><td>70 %</td><td>60 %</td></tr>
          <tr><td>10 Jahre lückenlos</td><td>75 %</td><td>65 %</td></tr>
        </tbody>
      </table>
      <p>
        Bei einer Regelversorgung von 1.750 € macht der Unterschied zwischen keinem Bonus und zehn Jahren 262 € aus. Ab 2027 ist das
        Bonusheft also wichtiger als vorher, weil der Grundzuschuss sinkt.
      </p>

      <h2>Welche Termine zählen</h2>
      <ul>
        <li>Erwachsene: eine zahnärztliche Untersuchung in jedem Kalenderjahr.</li>
        <li>Kinder und Jugendliche bis 18: Untersuchung in jedem Kalenderhalbjahr.</li>
        <li>Für die zehn Jahre ist eine einmalige Lücke unschädlich. Diese Ausnahme gilt nur für den Zehn-Jahres-Bonus und nur einmal.</li>
      </ul>

      <h2>Typische Probleme am Empfang</h2>
      <ol>
        <li>Das Heft ist verloren. Viele Praxen können die Termine aus ihrer Kartei bescheinigen. Fragen Sie auch frühere Praxen.</li>
        <li>Der Stempel fehlt, obwohl der Patient da war. Der Eintrag kann nachgetragen werden, wenn die Untersuchung dokumentiert ist.</li>
        <li>Der Patient weiß nicht, dass es um Geld geht. Ein Satz mit dem Eurobetrag wirkt besser als jeder Hinweis auf Vorsorge.</li>
      </ol>

      <h2>So erinnern Sie daran</h2>
      <blockquote className="border-l-4 border-brand-300 pl-4 italic text-slate-600">
        „Bringen Sie bitte Ihr Bonusheft mit. Mit zehn Jahren Nachweis zahlt Ihre Kasse bei dieser Brücke rund 260 Euro mehr dazu.“
      </blockquote>
      <p>
        In Sorrida stellen Sie das Bonusheft beim Vorschlag ein. Der Eigenanteil im Patientenschreiben und im Patienten-Link rechnet dann
        mit dem richtigen Satz.
      </p>
    </ArticlePage>
  );
}
