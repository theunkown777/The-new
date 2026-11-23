import Link from "next/link";
import { Hinweis } from "@/components/Hinweis";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nurMitEinstellungen } from "@/lib/permissions";
import { BewertungsLinkForm } from "@/components/BewertungsLinkForm";
import { AUSWERTUNG_MINDESTENS, RUECKMELDUNG_TAGE } from "@/lib/rueckmeldung";

import { praxisText } from "@/lib/praxisFach";
export const dynamic = "force-dynamic";
export const metadata = { title: "Rückmeldung nach dem Termin" };

// Eine Frage nach dem Termin im Patientenportal und der Link für den neutralen Bewertungs-Hinweis (lib/rueckmeldung.ts).
export default async function RueckmeldungEinstellungen() {
  const ft = await praxisText();
  await nurMitEinstellungen();
  const session = await getServerSession(authOptions);
  const admin = session!.user.role === "admin";
  const practice = await prisma.practice.findUnique({ where: { id: session!.user.practiceId }, select: { googleProfilUrl: true } });
  return (
    <div className="mx-auto max-w-3xl space-y-5" data-testid="einstellungen-rueckmeldung">
      <div>
        <Link href="/settings" className="text-sm text-brand-700 underline">← Einstellungen</Link>
        <h1 className="mt-2 font-display text-3xl text-slate-900">Rückmeldung nach dem Termin</h1>
        <p className="mt-1 text-sm text-slate-600">
          {ft("Nach einem Termin mit dem Status „erschienen“ sehen Ihre Patienten im Portal ")}{RUECKMELDUNG_TAGE} Tage lang eine Frage: „Wie zufrieden waren Sie mit
          Ihrem Besuch?“, mit fünf Stufen und einem freiwilligen Satz. Sorrida schickt dazu keine Nachricht.
        </p>
      </div>
      <Hinweis id="rueckmeldung-sehen" titel="Was Sie sehen" ebene={2} className="text-sm text-slate-600" testid="hinweis-rueckmeldung-sehen">
        <ul className="list-disc space-y-1 ps-5">
          <li>In der <Link href="/analyse#rueckmeldungen" className="text-brand-700 underline">Analyse</Link>: Durchschnitt, Verteilung und die Texte der letzten 90 Tage, mit Datum und ohne Namen.</li>
          <li>Erst ab {AUSWERTUNG_MINDESTENS} {ft("Antworten, damit einzelne Antworten nicht einzelnen Patienten zugeordnet werden.")}</li>
          <li>Keine Antwort erscheint im Eingang oder an der Akte.</li>
        </ul>
      </Hinweis>
      <section className="card text-sm text-slate-600">
        <h2 className="font-semibold text-slate-900">Hinweis auf die öffentliche Bewertung</h2>
        <p className="mt-2">
          {ft("Hinterlegen Sie hier den Link zu Ihrem Google-Profil, erscheint nach dem Absenden der Satz „Wenn Sie mögen, können Sie Ihre Praxis auch öffentlich bewerten.“ mit dem Link. Er erscheint bei allen Patienten, gleich welche Stufe sie gewählt haben. Eine Auswahl nach zufrieden oder unzufrieden und eine Belohnung für Bewertungen gibt es nicht; beides wäre unzulässig.")}
        </p>
      </section>
      {admin ? (
        <BewertungsLinkForm start={practice?.googleProfilUrl ?? ""} />
      ) : (
        <p className="card text-sm text-slate-600" data-testid="bewertungslink-nur-leitung">{ft("Den Link ändert die Praxisleitung. ")}{practice?.googleProfilUrl ? "Es ist ein Link hinterlegt." : "Es ist kein Link hinterlegt."}</p>
      )}
    </div>
  );
}
