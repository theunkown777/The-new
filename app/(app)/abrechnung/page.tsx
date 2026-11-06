import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { artenFuer } from "@/lib/abrechnungsarten";
import { SPECIALTY_LABELS } from "@/lib/specialties";
import { Gebuehrenrechner } from "@/components/Gebuehrenrechner";
import type { Gebuehrenwerk } from "@/lib/gebuehren";
import { canSeeAnalytics } from "@/lib/permissions";
import { loadBillingCheck } from "@/lib/billingCheckLoad";
import { formatCent, invoiceView } from "@/lib/invoices";

export const dynamic = "force-dynamic";
export const metadata = { title: "Abrechnung" };

export default async function AbrechnungPage() {
  const session = await getServerSession(authOptions);
  const practice = await prisma.practice.findUnique({ where: { id: session!.user.practiceId }, select: { specialty: true, gozPunktwertCent: true, bemaPunktwertCent: true } });
  const fach = practice?.specialty ?? "hausarzt";
  const practiceId = session!.user.practiceId;
  const darf = await canSeeAnalytics(session!.user.id);
  const potenzial = darf
    ? await (async () => {
        const [pruefung, offen, vorschlaege] = await Promise.all([
          loadBillingCheck(practiceId),
          prisma.invoice.findMany({ where: { practiceId, status: { in: ["OFFEN", "GEMELDET"] } }, select: { status: true, dueDate: true, amountCent: true } }),
          prisma.treatmentProposal.aggregate({ where: { practiceId, status: { in: ["ENTWURF", "BESPROCHEN"] }, createdAt: { gte: new Date(Date.now() - 180 * 864e5) } }, _sum: { eigenanteilCent: true }, _count: true }),
        ]);
        const ueber = offen.filter((i) => invoiceView(i).key === "ueberfaellig");
        return [
          { label: "Nicht in Rechnung gestellt", cent: pruefung.reduce((a, b) => a + (b.betragCent ?? 0), 0), text: "angenommene Vorschläge ohne Rechnung", href: "/abrechnungspruefung" },
          { label: "Überfällig", cent: ueber.reduce((a, i) => a + i.amountCent, 0), text: `${ueber.length} ${ueber.length === 1 ? "Rechnung" : "Rechnungen"}, Erinnerung fällig`, href: "/zahlungen?f=ueberfaellig" },
          { label: "Noch nicht entschieden", cent: vorschlaege._sum.eigenanteilCent ?? 0, text: `${vorschlaege._count} offene Vorschläge (6 Monate)`, href: "/proposals" },
          { label: "Termine ohne Dokumentation", anzahl: pruefung.filter((b) => b.art === "ohne_doku").length, text: "Leistungen evtl. nicht erfasst", href: "/abrechnungspruefung" },
        ];
      })()
    : null;
  const arten = artenFuer(fach);
  const werke = [...new Set(arten.map((a) => a.werk).filter((w): w is Gebuehrenwerk => !!w))];
  // Rechner nur mit den Gebührenwerken, die das Fach wirklich nutzt (Zahn: BEMA/GOZ, Arzt: EBM/GOÄ, ggf. UV-GOÄ);
  // Apotheke, Pflege, Heilmittel & Co. rechnen nicht nach Gebührenordnung und sehen keinen Rechner.
  const alleWerke: Gebuehrenwerk[] = werke.includes("BEMA") || werke.includes("GOZ") ? [...new Set<Gebuehrenwerk>([...werke, "GOZ", "BEMA"])] : werke;

  return (
    <div className="mx-auto max-w-5xl space-y-6" data-testid="abrechnung">
      <div>
        <h1 className="font-display text-3xl text-slate-900">Abrechnung</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Alle Abrechnungsarten für {SPECIALTY_LABELS[fach] ?? "Ihr Fach"}: wer zahlt, wie gerechnet wird, die Fachbegriffe und wo Praxen erfahrungsgemäß Geld liegen lassen.
          Abgerechnet wird weiter über Ihre Praxissoftware bzw. KV/KZV; Sorrida hilft, nichts zu vergessen.
        </p>
      </div>

      {potenzial && (
        <section className="card" data-testid="potenzial">
          <h2 className="font-semibold text-slate-900">Geld, das gerade liegen bleibt</h2>
          <p className="mt-1 text-sm text-slate-600">Aus Ihren Daten in Sorrida, heute. Jeder Wert führt zur Liste, in der Sie es beheben.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {potenzial.map((p) => (
              <Link key={p.label} href={p.href} className="rounded-xl bg-[#FBFAF8] p-4 hover:bg-slate-100">
                <p className="text-xs text-slate-500">{p.label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{"cent" in p ? formatCent(p.cent!) : p.anzahl}</p>
                <p className="mt-1 text-xs text-slate-600">{p.text}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {alleWerke.length > 0 && <Gebuehrenrechner werke={alleWerke} punktwerte={{ ...(practice?.bemaPunktwertCent ? { BEMA: practice.bemaPunktwertCent } : {}) }} />}

      <div className="space-y-4">
        {arten.map((a) => (
          <details key={a.id} className="card group" open={a === arten[0]} data-testid="abrechnungsart">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
              <span>
                <span className="block font-semibold text-slate-900">{a.name}</span>
                <span className="block text-sm text-slate-600">{a.zahler}</span>
              </span>
              <span className="text-slate-400 transition group-open:rotate-90" aria-hidden="true">›</span>
            </summary>
            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <div className="space-y-3 text-sm">
                <p><b className="text-slate-800">Rechenweg:</b> <span className="text-slate-600">{a.rechenweg}</span></p>
                <div>
                  <p className="font-semibold text-slate-800">Regeln und Fristen</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">{a.regeln.map((r) => <li key={r}>{r}</li>)}</ul>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Fachbegriffe</p>
                  <dl className="mt-1 space-y-1">{a.begriffe.map(([b, e]) => <div key={b}><dt className="inline font-medium text-slate-800">{b}: </dt><dd className="inline text-slate-600">{e}</dd></div>)}</dl>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Wo Geld liegen bleibt</p>
                <ul className="mt-2 space-y-2">
                  {a.geldhebel.map((g) => (
                    <li key={g.problem} className="rounded-xl bg-[#FBFAF8] p-3 text-sm">
                      <p className="text-slate-800">{g.problem}</p>
                      <p className="mt-1 text-slate-600"><b>Was hilft:</b> {g.massnahme}</p>
                      {g.inSorrida && <p className="mt-1 text-xs text-brand-700">In Sorrida: {g.inSorrida}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Nachschlagewerk ohne Gewähr; verbindlich sind die jeweiligen Gebührenordnungen, Verträge und Richtlinien. Fragen zur Abrechnung beantwortet Ihre KV/KZV.
        Weiter zur <Link href="/abrechnungspruefung" className="underline">Abrechnungsprüfung</Link>.
      </p>
    </div>
  );
}
