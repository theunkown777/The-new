import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePrices } from "@/lib/proposals";
import { ProposalPriceSettings } from "@/components/ProposalPriceSettings";
import { InstallmentSettings } from "@/components/InstallmentSettings";
import { resolveInstallments } from "@/lib/installments";

export default async function ProposalPricesPage() {
  const session = await getServerSession(authOptions);
  const practice = await prisma.practice.findUnique({
    where: { id: session!.user.practiceId },
    select: { proposalPrices: true, installments: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-3xl text-slate-900">Vorschlagspreise</h1>
      {session!.user.role !== "admin" && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Nur Admin-Konten der Praxis können diese Werte ändern. Sie sehen die aktuellen Werte
          hier nur lesend.
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
