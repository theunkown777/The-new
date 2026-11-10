import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDental } from "@/lib/specialties";
import { GebissModell } from "@/components/modelle/GebissModell";
import { KoerperModell } from "@/components/modelle/KoerperModell";

// Modelle für das Gespräch am Behandlungsstuhl oder im Sprechzimmer: zeigen und erklären.
// Markiert wird beim einzelnen Patienten (Patientenseite → „Am Modell zeigen“).
export default async function ModellePage({ searchParams }: { searchParams: { modell?: string } }) {
  const session = await getServerSession(authOptions);
  const praxis = await prisma.practice.findUnique({ where: { id: session!.user.practiceId }, select: { specialty: true } });
  const standard = isDental(praxis?.specialty ?? "zahn") ? "gebiss" : "koerper";
  const modell = searchParams.modell === "gebiss" || searchParams.modell === "koerper" ? searchParams.modell : standard;
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-slate-900">Modelle</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Zeigen Sie am Bildschirm, wo das Problem liegt und was gemacht wird. Um eine Stelle für einen Patienten zu markieren, öffnen Sie den
            Patienten und gehen zu „Am Modell zeigen“.
          </p>
        </div>
        <div className="inline-flex rounded-full bg-slate-100 p-1 text-sm" role="tablist" aria-label="Modell">
          {([["gebiss", "Gebiss"], ["koerper", "Körper"]] as const).map(([id, name]) => (
            <Link key={id} href={`/modelle?modell=${id}`} role="tab" aria-selected={modell === id} className={`rounded-full px-4 py-1.5 ${modell === id ? "bg-white font-medium text-brand-700 shadow-sm" : "text-slate-600"}`} data-testid={`modelle-${id}`}>{name}</Link>
          ))}
        </div>
      </div>
      <div className="mt-5">{modell === "gebiss" ? <GebissModell /> : <KoerperModell />}</div>
    </div>
  );
}
