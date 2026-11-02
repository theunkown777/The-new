import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BillingSettings } from "@/components/BillingSettings";

export default async function BillingSettingsPage() {
  const session = await getServerSession(authOptions);
  const practice = await prisma.practice.findUnique({
    where: { id: session!.user.practiceId },
    select: { gozPunktwertCent: true, bemaPunktwertCent: true },
  });

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 font-display text-3xl text-slate-900">Abrechnung</h1>
      {session!.user.role !== "admin" && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Nur Admin-Konten der Praxis können diese Werte ändern. Sie sehen die aktuellen Werte
          hier nur lesend.
        </p>
      )}
      <BillingSettings
        initialGozPunktwertCent={practice?.gozPunktwertCent ?? null}
        initialBemaPunktwertCent={practice?.bemaPunktwertCent ?? null}
        readOnly={session!.user.role !== "admin"}
      />
    </div>
  );
}
