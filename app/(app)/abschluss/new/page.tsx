import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePrices } from "@/lib/proposals";
import { TreatmentWrapUp } from "@/components/TreatmentWrapUp";

export default async function NewWrapUpPage({ searchParams }: { searchParams: { patientId?: string } }) {
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;

  const [patient, practice] = await Promise.all([
    searchParams.patientId
      ? prisma.patient.findFirst({ where: { id: searchParams.patientId, practiceId } })
      : null,
    prisma.practice.findUnique({
      where: { id: practiceId },
      select: { name: true, gozPunktwertCent: true, bemaPunktwertCent: true, proposalPrices: true },
    }),
  ]);

  if (!patient) {
    const patients = await prisma.patient.findMany({
      where: { practiceId },
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    });
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Behandlung abschließen</h1>
        <p className="mb-6 text-sm text-slate-500">
          Für welchen Patienten? Schneller geht es direkt aus Ihrer Praxissoftware (Einstellungen → Praxissoftware).
        </p>
        {patients.length === 0 ? (
          <div className="card text-sm text-slate-500">
            Noch keine Patienten. <Link href="/patients/new" className="font-medium text-brand-600 hover:underline">Patient anlegen</Link>
          </div>
        ) : (
          <div className="card divide-y divide-slate-100 p-0">
            {patients.map((p) => (
              <Link key={p.id} href={`/abschluss/new?patientId=${p.id}`} className="block px-6 py-3 hover:bg-slate-50">
                {p.lastName}, {p.firstName}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Behandlung abschließen</h1>
      <p className="mb-6 text-sm text-slate-500">
        {patient.firstName} {patient.lastName} · Leistungen prüfen, optional Befunde anklicken, einmal abschließen.
        Bericht, Vorschlag, Patientenschreiben und To-dos entstehen automatisch.
      </p>
      <div>
        <TreatmentWrapUp
          patient={{
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            insuranceType: patient.insuranceType,
            birthDate: patient.birthDate?.toISOString() ?? null,
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
