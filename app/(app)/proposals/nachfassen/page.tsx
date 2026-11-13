import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatEuro, resolvePrices, showsJahresvergleich } from "@/lib/proposals";
import { nachfassListe, nachfassSumme } from "@/lib/nachfassen";
import { darfWhatsapp } from "@/lib/whatsapp";
import { NachfassAktionen } from "@/components/NachfassAktionen";

const datum = (d: Date) => d.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit" });

// Nachfass-Liste: alle offenen Vorschläge mit dem nächsten Schritt. Vor dem 1.1.2027 stehen
// Zahnersatz-Vorschläge oben, weil eine spätere Bewilligung den Patienten mehr kostet.
export default async function NachfassenPage() {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;
  const now = new Date();
  const [practice, proposals] = await Promise.all([
    prisma.practice.findUnique({ where: { id: practiceId }, select: { name: true, proposalPrices: true } }),
    prisma.treatmentProposal.findMany({
      where: { practiceId, status: { in: ["ENTWURF", "BESPROCHEN"] }, createdAt: { gte: new Date(now.getTime() - 180 * 864e5) } },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true, status: true, input: true, choices: true, createdAt: true, shareCreatedAt: true, shareExpiresAt: true, patientViewedAt: true,
        patientResponse: true, patientRespondedAt: true, agreedAt: true, nachgefasstAt: true, hkpEingereichtAt: true,
        patient: { select: { id: true, firstName: true, lastName: true, phone: true, whatsappConsentAt: true } },
      },
    }),
  ]);
  const zeilen = nachfassListe(proposals, resolvePrices(practice?.proposalPrices), now);
  const summe = nachfassSumme(zeilen, now);
  const vorStichtag = showsJahresvergleich(now);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-slate-900">Nachfassen</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Alle offenen Vorschläge der letzten sechs Monate mit dem nächsten Schritt. Oben steht, was zuerst dran ist.
          </p>
        </div>
        <Link href="/proposals" className="text-sm text-brand-700 underline">Alle Vorschläge</Link>
      </div>

      {vorStichtag && summe.stichtagOffen > 0 && (
        <section className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" data-testid="stichtag-hinweis">
          <p className="font-semibold">
            {summe.stichtagOffen} {summe.stichtagOffen === 1 ? "Zahnersatz-Vorschlag" : "Zahnersatz-Vorschläge"} ohne eingereichten Heil- und Kostenplan
          </p>
          <p className="mt-1">
            Ab 1.1.2027 zahlen die Kassen zehn Prozentpunkte weniger Festzuschuss. Für diese Patienten sind das zusammen voraussichtlich{" "}
            <b>{formatEuro(summe.stichtagMehr)}</b> mehr Eigenanteil, wenn der Plan erst danach bewilligt wird. Bis zum 31.12.2026 sind es noch{" "}
            {summe.tage} Tage; die Kasse braucht für die Bewilligung meist ein bis drei Wochen.
          </p>
          <p className="mt-1 text-xs text-amber-900">
            Beträge für 2027 sind voraussichtlich (neue Sätze, Festzuschüsse 2026). Maßgeblich ist das Datum der Bewilligung durch die Kasse.
          </p>
        </section>
      )}

      {zeilen.length === 0 ? (
        <div className="card text-sm text-slate-600">Kein offener Vorschlag. Sobald ein Vorschlag auf eine Entscheidung wartet, steht er hier.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[46rem] text-sm" data-testid="nachfass-tabelle">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Patient</th>
                <th className="px-4 py-2">Stand</th>
                <th className="px-4 py-2 text-right">Eigenanteil</th>
                {vorStichtag && <th className="whitespace-nowrap px-4 py-2 text-right">ab 2027</th>}
                <th className="px-4 py-2">Nächster Schritt</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => {
                const wa = darfWhatsapp(z.patient);
                return (
                  <tr key={z.id} className="border-t border-slate-100 align-top" data-testid="nachfass-zeile">
                    <td className="px-4 py-3">
                      <Link href={`/proposals/${z.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                        {z.patient.lastName}, {z.patient.firstName}
                      </Link>
                      <p className="text-xs text-slate-500">Vorschlag vor {z.alterTage} {z.alterTage === 1 ? "Tag" : "Tagen"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {z.standText}
                      {z.nachgefasstAt && <p className="text-xs text-slate-500">erinnert am {datum(z.nachgefasstAt)}</p>}
                      {z.hkpEingereichtAt && <p className="text-xs text-emerald-700">HKP eingereicht am {datum(z.hkpEingereichtAt)}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-900">{formatEuro(z.eigenanteil)}</td>
                    {vorStichtag && (
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {z.stichtag ? (
                          <>
                            <span className="text-slate-900">{formatEuro(z.stichtag.eigenanteil2027)}</span>
                            <p className="text-xs font-medium text-red-700">+{formatEuro(z.stichtag.mehr)}</p>
                          </>
                        ) : (
                          <span className="text-slate-500">–</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-700">{z.tun}</td>
                    <td className="px-4 py-3">
                      <NachfassAktionen
                        id={z.id}
                        patientId={z.patient.id}
                        firstName={z.patient.firstName}
                        practiceName={practice?.name ?? ""}
                        zahnersatz={!!z.stichtag}
                        hkp={!!z.stichtag}
                        hkpEingereicht={!!z.hkpEingereichtAt}
                        whatsappNummer={wa.ok ? wa.nummer : null}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 max-w-3xl text-xs text-slate-500">
        Die Erinnerung nennt weder Befund noch Betrag, nur den persönlichen Link. Bitte nur Patienten anschreiben, die der Kontaktaufnahme zugestimmt haben. Eigenanteile sind Schätzungen; verbindlich ist der Heil- und Kostenplan.
      </p>
    </div>
  );
}
