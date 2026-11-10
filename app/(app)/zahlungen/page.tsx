import Link from "next/link";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { REMINDER_LABELS, formatCent, formatIban, invoiceTotals, invoiceView } from "@/lib/invoices";
import { InvoiceActions } from "@/components/InvoiceActions";
import { whatsappApiAktiv } from "@/lib/whatsapp";
import { CreateInvoiceButton } from "@/components/CreateInvoiceButton";
import { BankSettings } from "@/components/BankSettings";
import { Bankabgleich } from "@/components/Bankabgleich";
import { SepaExport } from "@/components/SepaExport";
import { DatevExport } from "@/components/DatevExport";
import { OnlineZahlungEinrichten } from "@/components/OnlineZahlungEinrichten";
import { onlineZahlungStatus } from "@/lib/onlineZahlung";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zahlungen" };

const FILTER = [
  ["offen", "Offen"],
  ["ueberfaellig", "Überfällig"],
  ["gemeldet", "Gemeldet"],
  ["bezahlt", "Bezahlt"],
  ["alle", "Alle"],
] as const;

const DAY = 24 * 60 * 60 * 1000;

// Sorrida-Stil: Status als Punkt und Satz statt farbiger Pille.
const DOT: Record<string, string> = { emerald: "bg-salbei-600", sky: "bg-sky-600", red: "bg-red-600", amber: "bg-amber-500", slate: "bg-slate-400" };
const TXT: Record<string, string> = { emerald: "text-salbei-700", sky: "text-sky-800", red: "font-medium text-red-700", amber: "text-slate-700", slate: "text-slate-500" };
function Status({ tone, label }: { tone: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-sm ${TXT[tone]}`}>
      <span className={`h-2 w-2 rounded-full ${DOT[tone]}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export default async function ZahlungenPage({ searchParams }: { searchParams: { f?: string; stripe?: string } }) {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;
  const f = FILTER.find(([k]) => k === searchParams.f)?.[0] ?? "offen";
  const now = new Date();
  const where: Prisma.InvoiceWhereInput =
    f === "offen"
      ? { status: { in: ["OFFEN", "GEMELDET"] } }
      : f === "ueberfaellig"
        ? { status: "OFFEN", dueDate: { lt: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } }
        : f === "gemeldet"
          ? { status: "GEMELDET" }
          : f === "bezahlt"
            ? { status: "BEZAHLT" }
            : {};

  const [practice, all, list, billable] = await Promise.all([
    prisma.practice.findUnique({ where: { id: practiceId }, select: { name: true, accountHolder: true, iban: true, bic: true, glaeubigerId: true, datev: true, stripeAccountId: true } }),
    prisma.invoice.findMany({ where: { practiceId }, select: { status: true, dueDate: true, amountCent: true, paidAt: true, wantsInstallments: true, sepaMandatAt: true, sepaExportedAt: true } }),
    prisma.invoice.findMany({
      where: { practiceId, ...where },
      orderBy: f === "bezahlt" ? { paidAt: "desc" } : { dueDate: "asc" },
      take: 100,
      include: { patient: { select: { id: true, firstName: true, lastName: true, portalViewedAt: true, portalExpiresAt: true, email: true, contactConsentAt: true, phone: true, whatsappConsentAt: true } } },
    }),
    // Angenommene Vorschläge mit Eigenanteil, für die es noch keine Rechnung gibt.
    prisma.treatmentProposal.findMany({
      where: { practiceId, status: "ANGENOMMEN", eigenanteilCent: { gt: 0 }, invoices: { none: {} }, updatedAt: { gte: new Date(now.getTime() - 120 * DAY) } },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, eigenanteilCent: true, updatedAt: true, patient: { select: { id: true, firstName: true, lastName: true } } },
    }),
  ]);
  const t = invoiceTotals(all, now);
  const raten = all.filter((i) => i.wantsInstallments && (i.status === "OFFEN" || i.status === "GEMELDET")).length;
  const isAdmin = session!.user.role === "admin";
  const fmtDate = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="space-y-6" data-testid="zahlungen">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-slate-900">Zahlungen</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Rechnungen für Eigenanteile und Selbstzahlerleistungen. Patienten sehen sie auf ihrem Behandlungsweg am Handy und überweisen per GiroCode direkt auf Ihr Konto.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="card">
          <p className="text-sm text-slate-500">Offen</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900" data-testid="kpi-offen">{formatCent(t.offenCent)}</p>
          <p className="mt-1 text-xs text-slate-500">{t.offen} Rechnungen</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Überfällig</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${t.ueberfaellig ? "text-red-700" : "text-slate-900"}`}>{formatCent(t.ueberfaelligCent)}</p>
          <p className="mt-1 text-xs text-slate-500">{t.ueberfaellig} Rechnungen</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Vom Patienten gemeldet</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{formatCent(t.gemeldetCent)}</p>
          <p className="mt-1 text-xs text-slate-500">Zahlungseingang prüfen{raten ? ` · ${raten}× Raten angefragt` : ""}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Bezahlt diesen Monat</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-800">{formatCent(t.bezahltMonatCent)}</p>
          <p className="mt-1 text-xs text-slate-500">nach Bestätigung durch die Praxis</p>
        </div>
      </div>

      {!practice?.iban && (
        <section className="card border-amber-200 bg-amber-50">
          <h2 className="font-semibold text-slate-900">Bankverbindung hinterlegen</h2>
          <p className="mb-4 mt-1 text-sm text-slate-600">Damit Patienten im Portal per GiroCode zahlen können. Das Geld geht direkt auf Ihr Praxiskonto, Sorrida berührt es nicht.</p>
          <BankSettings initial={{ accountHolder: practice?.name ?? "", iban: "", bic: "" }} readOnly={!isAdmin} />
        </section>
      )}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="card overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
            {FILTER.map(([k, l]) => (
              <Link key={k} href={`/zahlungen?f=${k}`} aria-current={k === f ? "page" : undefined} className={`rounded-full px-3 py-1 text-sm ${k === f ? "bg-brand-600 text-white" : "bg-[#F5F2EE] text-slate-700 hover:text-brand-700"}`}>
                {l}
              </Link>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Keine Rechnungen in dieser Ansicht.</p>
          ) : (
            <>
            {/* Handy: Karten statt Tabelle, damit Status und Aktionen sichtbar bleiben */}
            <ul className="divide-y divide-slate-100 md:hidden" data-testid="invoice-cards">
              {list.map((i) => {
                const v = invoiceView(i, now);
                return (
                  <li key={i.id} className="space-y-2 px-4 py-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/patients?sel=${i.patient.id}`} className="font-medium text-slate-900">{i.patient.lastName}, {i.patient.firstName}</Link>
                        <p className="text-xs text-slate-500">{i.title} · Nr. {i.number} · fällig {fmtDate(i.dueDate)}{i.wantsInstallments ? " · Raten angefragt" : ""}{i.sepaMandatAt ? (i.sepaExportedAt ? " · Lastschrift eingereicht" : " · Lastschrift erteilt") : ""}{i.reminderLevel > 0 ? ` · ${REMINDER_LABELS[i.reminderLevel]}` : ""}</p>
                      </div>
                      <b className="shrink-0 tabular-nums text-slate-900">{formatCent(i.amountCent)}</b>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Status tone={v.tone} label={v.label} />
                      <InvoiceActions id={i.id} status={i.status} patientId={i.patient.id} firstName={i.patient.firstName} practiceName={practice?.name ?? ""} level={i.reminderLevel} number={i.number} amountCent={i.amountCent} dueDate={i.dueDate.toISOString()} mail={!!i.patient.email && !!i.patient.contactConsentAt} whatsapp={!!i.patient.phone && !!i.patient.whatsappConsentAt} whatsappDirekt={whatsappApiAktiv()} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm" data-testid="invoice-table">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-2 font-semibold">Patient</th>
                    <th className="px-4 py-2 font-semibold">Rechnung</th>
                    <th className="px-4 py-2 font-semibold">Fällig</th>
                    <th className="px-4 py-2 text-right font-semibold">Betrag</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((i) => {
                    const v = invoiceView(i, now);
                    const portal = i.patient.portalExpiresAt && i.patient.portalExpiresAt > now;
                    return (
                      <tr key={i.id} className="border-t border-slate-100 align-top">
                        <td className="px-4 py-3">
                          <Link href={`/patients?sel=${i.patient.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                            {i.patient.lastName}, {i.patient.firstName}
                          </Link>
                          <p className="text-xs text-slate-500">{portal ? (i.patient.portalViewedAt ? "Weg geöffnet" : "Link gesendet") : "noch kein Link"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-800">{i.title}</p>
                          <p className="text-xs text-slate-500">Nr. {i.number}{i.wantsInstallments ? " · Raten angefragt" : ""}{i.sepaMandatAt ? (i.sepaExportedAt ? " · Lastschrift eingereicht" : " · Lastschrift erteilt") : ""}{i.reminderLevel > 0 ? ` · ${REMINDER_LABELS[i.reminderLevel]}${i.remindedAt ? ` am ${fmtDate(i.remindedAt)}` : ""}` : ""}</p>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-600">{fmtDate(i.dueDate)}</td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">{formatCent(i.amountCent)}</td>
                        <td className="px-4 py-3">
                          <Status tone={v.tone} label={v.label} />
                        </td>
                        <td className="px-4 py-3">
                          <InvoiceActions id={i.id} status={i.status} patientId={i.patient.id} firstName={i.patient.firstName} practiceName={practice?.name ?? ""} level={i.reminderLevel} number={i.number} amountCent={i.amountCent} dueDate={i.dueDate.toISOString()} mail={!!i.patient.email && !!i.patient.contactConsentAt} whatsapp={!!i.patient.phone && !!i.patient.whatsappConsentAt} whatsappDirekt={whatsappApiAktiv()} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>

        <aside className="space-y-6">
          <section className="card" data-testid="abzurechnen">
            <h2 className="font-semibold text-slate-900">Abzurechnen</h2>
            <p className="mt-1 text-sm text-slate-600">Angenommene Vorschläge mit Eigenanteil, die noch keine Rechnung haben.</p>
            {billable.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Alles abgerechnet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {billable.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <span>
                      <span className="block font-medium text-slate-900">{p.patient.lastName}, {p.patient.firstName}</span>
                      <span className="text-xs text-slate-500">angenommen am {fmtDate(p.updatedAt)} · {formatCent(p.eigenanteilCent)}</span>
                    </span>
                    <CreateInvoiceButton patientId={p.patient.id} proposalId={p.id} title="Eigenanteil Behandlung" amountEur={p.eigenanteilCent / 100} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          {isAdmin && (
            <SepaExport
              bereit={!!practice?.iban && !!practice?.glaeubigerId}
              anzahl={all.filter((i) => i.status === "OFFEN" && i.sepaMandatAt && !i.sepaExportedAt).length}
              summe={formatCent(all.filter((i) => i.status === "OFFEN" && i.sepaMandatAt && !i.sepaExportedAt).reduce((a, i) => a + i.amountCent, 0))}
            />
          )}
          <section className="card" aria-labelledby="online-titel">
            <h2 id="online-titel" className="font-semibold text-slate-900">Online-Zahlung mit DATEV-Anbindung</h2>
            <p className="mt-1 mb-3 text-sm text-slate-600">Patienten bezahlen offene Rechnungen im Portal; die Zahlung landet über den DATEV-Datenservice in der Buchhaltung.</p>
            <OnlineZahlungEinrichten {...onlineZahlungStatus()} konto={practice?.stripeAccountId ?? null} istAdmin={isAdmin} meldung={searchParams?.stripe} />
          </section>
          <section className="card" aria-labelledby="datev-titel">
            <h2 id="datev-titel" className="font-semibold text-slate-900">DATEV für die Steuerberatung</h2>
            <p className="mt-1 mb-3 text-sm text-slate-600">Rechnungen und Zahlungseingänge eines Zeitraums als Buchungsstapel.</p>
            <DatevExport einstellungen={(practice?.datev as Record<string, number> | null) ?? null} istAdmin={isAdmin} />
          </section>
          <Bankabgleich />
          {practice?.iban && (
            <section className="card">
              <h2 className="font-semibold text-slate-900">Bankverbindung</h2>
              <p className="mt-1 text-sm text-slate-600">{practice.accountHolder} · <span className="font-mono">{formatIban(practice.iban)}</span></p>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-brand-700">Ändern</summary>
                <div className="mt-3">
                  <BankSettings initial={{ accountHolder: practice.accountHolder ?? "", iban: formatIban(practice.iban), bic: practice.bic ?? "", glaeubigerId: practice.glaeubigerId ?? "" }} readOnly={!isAdmin} />
                </div>
              </details>
            </section>
          )}
          <section className="rounded-2xl bg-[#F5F2EE] p-5 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">So läuft es für den Patienten</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Er bekommt den Link zu seinem Behandlungsweg per SMS oder QR-Code.</li>
              <li>Er sieht offene Rechnungen mit Fälligkeit, ohne App und Konto.</li>
              <li>Er zahlt per GiroCode oder kopiert IBAN und Verwendungszweck.</li>
              <li>Er tippt „Ich habe überwiesen“; Sie bestätigen den Eingang hier.</li>
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
