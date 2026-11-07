import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveMed } from "@/lib/practiceMed";
import { SpecialtySettings } from "@/components/SpecialtySettings";
import { kostenHinweis, leistungenFuerFach } from "@/lib/leistungskatalog";

export default async function SpecialtySettingsPage() {
  const session = await getServerSession(authOptions);
  const practice = await prisma.practice.findUnique({
    where: { id: session!.user.practiceId },
    select: { specialty: true, medPrices: true, customOffers: true },
  });
  const { fach, med } = resolveMed(practice ?? {});
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-slate-900">Fachgebiet und Leistungen</h1>
      <p className="mb-6 text-sm text-slate-500">
        Sorrida passt Behandlungsvorschläge, Patientenschreiben und Patienten-Link an Ihr Fachgebiet an. Eigene Leistungen ergänzen oder
        ersetzen die mitgelieferten Beispiele.
      </p>
      <SpecialtySettings initial={{ specialty: fach, medPrices: med.prices ?? {}, customOffers: med.custom ?? [] }} readOnly={session!.user.role !== "admin"}
        katalog={leistungenFuerFach(fach).map((l) => ({
          name: l.name,
          kategorie: l.kategorie,
          kasse: l.kostentraeger_code === "GKV" || l.kostentraeger_code === "GKV_EA",
          kasseWenn: l.kostentraeger_code === "IND" ? kostenHinweis(l) : l.hinweis || undefined,
        }))}
      />
    </div>
  );
}
