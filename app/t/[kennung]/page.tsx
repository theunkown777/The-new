import type { Metadata } from "next";
import { NeupatientTermin } from "@/components/NeupatientTermin";
import { stempel } from "@/lib/terminanfrage";
import { oeffentlicheLage, praxisZurKennung } from "@/lib/terminanfrageLoad";
import { PraxisFuss } from "@/components/PraxisFuss";
import { leseStammdaten } from "@/lib/praxisStammdaten";

export const dynamic = "force-dynamic";
// Nicht in Suchmaschinen: Die Seite gehört auf die Website der Praxis, nicht in Trefferlisten.
export const metadata: Metadata = { title: "Termin online anfragen", robots: { index: false, follow: false }, referrer: "no-referrer" };

// Öffentliche Terminbuchung für neue Patienten. Darf als Rahmen (iframe) auf der Website der Praxis
// laufen (next.config.js). Die Kennung im Pfad ist zufällig; ohne sie ist keine Praxis auffindbar.
export default async function NeupatientSeite(props: { params: Promise<{ kennung: string }> }) {
  const params = await props.params;
  const praxis = await praxisZurKennung(params.kennung);
  const l = praxis ? await oeffentlicheLage(praxis.id) : null;
  if (!praxis || !l) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center text-sm text-slate-600" data-testid="neutermin-aus">
        <h1 className="text-base font-semibold text-slate-900">Online-Termine sind hier nicht verfügbar</h1>
        <p className="mt-2">Diese Buchungsseite gibt es nicht oder sie ist ausgeschaltet. Bitte rufen Sie in der Praxis an.</p>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-[#F5F2EE]">
      <div className="mx-auto max-w-xl px-4 pb-12 pt-6 sm:pt-10">
        <p className="text-sm font-medium text-brand-700">{praxis.name}</p>
        <h1 className="mt-1 font-display text-2xl text-slate-900 sm:text-3xl">Termin online anfragen</h1>
        <p className="mt-1 text-sm text-slate-600">Für neue Patientinnen und Patienten. Wählen Sie eine freie Zeit; die Praxis bestätigt Ihre Anfrage.</p>
        {praxis.isDemo && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="neutermin-beispiel">
            <b>Beispiel:</b> Dies ist eine Beispiel-Praxis zum Ausprobieren. Ihre Anfrage wird als Beispiel gespeichert und mit der Beispiel-Praxis gelöscht. Bitte keine echten Daten eintragen.
          </p>
        )}
        <div className="mt-5">
          <NeupatientTermin kennung={params.kennung} praxis={praxis.name} aktiv={l.aktiv} minuten={l.minuten} tage={l.aktiv ? l.tage : []} anlaesse={praxis.anlaesse} stempel={stempel(params.kennung)} beispiel={praxis.isDemo} datenschutzUrl={leseStammdaten(praxis.stammdaten).datenschutzUrl || null} />
        </div>
        {/* Wer die Praxis ist (Anschrift, Kontakt, Impressum, Datenschutzhinweise) und wer die Seite technisch bereitstellt. */}
        <PraxisFuss name={praxis.name} stammdaten={praxis.stammdaten} className="mt-8 border-t border-slate-200 pt-4" />
      </div>
    </main>
  );
}
