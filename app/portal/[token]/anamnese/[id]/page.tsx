import { PraxisFussLaden } from "@/components/PraxisFussLaden";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AnamnesisForm } from "@/components/AnamnesisForm";
import { AnamneseGeraet } from "@/components/AnamneseGeraet";
import { darfAufGeraetMerken } from "@/lib/meinePraxenSchutz";
import { pickPortalLang } from "@/lib/portalI18n";
import { bogenGruppe } from "@/lib/praxisKennung";
import { anamneseProfilFuer } from "@/lib/anamnesis";
import { portalPatient } from "@/lib/portalAuth";
import { PraxisBand } from "@/components/PraxisKennung";
import { portalKennung, portalSymbole } from "@/lib/portalKopf";

export const dynamic = "force-dynamic";
export async function generateMetadata(props: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const k = await portalKennung((await props.params).token);
  return { title: k ? `Anamnesebogen · ${k.name}` : "Anamnesebogen", icons: k ? portalSymbole(k) : undefined, robots: { index: false, follow: false }, referrer: "no-referrer" };
}

// Anamnesebogen im Patientenportal (statt eines eigenen Links).
export default async function PortalAnamnesis(props: { params: Promise<{ token: string; id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const params = await props.params;
  const patient = await portalPatient(params.token);
  const back = `/portal/${params.token}`;
  const form = patient
    ? await prisma.anamnesisForm.findFirst({
        where: { id: params.id, patientId: patient.id, submittedAt: null, expiresAt: { gt: new Date() } },
        include: { practice: { select: { name: true, specialty: true } }, patient: { select: { birthDate: true, geschlecht: true } } },
      })
    : null;
  if (!patient || !form) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Dieser Bogen ist nicht mehr offen</h1>
        <p className="mt-3 text-slate-600">Er wurde schon abgeschickt oder ist abgelaufen.</p>
        {patient && <a href={back} className="btn-primary mt-6 inline-block">Zurück zu Ihrem Behandlungsweg</a>}
      </main>
    );
  }
  // Älterer Bogen ohne Fach: Beim ersten Öffnen das Fach festhalten, damit Anzeige und Prüfung zusammenpassen.
  const fach = form.fach ?? form.practice.specialty;
  if (!form.viewedAt || !form.fach) await prisma.anamnesisForm.update({ where: { id: form.id }, data: { viewedAt: form.viewedAt ?? new Date(), fach } });
  const kennung = await portalKennung(params.token);
  const profil = anamneseProfilFuer(fach, form.practice.specialty, form.patient);
  const lang = pickPortalLang((await props.searchParams).lang, (await headers()).get("accept-language"));
  const formular = {
    token: params.token,
    postUrl: `/api/portal/${params.token}/anamnese/${form.id}`,
    backHref: lang === "de" ? back : `${back}?lang=${lang}`,
    practiceName: form.practice.name,
    firstName: patient.firstName,
    profil,
  };
  // Eigene Angaben mitnehmen (components/AnamneseGeraet.tsx): nur auf dem eigenen Gerät des Patienten.
  const eigenesGeraet = darfAufGeraetMerken((await cookies()).getAll().map((c) => c.name));
  return (
    <>
    {kennung && <PraxisBand k={kennung} breite="max-w-2xl" />}
    {eigenesGeraet ? (
      <AnamneseGeraet {...formular} gruppe={bogenGruppe(profil.fach, form.practice.specialty)} lang={lang} />
    ) : (
      <AnamnesisForm {...formular} />
    )}
    <PraxisFussLaden patientId={patient.id} className="mx-auto max-w-xl px-4 pb-10 pt-2" />
    </>
  );
}
