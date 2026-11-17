import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nurMitEinstellungen } from "@/lib/permissions";
import { leseStammdaten, praxisZeile, stammdatenBeispiele, stammdatenFehlen } from "@/lib/praxisStammdaten";
import { PraxisStammdaten } from "@/components/PraxisStammdaten";
import { PraxisFuss } from "@/components/PraxisFuss";

export const dynamic = "force-dynamic";
export const metadata = { title: "Angaben der Praxis" };

// Angaben der Praxis für ihre Patienten: Anschrift, Telefon, Kammer, Aufsicht, Impressum und Datenschutzhinweise.
export default async function PraxisAngabenPage() {
  // Einstellungen der Praxis: Behandler/innen sehen nur das eigene Konto (lib/rollen.ts).
  await nurMitEinstellungen();
  const session = await getServerSession(authOptions);
  const admin = session!.user.role === "admin";
  const practice = await prisma.practice.findUnique({ where: { id: session!.user.practiceId }, select: { name: true, stammdaten: true, specialty: true } });
  const s = leseStammdaten(practice?.stammdaten);
  const name = practice?.name ?? "";
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/settings" className="text-sm text-brand-700 underline">← Einstellungen</Link>
        <h1 className="mt-2 font-display text-3xl text-slate-900">Angaben der Praxis</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ihre Patienten sehen diese Angaben unten im Patientenportal, im Patienten-Link und im Anamnesebogen. Anschrift und Telefon stehen
          außerdem unter jeder E-Mail, die Sie über Sorrida an Patienten schicken. Gezeigt wird nur, was Sie eintragen.
        </p>
      </div>
      {admin ? (
        <PraxisStammdaten start={s} fehlt={stammdatenFehlen(s)} beispiele={stammdatenBeispiele(practice?.specialty)} />
      ) : (
        <p className="card text-sm text-slate-600">Diese Angaben ändert die Praxisleitung. Eingetragen ist: {praxisZeile(name, s)}.</p>
      )}
      <section className="card">
        <h2 className="font-semibold text-slate-900">So sehen es Ihre Patienten</h2>
        <PraxisFuss name={name} stammdaten={practice?.stammdaten} className="mt-3 !text-left" />
      </section>
    </div>
  );
}
