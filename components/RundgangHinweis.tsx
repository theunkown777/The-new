import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { menueRechteVon } from "@/lib/permissions";
import { Hinweis } from "@/components/Hinweis";
import { APP_RUNDGANG_START, appStationen, rundgangHinweisZeigen } from "@/lib/rundgang";

/**
 * Übersicht: Angebot eines Rundgangs für neue Konten (jünger als 30 Tage, keine Demo-Praxis). Über den Hinweis
 * zuklappbar; zugeklappt merkt ihn HinweisMerker wie jeden anderen Erklärtext.
 */
export async function RundgangHinweis({ userId, practiceId }: { userId: string; practiceId: string }) {
  const [konto, praxis, rechte] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    prisma.practice.findUnique({ where: { id: practiceId }, select: { isDemo: true } }),
    menueRechteVon(userId, practiceId),
  ]);
  if (!rundgangHinweisZeigen(konto?.createdAt, praxis?.isDemo ?? true)) return null;
  const anzahl = appStationen({ rechte, personPl: "", abschluss: "" }).length;
  return (
    <Hinweis id="rundgang" titel={`Sorrida in ${anzahl} Stationen`} className="mb-6" testid="rundgang-hinweis">
      <p className="text-sm text-slate-700">
        Ein kurzer Rundgang durch die Hauptseiten: was es dort gibt und wofür. Er ändert nichts an Ihren Daten. Sie können ihn jederzeit
        beenden und unter „Frag Sorrida“ neu starten.
      </p>
      <Link href={APP_RUNDGANG_START} className="btn btn-secondary mt-3" data-testid="rundgang-hinweis-start">
        Rundgang starten
      </Link>
    </Hinweis>
  );
}
