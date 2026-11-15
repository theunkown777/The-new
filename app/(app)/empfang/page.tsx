import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Empfang } from "@/components/Empfang";
import { LEERLAUF_MINUTEN, UEBERGABE_MINUTEN } from "@/lib/empfang";

export const dynamic = "force-dynamic";
export const metadata = { title: "Empfang" };

// Empfang: Praxis-Tablet für das Wartezimmer. Die Mitarbeiterin wählt einen Patienten und übergibt das
// Tablet; danach zeigt es unter /uebergabe nur noch die Schritte für diesen Patienten.
export default async function EmpfangPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?callbackUrl=/empfang");
  const praxis = await prisma.practice.findUnique({ where: { id: session.user.practiceId }, select: { empfangPinHash: true, isDemo: true } });
  return (
    <div className="mx-auto max-w-2xl" data-testid="empfang">
      <h1 className="font-display text-3xl text-slate-900">Empfang</h1>
      <p className="mt-1 text-sm text-slate-600">Tablet an einen Patienten übergeben: Anamnesebogen ausfüllen, Einverständnis unterschreiben, Kontaktdaten prüfen.</p>
      <div className="mt-5">
        <Empfang pinGesetzt={!!praxis?.empfangPinHash} admin={session.user.role === "admin"} minuten={UEBERGABE_MINUTEN} leerlauf={LEERLAUF_MINUTEN} />
      </div>
    </div>
  );
}
