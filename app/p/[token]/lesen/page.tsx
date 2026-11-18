import { PraxisFussLaden } from "@/components/PraxisFussLaden";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { buildProposal, resolvePrices, showsJahresvergleich, tageBisStichtag } from "@/lib/proposals";
import { proposalInputSchema } from "@/lib/proposalSchema";
import { PatientProposalView } from "@/components/PatientProposalView";
import { DEFAULT_INSTALLMENTS } from "@/lib/installments";
import { UI, langDir, pickLang, type PatientLang } from "@/lib/patientI18n";
import { uebersetzungsWoerterbuch } from "@/lib/eigeneLeistung";
import { isTherapie, istZahnVorschlag, specialty } from "@/lib/specialties";
import { leseLinkVorschlag } from "@/lib/leseLink";

export const dynamic = "force-dynamic";
// Lese-Ansicht für eine Vertrauensperson unter /p/<Lese-Token>/lesen (lib/leseLink.ts). Der Pfad beginnt wie der Patienten-Link,
// damit dieselben Regeln greifen (kein Referrer, noindex, im Vorschau-Modus ohne Zugang erreichbar: lib/vorschau.ts PATIENTENLINK). Wie alle Patientenseiten: nicht für Suchmaschinen,
// kein Referrer, neutrale Vorschau ohne Praxis- oder Patientendaten.
export async function generateMetadata(props: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const searchParams = await props.searchParams;
  return { title: UI[pickLang(searchParams.lang, (await headers()).get("accept-language"))].readOnlyTitle, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

function Abgelaufen({ lang }: { lang: PatientLang }) {
  const t = UI[lang];
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center" lang={lang} dir={langDir(lang)} data-testid="lese-link-ungueltig">
      <h1 className="text-xl font-semibold text-slate-900">{t.expiredTitle}</h1>
      <p className="mt-3 text-slate-600">{t.goneText}</p>
    </main>
  );
}

// Gezeigt werden nur Praxisname, Möglichkeiten und Beträge. Bewusst NICHT geladen oder gezeigt: Vorname, Auswahl und
// Nachricht des Patienten, Vormerkung der Praxis, Unterschrift, Zweitmeinung, Zahlungsdaten. Die Ansicht merkt auch
// nicht „vom Patienten geöffnet“ vor, und ein PDF gibt es über diesen Link nicht.
export default async function LeseAnsicht(props: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const lang = pickLang(searchParams.lang, (await headers()).get("accept-language"));
  const zugang = await leseLinkVorschlag(params.token);
  const input = zugang ? proposalInputSchema.safeParse(zugang.proposal.input) : null;
  if (!zugang || !input?.success) return <Abgelaufen lang={lang} />;
  const { proposal } = zugang;
  const items = buildProposal(input.data, resolvePrices(proposal.practice.proposalPrices)).filter((i) => i.options.length > 0);
  const now = new Date();

  return (
    <>
      <PatientProposalView
        readOnly
        token=""
        practiceName={proposal.practice.name}
        firstName=""
        items={items}
        patient={input.data.patient}
        initialChoices={{}}
        empfehlung={{}}
        alreadyResponded={null}
        showJahresvergleich={showsJahresvergleich(now)}
        tageBisStichtag={tageBisStichtag(now)}
        expiresAt={zugang.expiresAt.toISOString()}
        installments={DEFAULT_INSTALLMENTS}
        lang={lang}
        dental={istZahnVorschlag(input.data.fach)}
        zusatz={uebersetzungsWoerterbuch(input.data.med?.custom, lang)}
        therapie={isTherapie(specialty(input.data.fach))}
        arztDativ={specialty(input.data.fach)?.arztDativ}
      />
      <PraxisFussLaden practiceId={proposal.practiceId} className="mx-auto max-w-xl px-4 pb-10 pt-2" />
    </>
  );
}
