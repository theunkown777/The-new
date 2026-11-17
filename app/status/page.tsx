import type { Metadata } from "next";
import Link from "next/link";
import { JournalRahmen } from "@/components/start/JournalKopf";
import { kernStatus } from "@/lib/betriebsStatus";
import { prisma } from "@/lib/prisma";
import { datumDe, dauerText, keineStoerungSatz, stoerungenSortiert } from "@/lib/stoerungen";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Status – Sorrida",
  description: "Sind Website, Anmeldung und Datenbank von Sorrida erreichbar? Dazu die Liste der Störungen.",
};

// Öffentliche Seite: drei Ja/Nein-Angaben ohne Einzelheiten (lib/betriebsStatus.ts) und die von Hand gepflegte Liste der
// Störungen (lib/stoerungen.ts). Die Seite prüft nicht, unter welchem Hostnamen sie geöffnet ist; das macht nur /api/status.
export default async function StatusPage() {
  const status = await kernStatus(() => prisma.$queryRaw`SELECT 1`);
  const punkte: [string, string, boolean][] = [
    ["website", "Website", status.website],
    ["anmeldung", "Anmeldung", status.anmeldung],
    ["datenbank", "Datenbank", status.datenbank],
  ];
  const alles = punkte.every(([, , ok]) => ok);
  const stoerungen = stoerungenSortiert();
  const jetzt = new Date().toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

  return (
    <JournalRahmen>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20" data-testid="status-seite">
        <h1 className="j-schau text-[clamp(2.8rem,7vw,4.6rem)]">
          Status <em>und Störungen</em>
        </h1>
        <p className="j-text mt-5 max-w-xl text-lg" data-testid="status-gesamt" role="status">
          {alles ? "Website, Anmeldung und Datenbank sind erreichbar." : "Im Moment ist nicht alles erreichbar. Wir arbeiten daran."}
        </p>
        <p className="mt-2 text-sm text-tinte-2">Geprüft beim Öffnen dieser Seite: {jetzt} Uhr</p>

        <section className="mt-12" aria-labelledby="status-jetzt">
          <h2 id="status-jetzt" className="j-titel text-[2rem] text-tinte">Jetzt</h2>
          <ul className="mt-6 border-t border-tinte">
            {punkte.map(([id, name, ok]) => (
              <li key={id} className="flex items-baseline justify-between gap-4 border-b border-linie py-4" data-testid={`status-${id}`} data-ok={ok ? "ja" : "nein"}>
                <span className="text-[17px] text-tinte">{name}</span>
                <span className={`text-[15px] font-semibold ${ok ? "text-emerald-800" : "text-red-800"}`}>
                  <span aria-hidden="true">{ok ? "● " : "○ "}</span>
                  erreichbar: {ok ? "ja" : "nein"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14" aria-labelledby="status-stoerungen" data-testid="status-stoerungen">
          <h2 id="status-stoerungen" className="j-titel text-[2rem] text-tinte">Störungen</h2>
          {stoerungen.length === 0 ? (
            <p className="mt-6 border-y border-linie py-5 text-[15px] text-tinte-2" data-testid="status-keine-stoerung">{keineStoerungSatz()}</p>
          ) : (
            <ol className="mt-6 border-t border-tinte">
              {stoerungen.map((s) => (
                <li key={`${s.datum}-${s.beginn ?? ""}-${s.was}`} className="border-b border-linie py-5 text-[15px] leading-relaxed" data-testid="status-stoerung">
                  <p className="font-semibold text-tinte">
                    {datumDe(s.datum)}{s.beginn ? `, ${s.beginn} Uhr` : ""} · Dauer: {dauerText(s.dauerMinuten)}
                    {!s.behoben && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">noch nicht behoben</span>}
                  </p>
                  <p className="mt-1 text-tinte-2">{s.was}</p>
                  {s.ursache && <p className="text-tinte-2">Ursache: {s.ursache}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>

        <p className="mt-12 text-[15px] leading-relaxed text-tinte-2">
          Die Liste wird von Hand geführt. Wie Sorrida mit Daten umgeht, steht unter{" "}
          <Link href="/vertrauen" className="j-link text-brand-700">So geht Sorrida mit Daten um</Link>.
        </p>
      </main>
    </JournalRahmen>
  );
}
