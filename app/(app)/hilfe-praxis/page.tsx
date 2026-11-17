import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDental } from "@/lib/specialties";
import { kiHilfenStand } from "@/lib/kiHilfen";
import { menueRechteVon } from "@/lib/permissions";
import { abschlussWort, fachprofil } from "@/lib/fachprofile";
import { hinweisArt } from "@/lib/praxisKennung";
import { HilfePraxis } from "@/components/HilfePraxis";
import { RundgangStart } from "@/components/RundgangStart";

export const metadata = { title: "Frag Sorrida" };

export default async function HilfePraxisPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const [praxis, rechte] = await Promise.all([
    prisma.practice.findUnique({ where: { id: session.user.practiceId }, select: { specialty: true, kiHilfen: true } }),
    menueRechteVon(session.user.id, session.user.practiceId),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-3xl text-slate-900">Frag Sorrida</h1>
      <p className="mb-6 text-sm text-slate-500">
        Fragen zur Bedienung: Wo finde ich was, und wie geht es? Die Antworten kommen aus einer festen Sammlung von Hilfetexten. „Zeig mir wo“ führt zur
        Stelle und markiert sie. Den Chat „Frag Sorrida“ gibt es auch unten rechts auf jeder Seite. Den Rundgang durch die Hauptseiten starten Sie
        weiter unten.
      </p>
      <HilfePraxis
        fach={isDental(praxis?.specialty) ? "zahn" : "andere"}
        hinweisArt={hinweisArt(praxis?.specialty)}
        ki={kiHilfenStand(praxis?.kiHilfen).aktiv}
        rechte={rechte}
        personPl={fachprofil(praxis?.specialty).person.pl}
        abschluss={abschlussWort(praxis?.specialty)}
      />
      {/* Rundgang neu starten (components/RundgangStart.tsx) */}
      <RundgangStart userId={session.user.id} practiceId={session.user.practiceId} />
    </div>
  );
}
