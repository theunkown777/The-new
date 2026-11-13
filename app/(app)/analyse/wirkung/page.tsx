import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSeeAnalytics } from "@/lib/permissions";
import { ausgangswertSchema, letzteMonate, monatName, wirkungJeMonat, type Ausgangswert } from "@/lib/wirkung";
import { AusgangswertForm } from "@/components/AusgangswertForm";
import { DruckKnopf } from "@/components/DruckKnopf";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wirkungsbericht" };

const zahl = (n: number | null, einheit = "") => (n == null ? "–" : `${n.toLocaleString("de-DE")}${einheit}`);

// Wirkungsbericht: Entscheidungen und Zeit je Monat, daneben die Schätzung der Praxis vor dem Start.
// Bewusst ohne Umsatzzahlen; zum Ausdrucken für das monatliche Gespräch.
export default async function WirkungPage() {
  const session = await getServerSession(authOptions);
  if (!(await canSeeAnalytics(session?.user.id))) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <h1 className="font-display text-3xl text-slate-900">Wirkungsbericht nur für die Geschäftsführung</h1>
        <Link href="/dashboard" className="btn-primary mt-6 inline-block">Zur Übersicht</Link>
      </div>
    );
  }
  const practiceId = session!.user.practiceId;
  const now = new Date();
  const monate = letzteMonate(4, now);
  const seit = new Date(`${monate[0]}-01T00:00:00Z`);
  seit.setUTCDate(seit.getUTCDate() - 1);
  const [practice, vorschlaege, rechnungen] = await Promise.all([
    prisma.practice.findUnique({ where: { id: practiceId }, select: { name: true, ausgangswert: true, createdAt: true } }),
    prisma.treatmentProposal.findMany({ where: { practiceId, createdAt: { gte: seit } }, select: { status: true, createdAt: true, updatedAt: true, shareCreatedAt: true, patientViewedAt: true, patientRespondedAt: true, agreedAt: true } }),
    prisma.invoice.findMany({ where: { practiceId, createdAt: { gte: seit } }, select: { status: true, createdAt: true, paidAt: true } }),
  ]);
  const basis = ausgangswertSchema.safeParse(practice?.ausgangswert);
  const wert: Ausgangswert | null = basis.success ? { ...basis.data, erfasstAm: (practice?.ausgangswert as { erfasstAm?: string } | null)?.erfasstAm } : null;
  const reihen = wirkungJeMonat(vorschlaege, rechnungen, monate);
  const istAdmin = session!.user.role === "admin";

  const zeilen: { name: string; hilfe: string; basis: string; werte: string[] }[] = [
    { name: "Vorschläge", hilfe: "im Monat erstellt", basis: zahl(wert?.vorschlaegeMonat ?? null), werte: reihen.map((r) => zahl(r.vorschlaege)) },
    { name: "Link mitgegeben", hilfe: "Patient hat den Vorschlag aufs Handy bekommen", basis: "–", werte: reihen.map((r) => zahl(r.gesendet)) },
    { name: "Vom Patienten geöffnet", hilfe: "", basis: "–", werte: reihen.map((r) => zahl(r.geoeffnet)) },
    { name: "Rückmeldung oder Unterschrift", hilfe: "", basis: "–", werte: reihen.map((r) => zahl(r.rueckmeldung)) },
    { name: "Entschieden", hilfe: "angenommen oder abgelehnt", basis: "–", werte: reihen.map((r) => zahl(r.entschieden)) },
    { name: "Noch ohne Entscheidung", hilfe: "Anteil der Vorschläge des Monats", basis: zahl(wert?.ohneEntscheidungProzent ?? null, " %"), werte: reihen.map((r) => zahl(r.ohneEntscheidungProzent, " %")) },
    { name: "Tage bis zur Reaktion", hilfe: "vom Link bis zur ersten Antwort (Median)", basis: "–", werte: reihen.map((r) => zahl(r.tageBisReaktion)) },
    { name: "Tage bis zur Zahlung", hilfe: "von der Rechnung bis zum bestätigten Eingang (Median)", basis: zahl(wert?.tageBisZahlung ?? null), werte: reihen.map((r) => zahl(r.tageBisZahlung)) },
  ];

  return (
    <div className="space-y-6" data-testid="wirkung">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-slate-900">Wirkungsbericht</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {practice?.name} · Stand {now.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}. Gemessen in Ihrer Praxis: Entscheidungen und Zeit, keine Umsatzzahlen.
          </p>
        </div>
        <Link href="/analyse" className="text-sm text-brand-700 underline print:hidden">Zur Analyse</Link>
      </div>

      <section className="card">
        <h2 className="font-semibold text-slate-900">Ausgangswerte vor dem Start</h2>
        <p className="mt-1 text-sm text-slate-600">
          {wert
            ? `Schätzung der Praxis${wert.erfasstAm ? ` vom ${new Date(wert.erfasstAm).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}` : ""}: ${wert.vorschlaegeMonat} Vorschläge im Monat, davon ${wert.ohneEntscheidungProzent} % ohne Entscheidung, ${wert.tageBisZahlung} Tage bis zur Zahlung.`
            : "Drei kurze Schätzungen, bevor Sie mit Sorrida arbeiten. Daran sehen Sie später, was sich verändert hat."}
        </p>
        {istAdmin && <div className="mt-4"><AusgangswertForm wert={wert} /></div>}
      </section>

      <section className="card overflow-x-auto p-0">
        <table className="w-full min-w-[40rem] text-sm" data-testid="wirkung-tabelle">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Kennzahl</th>
              <th className="px-4 py-3 text-right">Vorher (Schätzung)</th>
              {monate.map((m) => <th key={m} className="px-4 py-3 text-right">{monatName(m)}</th>)}
            </tr>
          </thead>
          <tbody>
            {zeilen.map((z) => (
              <tr key={z.name} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-900">{z.name}</span>
                  {z.hilfe && <span className="block text-xs text-slate-500">{z.hilfe}</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-500">{z.basis}</td>
                {z.werte.map((w, i) => <td key={i} className="px-4 py-3 text-right tabular-nums text-slate-900">{w}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="max-w-3xl text-xs text-slate-500">
        „Vorher“ ist eine Schätzung der Praxis, keine Messung. Die Monatswerte zählen Vorschläge und Rechnungen nach dem Monat, in dem sie entstanden sind; der laufende
        Monat ist unvollständig. Der Bericht enthält keine Patientendaten. Bitte nur mit Zustimmung der Praxis weitergeben.
      </p>
      <DruckKnopf />
    </div>
  );
}
