import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";

export default async function SecuritySettingsPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { totpEnabled: true },
  });

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 font-display text-3xl text-slate-900">Sicherheit</h1>
      <TwoFactorSettings initialEnabled={user?.totpEnabled ?? false} />
    </div>
  );
}
