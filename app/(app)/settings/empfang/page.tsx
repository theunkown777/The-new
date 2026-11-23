import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nurMitEinstellungen } from "@/lib/permissions";
import { EmpfangPinSettings } from "@/components/EmpfangPinSettings";

import { praxisText } from "@/lib/praxisFach";
export const dynamic = "force-dynamic";
export const metadata = { title: "Empfang" };

export default async function EmpfangSettingsPage() {
  const ft = await praxisText();
  // Einstellungen der Praxis: Behandler/innen sehen nur das eigene Konto (lib/rollen.ts).
  await nurMitEinstellungen();
  const session = await getServerSession(authOptions);
  const praxis = await prisma.practice.findUnique({ where: { id: session!.user.practiceId }, select: { empfangPinHash: true } });
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm"><Link href="/settings" className="text-brand-700 hover:underline">← Einstellungen</Link></p>
      <h1 className="mt-1 font-display text-3xl text-slate-900">Empfang</h1>
      <p className="mt-1 text-sm text-slate-500">{ft("Für das Tablet im Wartezimmer: Patienten füllen dort ihren Anamnesebogen aus, unterschreiben und prüfen ihre Kontaktdaten. Mit der PIN kommt das Team danach zurück.")}</p>
      <div className="mt-5"><EmpfangPinSettings admin={session!.user.role === "admin"} gesetzt={!!praxis?.empfangPinHash} /></div>
      <p className="mt-4 text-sm"><Link href="/empfang" className="text-brand-700 underline" data-testid="zum-empfang">Zum Empfang</Link></p>
    </div>
  );
}
