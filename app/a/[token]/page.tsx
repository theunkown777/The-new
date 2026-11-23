import { PraxisFussLaden } from "@/components/PraxisFussLaden";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { AnamnesisForm } from "@/components/AnamnesisForm";
import { AnamneseGeraet } from "@/components/AnamneseGeraet";
import { darfAufGeraetMerken } from "@/lib/meinePraxenSchutz";
import { pickPortalLang } from "@/lib/portalI18n";
import { anamneseProfilFuer } from "@/lib/anamnesis";
import { bogenGruppe, praxisKennzeichen } from "@/lib/praxisKennung";
import { PraxisBand } from "@/components/PraxisKennung";
import { fachText } from "@/lib/fachText";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Gesundheitsfragebogen",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  openGraph: { title: "Ihr Gesundheitsfragebogen", description: "In drei Minuten vor Ihrem Termin ausgefüllt.", images: [{ url: "/og/anamnese.png", width: 1200, height: 630 }] },
};

export default async function AnamnesisPage(props: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const params = await props.params;
  const form = /^[A-Za-z0-9_-]{20,128}$/.test(params.token)
    ? await prisma.anamnesisForm.findUnique({
        where: { tokenHash: hashToken(params.token) },
        include: { practice: { select: { name: true, specialty: true, stammdaten: true } }, patient: { select: { firstName: true, birthDate: true, geschlecht: true } } },
      })
    : null;
  if (!form || form.submittedAt || form.expiresAt < new Date()) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Dieser Link ist nicht mehr gültig</h1>
        <p className="mt-3 text-slate-600">{fachText("Der Bogen wurde schon abgeschickt oder der Link ist abgelaufen. Bitte fragen Sie in Ihrer Praxis nach.", form?.practice.specialty)}</p>
      </main>
    );
  }
  // Älterer Bogen ohne Fach: Beim ersten Öffnen das Fach festhalten, damit Anzeige und Prüfung zusammenpassen.
  const fach = form.fach ?? form.practice.specialty;
  if (!form.viewedAt || !form.fach) await prisma.anamnesisForm.update({ where: { id: form.id }, data: { viewedAt: form.viewedAt ?? new Date(), fach } });
  const profil = anamneseProfilFuer(fach, form.practice.specialty, form.patient);
  // Eigene Angaben mitnehmen (components/AnamneseGeraet.tsx): nur auf dem eigenen Gerät des Patienten, nie auf einem
  // Gerät der Praxis (entschieden nach den Namen der Cookies, wie bei „Meine Praxen“).
  const eigenesGeraet = darfAufGeraetMerken((await cookies()).getAll().map((c) => c.name));
  const lang = pickPortalLang((await props.searchParams).lang, (await headers()).get("accept-language"));
  return (
    <>
      {/* Farbstreifen, Praxisname, Fach und Ort (lib/praxisKennung.ts): Welche Praxis fragt, ist auf einen Blick klar. */}
      <PraxisBand k={praxisKennzeichen(form.practice)} breite="max-w-2xl" />
      {eigenesGeraet ? (
        <AnamneseGeraet token={params.token} practiceName={form.practice.name} firstName={form.patient.firstName} profil={profil} gruppe={bogenGruppe(profil.fach, form.practice.specialty)} lang={lang} />
      ) : (
        <AnamnesisForm token={params.token} practiceName={form.practice.name} firstName={form.patient.firstName} profil={profil} />
      )}
      <PraxisFussLaden practiceId={form.practiceId} className="mx-auto max-w-xl px-4 pb-10 pt-2" />
    </>
  );
}
