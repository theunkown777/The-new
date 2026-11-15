import Link from "next/link";
import { JournalRahmen } from "@/components/start/JournalKopf";

export const RECHNER: { slug: string; titel: string; kurz: string; fuer: string }[] = [
  { slug: "zuzahlung-2027", titel: "Zuzahlung ab 2027", kurz: "Heilmittel, Hilfsmittel und Arzneimittel: Was Sie bis Ende 2026 zuzahlen und was ab dem 1. Januar 2027 gilt. Mit Belastungsgrenze.", fuer: "alle gesetzlich Versicherten" },
  { slug: "eigenanteil-zahnersatz", titel: "Eigenanteil bei Zahnersatz 2026 und 2027", kurz: "Krone, Teilkrone oder Brücke: Festzuschuss der Kasse und Ihr Eigenanteil, je nachdem, wann die Kasse den Plan bewilligt.", fuer: "gesetzlich Versicherte mit Heil- und Kostenplan" },
  { slug: "goae-rechnung", titel: "Rechnung nach GOÄ oder GOZ nachrechnen", kurz: "Punktzahl und Faktor eingeben: So entsteht der Betrag einer Position, und ab wann eine Begründung in der Rechnung stehen muss.", fuer: "Privatversicherte und Selbstzahler" },
];

/** Rahmen für die öffentlichen Rechner: Titel, Rechner, Quellen, klarer Hinweis, was der Rechner nicht ist. */
export function RechnerSeite({ slug, quellen, children }: { slug: string; quellen: [string, string][]; children: React.ReactNode }) {
  const r = RECHNER.find((x) => x.slug === slug)!;
  const jsonLd = { "@context": "https://schema.org", "@type": "WebApplication", name: r.titel, description: r.kurz, applicationCategory: "FinanceApplication", operatingSystem: "Web", inLanguage: "de-DE", offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" } };
  return (
    <JournalRahmen>
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Link prefetch={false} href="/rechner" className="j-link text-[15px] text-tinte-2">← Alle Rechner</Link>
        <p className="j-marke mt-10">Rechner · für {r.fuer} · Stand 15.11.2026</p>
        <h1 className="j-schau mb-6 mt-4 text-[clamp(2.2rem,5.5vw,3.4rem)]">{r.titel}</h1>
        <p className="j-text mb-10 text-lg">{r.kurz}</p>
        {children}
        <p className="mt-8 border-l-2 border-linie-stark pl-4 text-[15px] text-tinte-2" data-testid="rechner-hinweis">
          Unverbindliche Orientierung nach den gesetzlichen Regeln. Der Rechner kennt Ihren Fall nicht und ersetzt weder den Kostenplan Ihrer Praxis noch die Auskunft Ihrer Krankenkasse oder Versicherung.
          Ihre Eingaben bleiben in Ihrem Browser; es wird nichts gespeichert oder übertragen.
        </p>
        <section className="mt-12">
          <h2 className="j-marke border-b border-tinte pb-3">Quellen</h2>
          <ul className="mt-3 space-y-2 text-[15px] text-tinte-2">
            {quellen.map(([t, u]) => (
              <li key={u}><a href={u} rel="noopener noreferrer" target="_blank" className="j-link">{t}</a></li>
            ))}
          </ul>
        </section>
        <aside className="mt-14 bg-papier-2 px-6 py-8 sm:px-8">
          <h2 className="j-titel text-[1.7rem] text-tinte">Für Praxen</h2>
          <p className="j-text mt-3">Sorrida stellt diese Beträge für jeden Patienten zusammen: Kassenleistung zuerst, daneben die weiteren Leistungen der Praxis mit Eigenanteil, zum Lesen zu Hause.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link prefetch={false} href="/vorschau" className="j-knopf j-knopf-voll">So sieht es aus</Link>
            <Link prefetch={false} href="/hilfe" className="j-knopf j-knopf-linie">Pilotplatz anfragen</Link>
          </div>
        </aside>
      </main>
    </JournalRahmen>
  );
}
