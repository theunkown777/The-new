import { PraxisFussLaden } from "@/components/PraxisFussLaden";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { buildProposal, resolvePrices, showsJahresvergleich, tageBisStichtag } from "@/lib/proposals";
import { choicesSchema, proposalInputSchema } from "@/lib/proposalSchema";
import { PatientProposalView } from "@/components/PatientProposalView";
import { resolveInstallments } from "@/lib/installments";
import { UI, empfehlungJe, langDir, pickLang, type PatientLang } from "@/lib/patientI18n";
import { uebersetzungsWoerterbuch } from "@/lib/eigeneLeistung";
import { alsEintrag, vergleichsFragen, zweitmeinungHinweis, anspruchAufZweitmeinung } from "@/lib/zweitmeinung";
import { isDental, isTherapie, specialty } from "@/lib/specialties";
import { portalPatient, portalProposalWhere } from "@/lib/portalAuth";
import { LESE_LINK_MAX, leseLinksAktiv } from "@/lib/leseLink";

export const dynamic = "force-dynamic";
// Titel im Browser in der Sprache der Ansicht.
export async function generateMetadata(props: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const searchParams = await props.searchParams;
  return { title: UI[pickLang(searchParams.lang, (await headers()).get("accept-language"))].pageTitle, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

function Gone({ back, lang }: { back?: string; lang: PatientLang }) {
  const t = UI[lang];
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center" lang={lang} dir={langDir(lang)}>
      <h1 className="text-xl font-semibold text-slate-900">{t.goneTitle}</h1>
      <p className="mt-3 text-slate-600">{t.goneText}</p>
      {back && <a href={back} className="btn-primary mt-6 inline-block">{t.back}</a>}
    </main>
  );
}

// Behandlungsvorschlag im Patientenportal: gleiche Ansicht wie der
// Patienten-Link, abgesichert über den Portal-Link des Patienten.
export default async function PortalProposal(props: { params: Promise<{ token: string; id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  // Sprache: `?lang=`, sonst die bevorzugte Sprache des Browsers, sonst Deutsch.
  const lang = pickLang(searchParams.lang, (await headers()).get("accept-language"));
  const patient = await portalPatient(params.token);
  if (!patient) return <Gone lang={lang} />;
  const back = `/portal/${params.token}`;
  const proposal = await prisma.treatmentProposal.findFirst({
    where: { id: params.id, ...portalProposalWhere(patient.id) },
    include: { practice: { select: { name: true, proposalPrices: true, installments: true } } },
  });
  const input = proposal ? proposalInputSchema.safeParse(proposal.input) : null;
  if (!proposal || !input?.success) return <Gone back={back} lang={lang} />;
  if (!proposal.patientViewedAt) await prisma.treatmentProposal.update({ where: { id: proposal.id }, data: { patientViewedAt: new Date() } });

  const saved = choicesSchema.safeParse(proposal.choices);
  const patientChoices = choicesSchema.safeParse(proposal.patientChoices);
  const items = buildProposal(input.data, resolvePrices(proposal.practice.proposalPrices)).filter((i) => i.options.length > 0);
  const dental = isDental(input.data.fach);
  const texte = items.flatMap((i) => [i.title, ...i.options.map((o) => o.name)]);
  const zweitmeinungen = await prisma.zweitmeinung.findMany({ where: { proposalId: proposal.id }, orderBy: { createdAt: "asc" } });
  const now = new Date();
  const decided = proposal.status === "ANGENOMMEN" || proposal.status === "ABGELEHNT";
  const leseLinks = await leseLinksAktiv(proposal.id, now);
  const api = `/api/portal/${params.token}/vorschlag/${proposal.id}`;

  return (
    <>
    <PatientProposalView
      token={params.token}
      postUrl={`/api/portal/${params.token}/vorschlag/${proposal.id}`}
      backHref={back}
      practiceName={proposal.practice.name}
      firstName={patient.firstName}
      items={items}
      patient={input.data.patient}
      initialChoices={patientChoices.success ? patientChoices.data : {}}
      empfehlung={empfehlungJe(items, saved.success ? saved.data : {})}
      alreadyResponded={decided ? proposal.patientResponse ?? "INTERESSE" : proposal.patientResponse}
      showJahresvergleich={showsJahresvergleich(now)}
      tageBisStichtag={tageBisStichtag(now)}
      expiresAt={patient.portalExpiresAt!.toISOString()}
      installments={resolveInstallments(proposal.practice.installments)}
      lang={lang}
      dental={dental}
      zusatz={uebersetzungsWoerterbuch(input.data.med?.custom, lang)}
      therapie={isTherapie(specialty(input.data.fach))}
      arztDativ={specialty(input.data.fach)?.arztDativ}
      zweitmeinung={{
        apiUrl: `/api/portal/${params.token}/vorschlag/${proposal.id}/zweitmeinung`,
        eintraege: zweitmeinungen.map(alsEintrag),
        hinweis: zweitmeinungHinweis(texte, dental),
        anspruch: !!anspruchAufZweitmeinung(texte),
        fragen: vergleichsFragen(dental),
      }}
      pdfUrl={`${api}/pdf`}
      share={{ apiUrl: `${api}/lesen`, links: leseLinks, max: LESE_LINK_MAX }}
      remind={decided ? undefined : { apiUrl: `${api}/erinnern`, am: proposal.erinnernAm?.toISOString() ?? null }}
    />
    <PraxisFussLaden patientId={patient.id} className="mx-auto max-w-xl px-4 pb-10 pt-2" />
    </>
  );
}
