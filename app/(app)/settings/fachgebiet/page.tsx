import Link from "next/link";
import { getServerSession } from "next-auth";
import { nurMitEinstellungen } from "@/lib/permissions";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveMed } from "@/lib/practiceMed";
import { SpecialtySettings } from "@/components/SpecialtySettings";
import { InstallmentSettings } from "@/components/InstallmentSettings";
import { resolveInstallments } from "@/lib/installments";
import { ratenzahlungAuf } from "@/lib/einstellungsSeiten";
import { FRUEHERE_KATEGORIEN, katalogVorschlag, leistungenFuerFach } from "@/lib/leistungskatalog";

import { praxisText } from "@/lib/praxisFach";
export default async function SpecialtySettingsPage() {
  const ft = await praxisText();
  await nurMitEinstellungen();
  const session = await getServerSession(authOptions);
  const practice = await prisma.practice.findUnique({
    where: { id: session!.user.practiceId },
    select: { specialty: true, medPrices: true, customOffers: true, installments: true },
  });
  const { fach, med } = resolveMed(practice ?? {});
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-slate-900">Fachgebiet und Leistungen</h1>
      <p className="mb-6 text-sm text-slate-500">
        {ft("Sorrida passt Behandlungsvorschläge, Patientenschreiben und Patienten-Link an Ihr Fachgebiet an. Eigene Leistungen ergänzen oder ersetzen die mitgelieferten Beispiele.")}
      </p>
      <p className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700" data-testid="preisliste-link">
        Sie haben schon eine Preisliste?{" "}
        <Link href="/settings/fachgebiet/preisliste" className="font-medium text-brand-700 underline">Preisliste einlesen</Link>
        : Text einfügen oder Datei wählen, prüfen, bestätigen.
      </p>
      <SpecialtySettings initial={{ specialty: fach, medPrices: med.prices ?? {}, customOffers: med.custom ?? [] }} readOnly={session!.user.role !== "admin"}
        katalog={leistungenFuerFach(fach).map(katalogVorschlag)}
        kategorienFrueher={FRUEHERE_KATEGORIEN}
      />
      {/* Ratenzahlung gilt für jedes Fach; in der Zahnmedizin steht sie bei den Vorschlagspreisen. */}
      {ratenzahlungAuf(fach) === "/settings/fachgebiet" && (
        <div className="mt-6">
          <InstallmentSettings initial={resolveInstallments(practice?.installments)} readOnly={session!.user.role !== "admin"} />
        </div>
      )}
    </div>
  );
}
