import type { Metadata } from "next";
import Link from "next/link";
import { JournalRahmen } from "@/components/start/JournalKopf";
import { RECHNER } from "@/components/rechner/RechnerSeite";

export const metadata: Metadata = {
  title: "Rechner: Zuzahlung, Zahnersatz, GOÄ – Sorrida",
  description: "Drei kostenlose Rechner ohne Anmeldung: gesetzliche Zuzahlung ab 2027, Eigenanteil bei Zahnersatz 2026 und 2027, Rechnung nach GOÄ oder GOZ nachrechnen.",
  alternates: { canonical: "/rechner" },
};

export default function RechnerUebersicht() {
  return (
    <JournalRahmen>
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="j-marke">Rechner · ohne Anmeldung · nichts wird gespeichert</p>
        <h1 className="j-schau mb-6 mt-4 text-[clamp(2.4rem,6vw,3.8rem)]">Was kostet mich das <em>selbst</em>?</h1>
        <p className="j-text mb-10 text-lg">Drei Rechner nach den gesetzlichen Regeln. Sie zeigen, wie ein Betrag entsteht, und ersetzen nicht den Kostenplan Ihrer Praxis.</p>
        <ul data-testid="rechner-liste">
          {RECHNER.map((r) => (
            <li key={r.slug} className="border-t border-linie last:border-b">
              <Link prefetch={false} href={`/rechner/${r.slug}`} className="group block py-6">
                <span className="j-marke">für {r.fuer}</span>
                <span className="mt-1 block font-display text-[1.9rem] text-tinte group-hover:text-brand-700">{r.titel}</span>
                <span className="j-text mt-1 block">{r.kurz}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </JournalRahmen>
  );
}
