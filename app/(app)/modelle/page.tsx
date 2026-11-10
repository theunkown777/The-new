import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SPECIALTY_LABELS } from "@/lib/specialties";
import { ModellWahl } from "@/components/modelle/ModellWahl";

// Modelle für das Gespräch am Behandlungsstuhl oder im Sprechzimmer: zeigen und erklären.
// Zuerst das Modell des eigenen Fachs, die übrigen daneben. Markiert wird beim einzelnen
// Patienten (Patientenseite → „Am Modell zeigen“).
export default async function ModellePage() {
  const session = await getServerSession(authOptions);
  const praxis = await prisma.practice.findUnique({ where: { id: session!.user.practiceId }, select: { specialty: true } });
  const fach = praxis?.specialty ?? "zahn";
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-3xl text-slate-900">Modelle</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Zeigen Sie am Bildschirm, wo das Problem liegt und was gemacht wird. Das Modell für {SPECIALTY_LABELS[fach] ?? "Ihr Fach"} steht vorn.
        Um eine Stelle für einen Patienten zu markieren, öffnen Sie den Patienten und gehen zu „Am Modell zeigen“.
      </p>
      <div className="mt-5"><ModellWahl fach={fach} alle /></div>
    </div>
  );
}
