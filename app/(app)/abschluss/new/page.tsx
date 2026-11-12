import { abschlussWort } from "@/lib/fachprofile";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePrices } from "@/lib/proposals";
import { TreatmentWrapUp } from "@/components/TreatmentWrapUp";
import { resolveMed } from "@/lib/practiceMed";
import { loadAnamnesis } from "@/lib/anamnesisView";

export default async function NewWrapUpPage({ searchParams }: { searchParams: { patientId?: string; q?: string } }) {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;

  const [patient, practice] = await Promise.all([
    searchParams.patientId
      ? prisma.patient.findFirst({ where: { id: searchParams.patientId, practiceId } })
      : null,
    prisma.practice.findUnique({
      where: { id: practiceId },
      select: { name: true, gozPunktwertCent: true, bemaPunktwertCent: true, proposalPrices: true, specialty: true, medPrices: true, customOffers: true },
    }),
  ]);

  if (!patient) {
    // Bei vielen Patienten: Suche statt Komplettliste; ohne Suche die zuletzt angelegten.
    const q = (searchParams.q ?? "").trim().slice(0, 60);
    const words = q.replace(",", " ").split(/\s+/).filter(Boolean);
    const patients = await prisma.patient.findMany({
      where: {
        practiceId,
        AND: words.map((w) => ({ OR: [{ firstName: { contains: w, mode: "insensitive" as const } }, { lastName: { contains: w, mode: "insensitive" as const } }] })),
      },
      orderBy: q ? [{ lastName: "asc" }, { firstName: "asc" }] : { createdAt: "desc" },
      take: 30,
      select: { id: true, firstName: true, lastName: true, birthDate: true },
    });
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 font-display text-3xl text-slate-900">{abschlussWort(practice?.specialty)} abschließen</h1>
        <p className="mb-6 text-sm text-slate-500">
          Für welchen Patienten? Schneller geht es direkt aus Ihrer Praxissoftware (Einstellungen → Praxissoftware).
        </p>
        <form action="/abschluss/new" className="mb-4 flex gap-2" role="search">
          <input name="q" defaultValue={q} className="input" placeholder="Name suchen" aria-label="Patient suchen" autoFocus />
          <button className="btn-secondary">Suchen</button>
        </form>
        {!q && patients.length > 0 && <p className="mb-2 text-xs text-slate-500">Zuletzt angelegt:</p>}
        {patients.length === 0 ? (
          <div className="card text-sm text-slate-500">
            {q ? "Kein Patient gefunden. " : "Noch keine Patienten. "} <Link href="/patients/new" className="font-medium text-brand-600 hover:underline">Patient anlegen</Link>
          </div>
        ) : (
          <div className="card divide-y divide-slate-100 p-0">
            {patients.map((p) => (
              <Link key={p.id} href={`/abschluss/new?patientId=${p.id}`} className="block px-6 py-3 hover:bg-slate-50">
                {p.lastName}, {p.firstName}
                {p.birthDate && <span className="ml-2 text-sm text-slate-500">geb. {p.birthDate.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" })}</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const anamnesis = await loadAnamnesis(practiceId, patient.id);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl text-slate-900">{abschlussWort(practice?.specialty)} abschließen</h1>
      <p className="mb-6 text-sm text-slate-500">
        {patient.firstName} {patient.lastName} · Leistungen prüfen, optional Befunde anklicken, einmal abschließen.
        Bericht, Vorschlag, Patientenschreiben und To-dos entstehen automatisch.
      </p>
      <div>
        <TreatmentWrapUp
          {...resolveMed(practice ?? {})}
          anamnesis={anamnesis}
          patient={{
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            insuranceType: patient.insuranceType,
            birthDate: patient.birthDate?.toISOString() ?? null,
            geschlecht: patient.geschlecht,
          }}
          practicePunktwerte={{
            gozPunktwertCent: practice?.gozPunktwertCent ?? null,
            bemaPunktwertCent: practice?.bemaPunktwertCent ?? null,
          }}
          prices={resolvePrices(practice?.proposalPrices)}
          practiceName={practice?.name ?? "Ihre Zahnarztpraxis"}
          basePath="/abschluss"
        />
      </div>
    </div>
  );
}
