import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StandorteVerwalten } from "@/components/StandorteVerwalten";

export const dynamic = "force-dynamic";
export const metadata = { title: "Standorte" };

export default async function StandortePage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "admin") {
    return <p className="card mx-auto max-w-xl text-sm text-slate-600">Standorte verwaltet die Praxisleitung.</p>;
  }
  const standorte = await prisma.location.findMany({
    where: { practiceId: session.user.practiceId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { appointments: true } } },
  });
  return (
    <div className="mx-auto max-w-3xl space-y-4" data-testid="standorte">
      <Link href="/settings" className="ziel text-sm text-slate-500 hover:text-brand-700">← Einstellungen</Link>
      <h1 className="font-display text-3xl text-slate-900">Standorte</h1>
      <p className="text-sm text-slate-600">
        Hauptpraxis und Zweigpraxen mit Behandlungsplätzen und Sprechzeit. Daraus rechnet Sorrida die Auslastung je Standort; Termine lassen sich nach Standort filtern.
      </p>
      <StandorteVerwalten standorte={standorte.map((s) => ({ id: s.id, name: s.name, address: s.address, rooms: s.rooms, minutesPerDay: s.minutesPerDay, termine: s._count.appointments }))} />
    </div>
  );
}
