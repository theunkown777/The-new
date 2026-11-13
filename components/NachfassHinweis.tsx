import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuro, resolvePrices, showsJahresvergleich } from "@/lib/proposals";
import { nachfassListe, nachfassSumme } from "@/lib/nachfassen";

/** Hinweis auf der Übersicht: offene Vorschläge, vor dem 1.1.2027 mit dem Betrag, um den es beim Zahnersatz geht. */
export async function NachfassHinweis({ practiceId }: { practiceId: string }) {
  const now = new Date();
  const [practice, proposals] = await Promise.all([
    prisma.practice.findUnique({ where: { id: practiceId }, select: { proposalPrices: true } }),
    prisma.treatmentProposal.findMany({
      where: { practiceId, status: { in: ["ENTWURF", "BESPROCHEN"] }, createdAt: { gte: new Date(now.getTime() - 180 * 864e5) } },
      take: 300,
      select: {
        id: true, status: true, input: true, choices: true, createdAt: true, shareCreatedAt: true, shareExpiresAt: true, patientViewedAt: true,
        patientResponse: true, patientRespondedAt: true, agreedAt: true, nachgefasstAt: true, hkpEingereichtAt: true,
        patient: { select: { id: true, firstName: true, lastName: true, phone: true, whatsappConsentAt: true } },
      },
    }),
  ]);
  const summe = nachfassSumme(nachfassListe(proposals, resolvePrices(practice?.proposalPrices), now), now);
  if (!summe.offen) return null;
  const stichtag = showsJahresvergleich(now) && summe.stichtagOffen > 0;
  return (
    <Link
      href="/proposals/nachfassen"
      className={`mb-6 flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm ${stichtag ? "border-amber-300 bg-amber-50 text-amber-950 hover:border-amber-500" : "border-slate-200 bg-white text-slate-800 hover:border-slate-400"}`}
      data-testid="nachfass-hinweis"
    >
      <span>
        {stichtag ? (
          <>
            <b>
              {summe.stichtagOffen} {summe.stichtagOffen === 1 ? "Zahnersatz-Vorschlag" : "Zahnersatz-Vorschläge"} vor dem 1.1.2027 offen
            </b>
            : ohne Bewilligung bis 31.12. voraussichtlich {formatEuro(summe.stichtagMehr)} mehr Eigenanteil für Ihre Patienten (noch {summe.tage} Tage)
          </>
        ) : (
          <>
            <b>
              {summe.offen} {summe.offen === 1 ? "Vorschlag wartet" : "Vorschläge warten"} auf eine Entscheidung
            </b>
          </>
        )}
      </span>
      <span aria-hidden="true">Nachfassen →</span>
    </Link>
  );
}
