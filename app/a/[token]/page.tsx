import { PraxisFussLaden } from "@/components/PraxisFussLaden";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { AnamnesisForm } from "@/components/AnamnesisForm";
import { anamneseProfilFuer } from "@/lib/anamnesis";
import { praxisKennzeichen } from "@/lib/praxisKennung";
import { PraxisBand } from "@/components/PraxisKennung";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Anamnesebogen",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  openGraph: { title: "Ihr Anamnesebogen", description: "In drei Minuten vor Ihrem Termin ausgefüllt.", images: [{ url: "/og/anamnese.png", width: 1200, height: 630 }] },
};

export default async function AnamnesisPage(props: { params: Promise<{ token: string }> }) {
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
        <p className="mt-3 text-slate-600">Der Bogen wurde schon abgeschickt oder der Link ist abgelaufen. Bitte fragen Sie in Ihrer Praxis nach.</p>
      </main>
    );
  }
  // Älterer Bogen ohne Fach: Beim ersten Öffnen das Fach festhalten, damit Anzeige und Prüfung zusammenpassen.
  const fach = form.fach ?? form.practice.specialty;
  if (!form.viewedAt || !form.fach) await prisma.anamnesisForm.update({ where: { id: form.id }, data: { viewedAt: form.viewedAt ?? new Date(), fach } });
  return (
    <>
      {/* Farbstreifen, Praxisname, Fach und Ort (lib/praxisKennung.ts): Welche Praxis fragt, ist auf einen Blick klar. */}
      <PraxisBand k={praxisKennzeichen(form.practice)} breite="max-w-2xl" />
      <AnamnesisForm token={params.token} practiceName={form.practice.name} firstName={form.patient.firstName} profil={anamneseProfilFuer(fach, form.practice.specialty, form.patient)} />
      <PraxisFussLaden practiceId={form.practiceId} className="mx-auto max-w-xl px-4 pb-10 pt-2" />
    </>
  );
}
