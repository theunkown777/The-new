import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { darfSeite } from "@/lib/einstellungsSeiten";
import { nurMitEinstellungen } from "@/lib/permissions";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePrices } from "@/lib/proposals";
import { ProposalPriceSettings } from "@/components/ProposalPriceSettings";
import { InstallmentSettings } from "@/components/InstallmentSettings";
import { resolveInstallments } from "@/lib/installments";

import { praxisText } from "@/lib/praxisFach";
export default async function ProposalPricesPage() {
  const ft = await praxisText();
  await nurMitEinstellungen();
  const session = await getServerSession(authOptions);
  const practice = await prisma.practice.findUnique({
    where: { id: session!.user.practiceId },
    select: { proposalPrices: true, installments: true, specialty: true },
  });
  // Preise der Zahn-Vorschläge (Kronen, Füllungen …); andere Fächer pflegen Preise unter Fachgebiet und Leistungen.
  if (!darfSeite(practice?.specialty, "proposals")) redirect("/settings/fachgebiet");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-3xl text-slate-900">Vorschlagspreise</h1>
      {session!.user.role !== "admin" && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {ft("Nur Admin-Konten der Praxis können diese Werte ändern. Sie sehen die aktuellen Werte hier nur lesend.")}
        </p>
      )}
      <ProposalPriceSettings
        initialPrices={resolvePrices(practice?.proposalPrices)}
        isCustom={practice?.proposalPrices != null}
        readOnly={session!.user.role !== "admin"}
      />
      <div className="mt-6">
        <InstallmentSettings initial={resolveInstallments(practice?.installments)} readOnly={session!.user.role !== "admin"} />
      </div>
    </div>
  );
}
