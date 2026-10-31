import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AnamnesisForm } from "@/components/AnamnesisForm";
import { isDental } from "@/lib/specialties";
import { portalPatient } from "@/lib/portalAuth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anamnesebogen", robots: { index: false, follow: false }, referrer: "no-referrer" };

// Anamnesebogen im Patientenportal (statt eines eigenen Links).
export default async function PortalAnamnesis({ params }: { params: { token: string; id: string } }) {
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
        {patient && <a href={back} className="btn-primary mt-6 inline-block">Zurück zu Ihrem Portal</a>}
      </main>
    );
  }
  if (!form.viewedAt) await prisma.anamnesisForm.update({ where: { id: form.id }, data: { viewedAt: new Date() } });
  return (
    <AnamnesisForm
      token={params.token}
      postUrl={`/api/portal/${params.token}/anamnese/${form.id}`}
      backHref={back}
      practiceName={form.practice.name}
      firstName={patient.firstName}
      dental={isDental(form.practice.specialty)}
    />
  );
}
