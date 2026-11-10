import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fachprofil } from "@/lib/fachprofile";
import { praxisFach } from "@/lib/katalogScope";
import { formatCent } from "@/lib/invoices";
import { PROPOSAL_STATUS_LABELS, ageFromBirthDate } from "@/lib/proposals";
import { meineKennzahlen, meinePatientenWhere, meineRechnungenWhere } from "@/lib/meinBereich";
import { tagesGrenzen, heuteTag, uhrzeit, STATUS_LABEL, type TerminStatus } from "@/lib/termine";
import { cookies } from "next/headers";
import { BEREICH_COOKIE, bereichTokenGueltig } from "@/lib/bereichSchutz";
import { BereichAktionen, BereichSchloss } from "@/components/BereichSchloss";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mein Bereich" };

const eur = (c: number) => `${Math.round(c / 100).toLocaleString("de-DE")} €`;

export default async function MeinBereichPage({ searchParams }: { searchParams: { q?: string } }) {
  const session = await getServerSession(authOptions);
  const { practiceId, id: userId } = session!.user;
  // Eigenes Bereichs-Passwort: ohne gültige Freigabe werden keine Zahlen geladen.
  const schutz = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, bereichPinHash: true, practice: { select: { isDemo: true } } } });
  if (!schutz?.bereichPinHash || !bereichTokenGueltig(cookies().get(BEREICH_COOKIE)?.value, userId)) {
    return <BereichSchloss start={schutz?.bereichPinHash ? "entsperren" : "setzen"} demo={!!schutz?.practice.isDemo} name={schutz?.name ?? ""} />;
  }
  const P = fachprofil(await praxisFach(practiceId)).person;
  const q = (searchParams.q ?? "").trim().slice(0, 60);
  const words = q.replace(",", " ").split(/\s+/).filter(Boolean);
  const meine = meinePatientenWhere(practiceId, userId);
  const { von, bis } = tagesGrenzen(heuteTag());
  const jahrStart = new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1);

  const [me, anzahl, zugeordnet, patienten, rechnungen, vorschlaege, termine] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.patient.count({ where: meine }),
    prisma.patient.count({ where: { practiceId, behandlerId: userId } }),
    prisma.patient.findMany({
      where: {
        AND: [
          meine,
          ...words.map((w) => ({ OR: [{ firstName: { contains: w, mode: "insensitive" as const } }, { lastName: { contains: w, mode: "insensitive" as const } }] })),
        ],
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 15,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        insuranceType: true,
        proposals: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
        appointments: { where: { start: { gte: new Date() }, status: { not: "ABGESAGT" } }, orderBy: { start: "asc" }, take: 1, select: { start: true } },
      },
    }),
    prisma.invoice.findMany({
      where: { AND: [meineRechnungenWhere(practiceId, userId), { OR: [{ status: { not: "BEZAHLT" } }, { paidAt: { gte: jahrStart } }] }] },
      select: { status: true, dueDate: true, amountCent: true, paidAt: true },
    }),
    prisma.treatmentProposal.findMany({
      where: { practiceId, authorId: userId, createdAt: { gte: new Date(Date.now() - 90 * 864e5) } },
      select: { status: true, eigenanteilCent: true, createdAt: true },
    }),
    prisma.appointment.findMany({
      where: { practiceId, start: { gte: von, lt: bis }, patient: meine },
      orderBy: { start: "asc" },
      select: { id: true, start: true, reason: true, status: true, patient: { select: { id: true, firstName: true, lastName: true } } },
    }),
  ]);
  const k = meineKennzahlen(rechnungen, vorschlaege);
  const maxMonat = Math.max(1, ...k.monate.map((m) => m.cent));

  const kacheln = [
    { label: `Meine ${P.pl}`, wert: anzahl.toLocaleString("de-DE"), sub: `${zugeordnet} fest zugeordnet` },
    { label: "Bezahlt diesen Monat", wert: eur(k.bezahltMonatCent), sub: `seit Januar ${eur(k.bezahltJahrCent)}` },
    { label: "Noch offen", wert: eur(k.offenCent), sub: k.ueberfaelligCent ? `davon überfällig ${eur(k.ueberfaelligCent)}` : "nichts überfällig" },
    {
      label: "Annahme meiner Vorschläge",
      wert: k.quote == null ? "–" : `${k.quote} %`,
      sub: `${k.vorschlaege} Vorschläge in 90 Tagen, ${k.angenommen} angenommen`,
    },
  ];

  return (
    <div className="space-y-6" data-testid="mein-bereich">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
        <h1 className="font-display text-3xl text-slate-900">Mein Bereich</h1>
        <p className="mt-1 text-sm text-slate-500">
          {me?.name}: nur Ihre {P.pl} und Ihre Zahlen. Kolleginnen und Kollegen sehen hier ihre eigenen. Geschützt mit Ihrem Bereichs-Passwort.
        </p>
        </div>
        <BereichAktionen />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kacheln.map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{c.wert}</p>
            <p className="mt-0.5 text-xs text-slate-500">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <section className="card" aria-labelledby="umsatz">
            <h2 id="umsatz" className="font-display text-xl text-slate-900">Mein Umsatz, letzte sechs Monate</h2>
            <p className="text-xs text-slate-500">Bezahlte Rechnungen zu Ihren Vorschlägen und zu Ihren Stamm-{P.pl}.</p>
            <div className="mt-4 flex h-32 items-end gap-2" data-testid="umsatz-monate">
              {k.monate.map((m) => (
                <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[11px] tabular-nums text-slate-500">{m.cent ? eur(m.cent) : ""}</span>
                  <div className="w-full rounded-t bg-brand-600/80" style={{ height: `${Math.max(2, (m.cent / maxMonat) * 88)}px` }} title={formatCent(m.cent)} />
                  <span className="text-xs text-slate-500">{m.label}</span>
                </div>
              ))}
            </div>
            {k.angenommenCent > 0 && (
              <p className="mt-3 text-sm text-slate-600">
                Angenommene Eigenanteile aus Ihren Vorschlägen (90 Tage): <b className="tabular-nums">{eur(k.angenommenCent)}</b>
              </p>
            )}
          </section>

          <section className="card" aria-labelledby="heute">
            <h2 id="heute" className="font-display text-xl text-slate-900">Heute bei mir</h2>
            {termine.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Heute keine Termine mit Ihren {P.pl}.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100">
                {termine.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="w-12 tabular-nums text-slate-500">{uhrzeit(t.start)}</span>
                    <Link href={`/patients/${t.patient.id}`} className="flex-1 text-slate-900 hover:text-brand-700">
                      {t.patient.lastName}, {t.patient.firstName}
                      <span className="block text-xs text-slate-500">{t.reason}</span>
                    </Link>
                    <span className="text-xs text-slate-500">{STATUS_LABEL[t.status as TerminStatus] ?? t.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="card p-0" aria-labelledby="stamm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 id="stamm" className="font-display text-xl text-slate-900">Mein Stamm: {P.pl}</h2>
            <form className="flex gap-2" action="/mein-bereich">
              <input name="q" defaultValue={q} placeholder="Name suchen" className="input w-44 py-1.5" aria-label="Name suchen" />
              <button className="btn-secondary py-1.5">Suchen</button>
            </form>
          </div>
          {patienten.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              {q
                ? "Niemand in Ihrem Stamm passt zu dieser Suche."
                : `Noch niemand zugeordnet. Auf der Seite eines Patienten wählen Sie unter „Behandelt von“ sich selbst aus. Wer Vorschläge oder Berichte von Ihnen hat, erscheint hier automatisch.`}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100" data-testid="stamm-liste">
              {patienten.map((p) => {
                const alter = p.birthDate ? ageFromBirthDate(p.birthDate) : null;
                return (
                  <li key={p.id}>
                    <Link href={`/patients/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                      <span>
                        <span className="font-medium text-slate-900">
                          {p.lastName}, {p.firstName}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {[alter != null ? `${alter} J.` : null, p.insuranceType === "PKV" ? "privat" : p.insuranceType === "GKV" ? "gesetzlich" : null].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="text-right text-xs text-slate-500">
                        {p.appointments[0] && <span className="block">nächster Termin {p.appointments[0].start.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" })}</span>}
                        {p.proposals[0] && <span className="block">Vorschlag: {PROPOSAL_STATUS_LABELS[p.proposals[0].status as keyof typeof PROPOSAL_STATUS_LABELS] ?? p.proposals[0].status}</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {anzahl > patienten.length && !q && (
            <p className="border-t border-slate-100 px-5 py-3 text-sm">
              <Link href="/patients?filter=meine" className="text-brand-700 underline">
                Alle {anzahl.toLocaleString("de-DE")} in der Liste öffnen
              </Link>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
