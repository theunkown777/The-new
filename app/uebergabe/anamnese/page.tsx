import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AnamnesisForm } from "@/components/AnamnesisForm";
import { isDental } from "@/lib/specialties";
import { uebergabeFuer, uebergabeSchritte } from "@/lib/empfangServer";

export const dynamic = "force-dynamic";

// Anamnesebogen am Empfangs-Tablet: dieselbe Ansicht wie im Patientenportal, abgeschickt wird über das Übergabe-Token.
export default async function UebergabeAnamnese() {
  const a = await uebergabeFuer("anamnese");
  if (!a) redirect("/uebergabe");
  const s = await uebergabeSchritte(a.uebergabe);
  if (!s.anamneseOffen || s.anamneseFertig) redirect("/uebergabe");
  await prisma.anamnesisForm.updateMany({ where: { id: s.anamneseOffen, practiceId: a.patient.practiceId, patientId: a.patient.id, viewedAt: null }, data: { viewedAt: new Date() } });
  return (
    <div data-testid="uebergabe-anamnese">
      <AnamnesisForm token="" postUrl={`/api/empfang/patient/anamnese/${s.anamneseOffen}`} backHref="/uebergabe" practiceName={a.patient.practice.name} firstName={a.patient.firstName} dental={isDental(a.patient.practice.specialty)} />
    </div>
  );
}
