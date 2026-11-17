import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { menueRechteVon } from "@/lib/permissions";
import { APP_RUNDGANG_START, appStationen } from "@/lib/rundgang";
import { FuehrungWiederKnopf } from "@/components/FuehrungWiederKnopf";

/** Unter „Frag Sorrida“: Rundgang durch die Hauptseiten neu starten; im Gastzugang auch die Führung wieder einblenden. */
export async function RundgangStart({ userId, practiceId }: { userId: string; practiceId: string }) {
  const [praxis, rechte] = await Promise.all([
    prisma.practice.findUnique({ where: { id: practiceId }, select: { isDemo: true } }),
    menueRechteVon(userId, practiceId),
  ]);
  const anzahl = appStationen({ rechte, personPl: "", abschluss: "" }).length;
  return (
    <section className="card mt-8" aria-labelledby="rundgang-start-titel" data-testid="rundgang-start">
      <h2 id="rundgang-start-titel" className="font-semibold text-slate-900">
        Rundgang durch Sorrida
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Die {anzahl} Hauptseiten der Reihe nach, jede mit einer kurzen Erklärung. Der Rundgang ändert nichts an Ihren Daten und lässt sich
        jederzeit beenden.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Link href={APP_RUNDGANG_START} className="btn btn-secondary" data-testid="rundgang-start-link">
          Rundgang starten
        </Link>
        {praxis?.isDemo && <FuehrungWiederKnopf className="ziel font-medium text-brand-700 underline" />}
      </div>
    </section>
  );
}
