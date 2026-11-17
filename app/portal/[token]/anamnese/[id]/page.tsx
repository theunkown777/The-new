import { PraxisFussLaden } from "@/components/PraxisFussLaden";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AnamnesisForm } from "@/components/AnamnesisForm";
import { isDental } from "@/lib/specialties";
import { portalPatient } from "@/lib/portalAuth";
import { PraxisBand } from "@/components/PraxisKennung";
import { portalKennung, portalSymbole } from "@/lib/portalKopf";

export const dynamic = "force-dynamic";
export async function generateMetadata(props: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const k = await portalKennung((await props.params).token);
  return { title: k ? `Anamnesebogen · ${k.name}` : "Anamnesebogen", icons: k ? portalSymbole(k) : undefined, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

// Anamnesebogen im Patientenportal (statt eines eigenen Links).
export default async function PortalAnamnesis(props: { params: Promise<{ token: string; id: string }> }) {
  const params = await props.params;
  const patient = await portalPatient(params.token);
  const back = `/portal/${params.token}`;
  const form = patient
    ? await prisma.anamnesisForm.findFirst({
        where: { id: params.id, patientId: patient.id, submittedAt: null, expiresAt: { gt: new Date() } },
        include: { practice: { select: { name: true, specialty: true } } },
      })
    : null;
  if (!patient || !form) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Dieser Bogen ist nicht mehr offen</h1>
        <p className="mt-3 text-slate-600">Er wurde schon abgeschickt oder ist abgelaufen.</p>
        {patient && <a href={back} className="btn-primary mt-6 inline-block">Zurück zu Ihrem Behandlungsweg</a>}
      </main>
    );
  }
  if (!form.viewedAt) await prisma.anamnesisForm.update({ where: { id: form.id }, data: { viewedAt: new Date() } });
  const kennung = await portalKennung(params.token);
  return (
    <>
    {kennung && <PraxisBand k={kennung} breite="max-w-2xl" />}
    <AnamnesisForm
      token={params.token}
      postUrl={`/api/portal/${params.token}/anamnese/${form.id}`}
      backHref={back}
      practiceName={form.practice.name}
      firstName={patient.firstName}
      dental={isDental(form.practice.specialty)}
    />
    <PraxisFussLaden patientId={patient.id} className="mx-auto max-w-xl px-4 pb-10 pt-2" />
    </>
  );
}
