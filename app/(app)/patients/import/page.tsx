import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { kontoDarf } from "@/lib/permissions";
import { fachprofil } from "@/lib/fachprofile";
import { PatientenImport } from "@/components/PatientenImport";
import { MAX_ZEILEN } from "@/lib/patientenImport";

import { praxisText } from "@/lib/praxisFach";
export const dynamic = "force-dynamic";
export const metadata = { title: "Liste einlesen" };

export default async function PatientenImportPage() {
  const ft = await praxisText();
  const session = await getServerSession(authOptions);
  const practiceId = session!.user.practiceId;
  const [darf, practice] = await Promise.all([
    kontoDarf(session!.user.id, "patienten.import", practiceId),
    prisma.practice.findUnique({ where: { id: practiceId }, select: { isDemo: true, specialty: true } }),
  ]);
  const P = fachprofil(practice?.specialty).person;

  return (
    <div className="mx-auto max-w-4xl space-y-5" data-testid="patienten-import-seite">
      <Link href="/patients" className="ziel text-sm text-slate-500 hover:text-brand-700">← {P.pl}</Link>
      <div>
        <h1 className="font-display text-3xl text-slate-900">Liste einlesen</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          {ft("Übernehmen Sie Ihre Patienten aus Ihrer bisherigen Software:")} Liste dort als CSV-Datei speichern und hier hochladen. Sorrida erkennt die Spalten, zeigt Ihnen eine Vorschau und speichert erst nach Ihrem Klick.
          Höchstens {MAX_ZEILEN.toLocaleString("de-DE")} Zeilen je Datei.
        </p>
      </div>
      {!darf ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" data-testid="import-kein-recht">{ft("Listen einlesen kann nur die Praxisleitung (Geschäftsführung).")}</p>
      ) : (
        <>
          {practice?.isDemo && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="note" data-testid="import-demo-hinweis">
              <b>Gastzugang:</b> Bitte keine echten Daten in die Demo einlesen. Nehmen Sie zum Ausprobieren eine Liste mit erfundenen Namen. Die Demo wird nach Ablauf gelöscht.
            </p>
          )}
          <PatientenImport personPl={P.pl} personSg={P.sg} demo={!!practice?.isDemo} />
        </>
      )}
    </div>
  );
}
