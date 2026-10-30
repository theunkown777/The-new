import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

// Einlösen des Einmal-Tokens aus dem Sorrida-Connector. Der Token gehört zu
// genau einer Praxis; nur ein angemeldeter Nutzer derselben Praxis kann ihn
// einlösen, und nur einmal.
export default async function EmbedLaunchPage({ searchParams }: { searchParams: { t?: string } }) {
  const session = await getServerSession(authOptions);
  const raw = searchParams.t ?? "";
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(`/embed/launch?t=${raw}`)}`);

  const token = raw ? await prisma.launchToken.findUnique({ where: { tokenHash: hashToken(raw) } }) : null;
  const valid =
    token &&
    token.practiceId === session.user.practiceId &&
    !token.usedAt &&
    token.expiresAt > new Date();

  if (!valid) {
    return (
      <div className="card mx-auto max-w-md text-sm text-slate-600">
        <h1 className="mb-2 text-base font-semibold text-slate-900">Link abgelaufen</h1>
        Dieser Aufruf ist abgelaufen oder wurde schon verwendet. Bitte öffnen Sie Sorrida erneut über
        die Schaltfläche in Ihrer Praxissoftware.
      </div>
    );
  }

  // Bedingtes Update verhindert, dass zwei gleichzeitige Aufrufe denselben Token einlösen.
  const claimed = await prisma.launchToken.updateMany({
    where: { id: token.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) redirect("/embed/launch");

  redirect(`/embed/patient/${token.patientId}?view=${token.view}`);
}
