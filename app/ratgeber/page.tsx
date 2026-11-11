import type { Metadata } from "next";
import Link from "next/link";
import { RATGEBER } from "@/lib/ratgeber";
import { JournalRahmen } from "@/components/start/JournalKopf";

export const metadata: Metadata = {
  title: "Ratgeber für Praxisteams – Sorrida",
  description: "Festzuschuss 2027, Heil- und Kostenplan, Mehrkostenvereinbarung: kurz erklärt für Praxisteams.",
};

export default function RatgeberIndex() {
  return (
    <JournalRahmen>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
        <h1 className="j-schau text-[clamp(2.8rem,7vw,4.6rem)]">
          Ratgeber <em>für Praxisteams</em>
        </h1>
        <p className="j-text mt-5 max-w-xl text-lg">
          Kurze, sachliche Erklärungen zu Themen, über die Patienten am Empfang am häufigsten stolpern.
        </p>
        <ol className="mt-12 border-t border-tinte">
          {RATGEBER.map((a, i) => (
            <li key={a.slug} className="border-b border-linie">
              <Link prefetch={false} href={`/ratgeber/${a.slug}`} className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-4 py-6">
                <span className="j-ziffer text-2xl">{i + 1}</span>
                <span>
                  <span className="j-titel block text-[1.7rem] text-tinte group-hover:text-brand-700">{a.title}</span>
                  <span className="mt-1 block text-[15px] text-tinte-2">{a.description}</span>
                </span>
                <span className="j-pfeil text-tinte-2 group-hover:text-brand-700" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ol>
      </main>
    </JournalRahmen>
  );
}
