import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isDental } from "@/lib/specialties";

// Erste Schritte für eine neue Praxis: steht oben auf der Übersicht, bis alles erledigt ist.
// Nur für die Praxisleitung (Rolle admin), nie in Demo- und Gastpraxen.
export async function Einrichtung({ practiceId, isAdmin }: { practiceId: string; isAdmin: boolean }) {
  if (!isAdmin) return null;
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: { isDemo: true, specialty: true, iban: true, proposalPrices: true, medPrices: true, customOffers: true, ausgangswert: true },
  });
  if (!practice || practice.isDemo) return null;
  const dental = isDental(practice.specialty);
  const [nutzer, einladungen, connector, patienten, berichte, vorschlaege] = await Promise.all([
    prisma.user.count({ where: { practiceId } }),
    prisma.staffInvite.count({ where: { practiceId } }),
    prisma.connectorKey.count({ where: { practiceId, revokedAt: null } }),
    prisma.patient.count({ where: { practiceId } }),
    prisma.report.count({ where: { practiceId } }),
    prisma.treatmentProposal.count({ where: { practiceId } }),
  ]);
  const schritte = [
    {
      id: "preise",
      text: dental ? "Eigene Preise für Behandlungsvorschläge eintragen" : "Eigene Preise und Leistungen eintragen",
      hilfe: "Sonst rechnen Vorschläge mit Beispielwerten.",
      href: dental ? "/settings/proposals" : "/settings/fachgebiet",
      fertig: dental ? practice.proposalPrices != null : practice.medPrices != null || practice.customOffers != null,
    },
    { id: "bank", text: "Bankverbindung hinterlegen", hilfe: "Für den GiroCode: Patienten zahlen direkt auf Ihr Konto.", href: "/zahlungen#konto", fertig: !!practice.iban },
    { id: "team", text: "Team einladen", hilfe: "Empfang und Behandelnde mit eigenem Zugang.", href: "/settings/team", fertig: nutzer > 1 || einladungen > 0 },
    { id: "pvs", text: "Praxissoftware anbinden (optional)", hilfe: "Sorrida öffnet sich dann mit dem gewählten Patienten.", href: "/settings/connector", fertig: connector > 0 },
    { id: "ausgang", text: "Ausgangswerte schätzen (3 Zahlen)", hilfe: "Damit Sie später sehen, was Sorrida verändert hat.", href: "/analyse/wirkung", fertig: practice.ausgangswert != null },
    { id: "patient", text: "Ersten Patienten anlegen", hilfe: "Oder über die Praxissoftware übernehmen.", href: "/patients/new", fertig: patienten > 0 },
    { id: "abschluss", text: "Erste Behandlung abschließen", hilfe: "Ein Klick: Bericht, Vorschlag, Patienten-Link und To-dos.", href: "/abschluss/new", fertig: berichte + vorschlaege > 0 },
  ];
  const offen = schritte.filter((s) => !s.fertig).length;
  if (offen === 0) return null;
  return (
    <section className="card mb-6" data-testid="einrichtung">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Ihre Praxis einrichten</h2>
        <span className="text-sm text-slate-500">
          {schritte.length - offen} von {schritte.length} erledigt
        </span>
      </div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2">
        {schritte.map((s) => (
          <li key={s.id}>
            <Link
              href={s.href}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${s.fertig ? "border-emerald-200 bg-emerald-50/60 text-slate-500" : "border-slate-200 hover:border-brand-400"}`}
              data-testid={`einrichtung-${s.id}`}
              data-fertig={s.fertig ? "ja" : "nein"}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${s.fertig ? "bg-emerald-600 text-white" : "border border-slate-300 text-transparent"}`}
              >
                ✓
              </span>
              <span>
                <span className={`block font-medium ${s.fertig ? "line-through decoration-slate-300" : "text-slate-900"}`}>{s.text}</span>
                {!s.fertig && <span className="block text-xs text-slate-500">{s.hilfe}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
