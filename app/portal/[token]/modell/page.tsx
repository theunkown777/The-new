import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { isDental } from "@/lib/specialties";
import { GebissModell } from "@/components/modelle/GebissModell";
import { KoerperModell } from "@/components/modelle/KoerperModell";

export const metadata: Metadata = { title: "Ihr Modell", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Patientenansicht des Modells: Der Patient sieht die Stellen, die seine Praxis markiert hat,
// mit Hinweis und allgemeiner Erklärung. Zugang nur über den geheimen Patientenlink.
export default async function PortalModellPage({ params }: { params: { token: string } }) {
  const gueltig = /^[A-Za-z0-9_-]{20,128}$/.test(params.token);
  const gefunden = gueltig ? await prisma.patient.findUnique({
    where: { portalTokenHash: hashToken(params.token) },
    select: { firstName: true, portalExpiresAt: true, practice: { select: { name: true, specialty: true } }, modellMarkierungen: { select: { modell: true, teil: true, notiz: true }, orderBy: { createdAt: "asc" } } },
  }) : null;
  const patient = gefunden && gefunden.portalExpiresAt && gefunden.portalExpiresAt > new Date() ? gefunden : null;
  if (!patient) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center text-sm text-slate-600">
        <h1 className="text-base font-semibold text-slate-900">Link ungültig</h1>
        <p className="mt-2">Dieser Link ist nicht mehr gültig. Bitte fragen Sie in Ihrer Praxis nach einem neuen.</p>
      </main>
    );
  }
  const modell = isDental(patient.practice.specialty ?? "zahn") ? "gebiss" : "koerper";
  const marken = patient.modellMarkierungen.filter((m) => m.modell === modell).map((m) => ({ teil: m.teil, notiz: m.notiz }));
  return (
    <main className="min-h-screen bg-[#F5F2EE]" data-testid="portal-modell">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:pt-10">
        <p className="text-sm"><Link href={`/portal/${params.token}`} className="text-brand-700 hover:underline">← Zurück zur Übersicht</Link></p>
        <h1 className="mt-2 font-display text-2xl text-slate-900 sm:text-3xl">{modell === "gebiss" ? "Ihr Gebiss" : "Ihr Körper"} im Modell</h1>
        <p className="mt-1 text-sm text-slate-600">
          {marken.length
            ? `${patient.practice.name} hat ${marken.length === 1 ? "eine Stelle" : `${marken.length} Stellen`} für Sie markiert (orange). Tippen Sie darauf, um den Hinweis und die Erklärung zu lesen.`
            : "Tippen Sie auf eine Stelle, um die Erklärung zu lesen. Ihre Praxis kann hier Stellen für Sie markieren."}
        </p>
        <div className="mt-5">{modell === "gebiss" ? <GebissModell markierungen={marken} /> : <KoerperModell markierungen={marken} />}</div>
      </div>
    </main>
  );
}
