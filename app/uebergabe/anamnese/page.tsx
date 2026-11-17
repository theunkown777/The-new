import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AnamnesisForm } from "@/components/AnamnesisForm";
import { anamneseProfilFuer } from "@/lib/anamnesis";
import { uebergabeFuer, uebergabeSchritte } from "@/lib/empfangServer";

export const dynamic = "force-dynamic";

// Anamnesebogen am Empfangs-Tablet: dieselbe Ansicht wie im Patientenportal, abgeschickt wird über das Übergabe-Token.
export default async function UebergabeAnamnese() {
  const a = await uebergabeFuer("anamnese");
  if (!a) redirect("/uebergabe");
  const s = await uebergabeSchritte(a.uebergabe);
  if (!s.anamneseOffen || s.anamneseFertig) redirect("/uebergabe");
  const wo = { id: s.anamneseOffen, practiceId: a.patient.practiceId, patientId: a.patient.id };
  const form = await prisma.anamnesisForm.findFirst({ where: wo, select: { fach: true } });
  // Älterer Bogen ohne Fach: das Fach jetzt festhalten, damit Anzeige und Prüfung zusammenpassen.
  const fach = form?.fach ?? a.patient.practice.specialty;
  await prisma.anamnesisForm.updateMany({ where: { ...wo, viewedAt: null }, data: { viewedAt: new Date() } });
  if (!form?.fach) await prisma.anamnesisForm.updateMany({ where: { ...wo, fach: null }, data: { fach } });
  return (
    <div data-testid="uebergabe-anamnese">
      <AnamnesisForm token="" postUrl={`/api/empfang/patient/anamnese/${s.anamneseOffen}`} backHref="/uebergabe" practiceName={a.patient.practice.name} firstName={a.patient.firstName} profil={anamneseProfilFuer(fach, a.patient.practice.specialty, a.patient)} />
    </div>
  );
}
