import type { Metadata } from "next";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { pickLang } from "@/lib/patientI18n";
import { epcPayload, formatIban, invoiceView, isOutstanding, paymentReference } from "@/lib/invoices";
import { PORTAL_UI, portalStatus } from "@/lib/portalI18n";
import { PortalInvoice, type PortalInvoiceData, type PortalText } from "@/components/PortalInvoice";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ihr Patientenportal",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  openGraph: { title: "Ihr Patientenportal", description: "Rechnungen und Dokumente Ihrer Praxis auf einen Blick." },
};

function Expired() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-slate-900">Dieser Link ist nicht mehr gültig</h1>
      <p className="mt-3 text-slate-600">Aus Datenschutzgründen sind Portal-Links nur begrenzt gültig. Bitte fragen Sie in Ihrer Praxis nach einem neuen Link.</p>
    </main>
  );
}

// Patientenportal: offene Rechnungen mit GiroCode, Vorschläge als Dokument.
// Gezeigt werden nur Vorname und Praxisname, keine Kassen- oder Geburtsdaten.
export default async function PortalPage({ params, searchParams }: { params: { token: string }; searchParams: { lang?: string } }) {
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(params.token)) return <Expired />;
  const now = new Date();
  const patient = await prisma.patient.findUnique({
    where: { portalTokenHash: hashToken(params.token) },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      portalExpiresAt: true,
      portalViewedAt: true,
      practice: { select: { name: true, accountHolder: true, iban: true, bic: true } },
      invoices: { where: { status: { not: "STORNIERT" } }, orderBy: { dueDate: "asc" }, take: 50 },
      proposals: {
        where: { status: { in: ["BESPROCHEN", "ANGENOMMEN"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, createdAt: true, letterText: true, eigenanteilCent: true },
      },
      anamnesisForms: { where: { submittedAt: null, expiresAt: { gt: now } }, select: { id: true }, take: 1 },
    },
  });
  if (!patient || !patient.portalExpiresAt || patient.portalExpiresAt < now) return <Expired />;
  if (!patient.portalViewedAt) await prisma.patient.update({ where: { id: patient.id }, data: { portalViewedAt: now } });

  const lang = pickLang(searchParams.lang, headers().get("accept-language"));
  const t = PORTAL_UI[lang];
  const locale = lang === "en" ? "en-GB" : "de-DE";
  const date = (d: Date) => d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  const money = (c: number) => (c / 100).toLocaleString(locale, { style: "currency", currency: "EUR" });
  const { practice } = patient;
  const bank = practice.iban ? { name: practice.accountHolder || practice.name, iban: practice.iban, bic: practice.bic } : null;

  const open = patient.invoices.filter((i) => isOutstanding(i.status));
  const done = patient.invoices.filter((i) => i.status === "BEZAHLT").slice(0, 10);
  const openInvoices: PortalInvoiceData[] = await Promise.all(
    open.map(async (i) => {
      const v = invoiceView(i, now);
      const reference = paymentReference(i.number, patient.lastName);
      const qr = bank
        ? await QRCode.toDataURL(epcPayload({ ...bank, amountCent: i.amountCent, reference }), { errorCorrectionLevel: "M", margin: 1, width: 220 })
        : null;
      return {
        id: i.id,
        title: i.title,
        number: i.number,
        amount: money(i.amountCent),
        amountPlain: (i.amountCent / 100).toFixed(2).replace(".", ","),
        status: portalStatus(v.key, v.days, lang),
        tone: v.tone,
        reported: i.status === "GEMELDET",
        wantsInstallments: i.wantsInstallments,
        reference,
        qr,
      };
    }),
  );
  // Nur Texte (keine Funktionen) an die Client-Komponente geben.
  const text = Object.fromEntries(Object.entries(t).filter(([, v]) => typeof v === "string")) as PortalText;
  const openCent = open.reduce((s, i) => s + i.amountCent, 0);
  const docs = patient.proposals.length;

  return (
    <main className="min-h-screen bg-[#F5F2EE]" lang={lang} data-testid="portal">
      <div className="mx-auto max-w-xl px-4 pb-16 pt-6 sm:pt-10">
        <header className="flex items-center justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-brand-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/sorrida-mark.svg" alt="" className="h-7 w-7 shrink-0" />
            <span className="truncate">{practice.name}</span>
          </p>
          <nav className="flex shrink-0 gap-1 text-xs" aria-label="Sprache">
            {(["de", "en"] as const).map((l) => (
              <a key={l} href={`?lang=${l}`} aria-current={l === lang ? "true" : undefined} className={`rounded-full border px-2.5 py-1 uppercase ${l === lang ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-600"}`}>
                {l}
              </a>
            ))}
          </nav>
        </header>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-slate-900">{t.hello(patient.firstName)}</h1>
        <p className="mt-2 text-slate-600" data-testid="portal-summary">{t.summary(open.length, docs)}</p>

        <section className="mt-6 rounded-3xl bg-brand-600 p-5 text-white shadow-[0_18px_40px_-24px_rgba(107,42,36,.9)]">
          <p className="text-sm text-brand-100">{t.openTotal}</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">{money(openCent)}</p>
          <p className="mt-2 text-sm text-brand-100">{open.length ? t.nextDue(date(open[0].dueDate)) : t.allPaid}</p>
        </section>

        {openInvoices.length > 0 && (
          <section className="mt-8" aria-labelledby="rechnungen">
            <h2 id="rechnungen" className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.invoices}</h2>
            {!bank && <p className="mt-3 rounded-2xl bg-white p-4 text-sm text-slate-600">{t.noBank}</p>}
            <ul className="mt-3 space-y-3">
              {openInvoices.map((i, idx) => (
                <li key={i.id}>
                  <PortalInvoice token={params.token} inv={i} bank={bank ? { name: bank.name, iban: formatIban(bank.iban) } : null} t={text} startOpen={idx === 0 && openInvoices.length === 1} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {(docs > 0 || patient.anamnesisForms.length > 0) && (
          <section className="mt-8" aria-labelledby="dokumente">
            <h2 id="dokumente" className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.documents}</h2>
            <ul className="mt-3 space-y-3">
              {patient.anamnesisForms.length > 0 && <li className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-900">{t.anamnesis}</li>}
              {patient.proposals.map((p) => (
                <li key={p.id}>
                  <details className="group rounded-2xl bg-white p-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <span>
                        <span className="block font-medium text-slate-900">{t.proposalDoc(date(p.createdAt))}</span>
                        <span className="text-sm text-slate-500">{t.eigen}: {money(p.eigenanteilCent)}</span>
                      </span>
                      <span className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700 group-open:hidden">{t.show}</span>
                    </summary>
                    <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{p.letterText}</pre>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        )}

        {done.length > 0 && (
          <section className="mt-8" aria-labelledby="erledigt">
            <h2 id="erledigt" className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.history}</h2>
            <ul className="mt-3 divide-y divide-slate-200 rounded-2xl bg-white">
              {done.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate text-slate-800">{i.title}</span>
                    <span className="text-xs text-slate-500">{t.invoiceNo} {i.number}</span>
                  </span>
                  <span className="text-right">
                    <span className="block tabular-nums text-slate-900">{money(i.amountCent)}</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">{t.paid}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-10 space-y-1 text-center text-xs text-slate-500">
          <p>{t.privacy}</p>
          <p>{t.valid(date(patient.portalExpiresAt))}</p>
        </footer>
      </div>
    </main>
  );
}
