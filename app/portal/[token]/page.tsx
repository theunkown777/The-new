import type { Metadata } from "next";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { pickLang } from "@/lib/patientI18n";
import { epcPayload, formatIban, invoiceView, isOutstanding, paymentReference } from "@/lib/invoices";
import { PORTAL_UI, portalStatus } from "@/lib/portalI18n";
import { PortalInvoice, type PortalInvoiceData, type PortalText } from "@/components/PortalInvoice";
import { Behandlungsweg, Laechelbogen } from "@/components/Behandlungsweg";
import { KassenSockel } from "@/components/KassenSockel";
import { journey } from "@/lib/journey";
import { rowsOf } from "@/lib/analytics";
import { buildProposal, resolvePrices } from "@/lib/proposals";
import { choicesSchema, proposalInputSchema } from "@/lib/proposalSchema";

export const dynamic = "force-dynamic";
export function generateMetadata({ params }: { params: { token: string } }): Metadata {
  return {
    title: "Ihr Patientenportal",
    robots: { index: false, follow: false },
    referrer: "no-referrer",
    openGraph: { title: "Ihr Patientenportal", description: "Ihr Behandlungsweg, Unterlagen und Zahlungen Ihrer Praxis." },
    manifest: /^[A-Za-z0-9_-]{20,128}$/.test(params.token) ? `/portal/${params.token}/manifest.webmanifest` : undefined,
    appleWebApp: { capable: true, title: "Mein Portal", statusBarStyle: "default" },
  };
}

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
      practice: { select: { name: true, accountHolder: true, iban: true, bic: true, proposalPrices: true } },
      invoices: { where: { status: { not: "STORNIERT" } }, orderBy: { dueDate: "asc" }, take: 50 },
      proposals: {
        where: { OR: [{ shareCreatedAt: { not: null } }, { status: { in: ["BESPROCHEN", "ANGENOMMEN"] } }] },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, createdAt: true, eigenanteilCent: true, status: true, patientResponse: true, patientRespondedAt: true, shareCreatedAt: true, patientViewedAt: true, agreedAt: true, input: true, choices: true },
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
        due: [String(i.dueDate.getDate()), i.dueDate.toLocaleDateString(locale, { month: "short" })] as [string, string],
      };
    }),
  );
  // Nur Texte (keine Funktionen) an die Client-Komponente geben.
  const text = Object.fromEntries(Object.entries(t).filter(([, v]) => typeof v === "string")) as PortalText;
  const openCent = open.reduce((s, i) => s + i.amountCent, 0);
  const docs = patient.proposals.length + patient.anamnesisForms.length;

  // Behandlungsweg des aktuellen Vorschlags und die Aufteilung Kasse / Eigenanteil.
  const current = patient.proposals[0] ?? null;
  const weg = journey({ proposal: current, invoices: patient.invoices, anamnesisSubmitted: false }, now);
  let split: { kasse: number; eigen: number } | null = null;
  if (current) {
    const input = proposalInputSchema.safeParse(current.input);
    const choices = choicesSchema.safeParse(current.choices);
    if (input.success) {
      const rows = rowsOf({ id: current.id, status: current.status, createdAt: current.createdAt, patient: input.data.patient }, buildProposal(input.data, resolvePrices(practice.proposalPrices)).filter((i) => i.options.length), choices.success ? choices.data : {});
      split = { kasse: rows.reduce((s, r) => s + r.kasse, 0), eigen: rows.reduce((s, r) => s + r.privat, 0) };
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F2EE]" lang={lang} data-testid="portal">
      <div className="mx-auto max-w-xl px-4 pb-16 pt-6 sm:pt-10">
        <header className="flex items-center gap-2 text-sm font-semibold text-brand-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sorrida-mark.svg" alt="" className="h-7 w-7 shrink-0" />
          <span className="truncate">{practice.name}</span>
        </header>

        <h1 className="font-display mt-8 text-4xl leading-tight text-slate-900">{t.hello(patient.firstName)}</h1>
        <p className="mt-2 text-lg text-slate-700" data-testid="portal-summary">
          <span className="font-semibold text-brand-700">{t.next}:</span> {t.step(weg.patient)}
        </p>

        {/* Sorrida-Signatur: der Behandlungsweg auf dem Lächelbogen, darunter Kasse zuerst */}
        <section className="mt-6 rounded-3xl bg-white p-5" aria-labelledby="weg" data-testid="portal-weg">
          <h2 id="weg" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Laechelbogen className="h-2 w-8 text-brand-600" />
            {t.wayTitle}
          </h2>
          <div className="mt-4">
            <Behandlungsweg erreicht={weg.erreicht} aktuell={weg.aktuell} abgelehnt={weg.abgelehnt} size="gross" labels={t.stations.split("|")} />
          </div>
          {split && split.kasse + split.eigen > 0 && (
            <KassenSockel className="mt-3" kasse={split.kasse} eigen={split.eigen} labels={{ kasse: t.kassePays, eigen: t.yourShare }} />
          )}
          <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
            {open.length ? (
              <>
                {t.openTotal}: <b className="tabular-nums text-slate-900">{money(openCent)}</b> · {t.nextDue(date(open[0].dueDate))}
              </>
            ) : (
              t.allPaid
            )}
          </p>
        </section>

        {openInvoices.length > 0 && (
          <section className="mt-8" aria-labelledby="rechnungen">
            <h2 id="rechnungen" className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Laechelbogen className="h-2 w-8 text-brand-600" />{t.invoices}</h2>
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
            <h2 id="dokumente" className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Laechelbogen className="h-2 w-8 text-brand-600" />{t.documents}</h2>
            <ul className="mt-3 space-y-3">
              {patient.anamnesisForms.map((f) => (
                <li key={f.id}>
                  <a href={`/portal/${params.token}/anamnese/${f.id}`} className="flex items-center justify-between gap-3 rounded-2xl bg-sky-50 p-4 hover:bg-sky-100" data-testid="portal-anamnese">
                    <span>
                      <span className="block font-medium text-slate-900">{t.anamnesisTitle}</span>
                      <span className="text-sm text-slate-600">{t.anamnesis}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-sky-700 px-3 py-1 text-sm font-medium text-white">{t.fillIn}</span>
                  </a>
                </li>
              ))}
              {patient.proposals.map((p) => {
                const open = (p.status === "ENTWURF" || p.status === "BESPROCHEN") && !p.patientResponse;
                return (
                  <li key={p.id}>
                    <a href={`/portal/${params.token}/vorschlag/${p.id}${lang === "en" ? "?lang=en" : ""}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 hover:bg-brand-50" data-testid="portal-vorschlag">
                      <span>
                        <span className="block font-medium text-slate-900">{t.proposalDoc(date(p.createdAt))}</span>
                        <span className="text-sm text-slate-500">
                          {t.eigen}: {money(p.eigenanteilCent)} · {p.status === "ANGENOMMEN" ? t.accepted : p.patientResponse ? t.answered : t.waiting}
                        </span>
                      </span>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${open ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"}`}>{open ? t.choose : t.show}</span>
                    </a>
                    {p.status !== "ABGELEHNT" && (
                      p.agreedAt ? (
                        <p className="mt-1 px-4 text-sm text-salbei-700">✓ {t.signed} · {date(p.agreedAt)}</p>
                      ) : (
                        <a href={`/portal/${params.token}/vereinbarung/${p.id}`} className="mt-1 block px-4 text-sm font-medium text-brand-700 underline" data-testid="portal-unterschreiben">
                          {t.sign} →
                        </a>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {done.length > 0 && (
          <section className="mt-8" aria-labelledby="erledigt">
            <h2 id="erledigt" className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Laechelbogen className="h-2 w-8 text-salbei-600" />{t.history}</h2>
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
          <nav className="mb-3 flex justify-center gap-3 text-sm" aria-label="Sprache">
            {(["de", "en"] as const).map((l) => (
              <a key={l} href={`?lang=${l}`} aria-current={l === lang ? "true" : undefined} className={l === lang ? "font-semibold text-brand-700 underline" : "text-slate-600 hover:text-brand-700"}>
                {l === "de" ? "Deutsch" : "English"}
              </a>
            ))}
          </nav>
          <p>{t.privacy}</p>
          <p data-testid="startbildschirm">{t.homescreen}</p>
          <p>{t.valid(date(patient.portalExpiresAt))}</p>
        </footer>
      </div>
    </main>
  );
}
