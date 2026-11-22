import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { agreementContext } from "@/lib/agreementContext";
import { SignAgreement } from "@/components/SignAgreement";
import { KassenSockel } from "@/components/KassenSockel";
import { offeneEinverstaendnisseWhere, uebergabeFuer } from "@/lib/empfangServer";

export const dynamic = "force-dynamic";

// Einverständnis am Empfangs-Tablet lesen und unterschreiben. Nur Vorschläge dieses einen Patienten,
// die er auch im Patientenportal unterschreiben könnte.
export default async function UebergabeUnterschrift(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const a = await uebergabeFuer("unterschrift");
  if (!a) redirect("/uebergabe");
  const proposal = await prisma.treatmentProposal.findFirst({
    where: { id: params.id, practiceId: a.patient.practiceId, ...offeneEinverstaendnisseWhere(a.patient.id) },
    select: { id: true, status: true, createdAt: true, input: true, choices: true, patientChoices: true, practice: { select: { name: true, proposalPrices: true } } },
  });
  const ctx = proposal && agreementContext(proposal);
  if (!proposal || !ctx) redirect("/uebergabe");
  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-6" data-testid="uebergabe-unterschrift">
      <a href="/uebergabe" className="text-sm text-salbei-700 underline">← Zurück zur Übersicht</a>
      <h1 className="font-display mt-4 text-3xl leading-tight text-slate-900">Ihr Einverständnis</h1>
      <p className="mt-2 text-slate-600">Bitte lesen Sie die Erklärung in Ruhe. Bei Fragen wenden Sie sich an den Empfang.</p>
      <KassenSockel className="mt-5" kasse={ctx.kasse} eigen={ctx.eigen} labels={{ kasse: ctx.privat ? "Versicherung erstattet" : "Kasse zahlt", eigen: "Ihr Anteil" }} />
      <div className="mt-6">
        <SignAgreement postUrl={`/api/empfang/patient/vereinbarung/${proposal.id}`} backHref="/uebergabe" text={ctx.text} defaultName={`${a.patient.firstName} ${a.patient.lastName}`} fach={a.patient.practice.specialty} />
      </div>
    </main>
  );
}
