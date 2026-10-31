import type { Metadata } from "next";
import { ArticlePage } from "@/components/ArticlePage";
import { ratgeber } from "@/lib/ratgeber";

const a = ratgeber("professionelle-zahnreinigung");
export const metadata: Metadata = { title: `${a.title} – Sorrida`, description: a.description };

export default function Page() {
  return (
    <ArticlePage slug="professionelle-zahnreinigung">
      <h2>Kasse oder privat?</h2>
      <table>
        <thead>
          <tr>
            <th>Leistung</th>
            <th>Wer zahlt</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Entfernung harter Beläge (Zahnstein)</td><td>Kasse, einmal im Kalenderjahr</td></tr>
          <tr><td>Professionelle Zahnreinigung (PZR)</td><td>Patient, abgerechnet nach GOZ; viele Kassen zahlen einen Zuschuss</td></tr>
          <tr><td>Unterstützende Parodontitistherapie nach PAR-Behandlung</td><td>Kasse, nach den Vorgaben der PAR-Richtlinie</td></tr>
        </tbody>
      </table>

      <h2>Was die PZR mehr kann</h2>
      <ul>
        <li>Entfernt auch weiche Beläge und Verfärbungen, nicht nur Zahnstein.</li>
        <li>Reinigt die Zahnzwischenräume und unter dem Zahnfleischrand.</li>
        <li>Endet mit Politur und Fluoridierung, damit sich neue Beläge schlechter festsetzen.</li>
      </ul>

      <h2>Kosten und Zuschüsse</h2>
      <p>
        Die Kosten richten sich nach Aufwand und Zahl der Zähne. Viele gesetzliche Kassen bezuschussen die PZR als Satzungsleistung, und
        die meisten Zahnzusatzversicherungen erstatten sie ganz oder teilweise. Patienten sollten die Rechnung deshalb immer einreichen.
      </p>

      <h2>In zwei Sätzen erklärt</h2>
      <blockquote className="border-l-4 border-brand-300 pl-4 italic text-slate-600">
        „Ihre Kasse übernimmt einmal im Jahr die Zahnsteinentfernung. Die professionelle Reinigung entfernt zusätzlich die weichen
        Beläge zwischen den Zähnen und kostet bei uns etwa [Betrag], oft zahlt Ihre Kasse oder Zusatzversicherung etwas dazu.“
      </blockquote>
      <p>
        Wichtig: Die Kassenleistung immer zuerst nennen. Wer nur die Zahnsteinentfernung möchte, soll das ohne schlechtes Gewissen sagen
        können. In Sorrida stehen deshalb beide Optionen nebeneinander, die Kassenleistung oben.
      </p>
    </ArticlePage>
  );
}
