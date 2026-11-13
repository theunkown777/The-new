import type { Metadata } from "next";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { buildProposal, resolvePrices, showsJahresvergleich, tageBisStichtag } from "@/lib/proposals";
import { choicesSchema, proposalInputSchema } from "@/lib/proposalSchema";
import { PatientProposalView } from "@/components/PatientProposalView";
import { resolveInstallments } from "@/lib/installments";
import { UI, empfehlungJe, langDir, pickLang, type PatientLang } from "@/lib/patientI18n";
import { alsEintrag, vergleichsFragen, zweitmeinungHinweis, anspruchAufZweitmeinung } from "@/lib/zweitmeinung";
import { isDental, isTherapie, specialty } from "@/lib/specialties";

export const dynamic = "force-dynamic";
const BASIS_META: Metadata = {
  title: "Ihr Behandlungsvorschlag",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  // Vorschau beim Teilen per SMS/Messenger: neutral, ohne Patienten- oder Praxisdaten.
  openGraph: { title: "Ihr Behandlungsvorschlag", description: "Ihre Möglichkeiten und Ihr Eigenanteil, von Ihrer Zahnarztpraxis.", images: [{ url: "/og/vorschlag.png", width: 1200, height: 630 }] },
};
// Titel im Browser in der Sprache der Ansicht; die Vorschau beim Teilen bleibt deutsch und neutral.
export function generateMetadata({ searchParams }: { searchParams: { lang?: string } }): Metadata {
  return { ...BASIS_META, title: UI[pickLang(searchParams.lang, headers().get("accept-language"))].pageTitle };
}

function Expired({ lang }: { lang: PatientLang }) {
  const t = UI[lang];
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center" lang={lang} dir={langDir(lang)}>
      <h1 className="text-xl font-semibold text-slate-900">{t.expiredTitle}</h1>
      <p className="mt-3 text-slate-600">{t.expiredText}</p>
    </main>
  );
}

// Öffentliche Ansicht für den Patienten. Gezeigt werden nur Vorname,
// Praxisname und die Optionen, keine Geburtsdaten oder Kassendaten.
export default async function PatientLinkPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { lang?: string };
}) {
  // Sprache: `?lang=`, sonst die bevorzugte Sprache des Browsers, sonst Deutsch.
  const lang = pickLang(searchParams.lang, headers().get("accept-language"));
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(params.token)) return <Expired lang={lang} />;
  const proposal = await prisma.treatmentProposal.findUnique({
    where: { shareTokenHash: hashToken(params.token) },
    include: {
      patient: { select: { firstName: true } },
      practice: { select: { name: true, proposalPrices: true, installments: true } },
    },
  });
  if (!proposal || !proposal.shareExpiresAt || proposal.shareExpiresAt < new Date()) return <Expired lang={lang} />;

  const input = proposalInputSchema.safeParse(proposal.input);
  const saved = choicesSchema.safeParse(proposal.choices);
  if (!input.success) return <Expired lang={lang} />;

  if (!proposal.patientViewedAt) {
    await prisma.treatmentProposal.update({ where: { id: proposal.id }, data: { patientViewedAt: new Date() } });
  }

  const items = buildProposal(input.data, resolvePrices(proposal.practice.proposalPrices)).filter((i) => i.options.length > 0);
  const dental = isDental(input.data.fach);
  const texte = items.flatMap((i) => [i.title, ...i.options.map((o) => o.name)]);
  const zweitmeinungen = await prisma.zweitmeinung.findMany({ where: { proposalId: proposal.id }, orderBy: { createdAt: "asc" } });
  // Die Sprachwahl gibt es für jedes Fach. Bezeichnungen, die nur auf Deutsch vorliegen (Angebote der
  // Arztpraxen), bleiben deutsch; die Ansicht weist dann selbst darauf hin.
  const patientChoices = choicesSchema.safeParse(proposal.patientChoices);
  const now = new Date();

  return (
    <PatientProposalView
      token={params.token}
      practiceName={proposal.practice.name}
      firstName={proposal.patient.firstName}
      items={items}
      patient={input.data.patient}
      initialChoices={patientChoices.success ? patientChoices.data : {}}
      empfehlung={empfehlungJe(items, saved.success ? saved.data : {})}
      alreadyResponded={proposal.patientResponse}
      showJahresvergleich={showsJahresvergleich(now)}
      tageBisStichtag={tageBisStichtag(now)}
      expiresAt={proposal.shareExpiresAt.toISOString()}
      installments={resolveInstallments(proposal.practice.installments)}
      lang={lang}
      dental={dental}
      therapie={isTherapie(specialty(input.data.fach))}
      arztDativ={specialty(input.data.fach)?.arztDativ}
      zweitmeinung={{
        apiUrl: `/api/p/${params.token}/zweitmeinung`,
        eintraege: zweitmeinungen.map(alsEintrag),
        hinweis: zweitmeinungHinweis(texte, dental),
        anspruch: !!anspruchAufZweitmeinung(texte),
        fragen: vergleichsFragen(dental),
      }}
    />
  );
}
