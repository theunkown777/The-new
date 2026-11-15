import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { PilotProgram } from "@/components/PilotProgram";
import { RegisterForm } from "@/components/RegisterForm";
import { registrierungOffen } from "@/lib/registrierung";
import { DENTAL_ID, SPECIALTIES, isTherapie } from "@/lib/specialties";

export const metadata: Metadata = { title: "Praxis registrieren – Sorrida", robots: { index: false, follow: false } };
// Der Schalter REGISTRIERUNG_OFFEN wird bei jedem Aufruf gelesen, nicht beim Bauen.
export const dynamic = "force-dynamic";

// Registrierung. Standard: geschlossen (lib/registrierung.ts). Dann steht hier eine ruhige Seite mit dem
// Anfrageformular für Pilotpraxen. Nur mit REGISTRIERUNG_OFFEN=1 erscheint das Formular mit den Pflicht-Bestätigungen.
export default async function RegisterPage(props: { searchParams: Promise<{ fach?: string }> }) {
  if (registrierungOffen()) return <RegisterForm />;

  const { fach } = await props.searchParams;
  const s = SPECIALTIES.find((x) => x.id === fach);
  const dental = fach === DENTAL_ID;
  return (
    <PublicShell wide>
      <div data-testid="register-geschlossen">
        <p className="text-sm font-semibold text-brand-700">Zugang</p>
        <h1 className="font-display mt-2 text-3xl leading-tight text-slate-900 sm:text-4xl">Sorrida startet mit ersten Pilotpraxen</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Ein eigenes Konto können Sie zurzeit noch nicht selbst anlegen. Wir nehmen Praxen einzeln auf, mit Vertrag und persönlicher
          Einrichtung. Fragen Sie einen Pilotplatz an, wir melden uns bei Ihnen.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <a href="#pilot" className="btn-primary" data-testid="register-pilot">
            Pilotplatz anfragen
          </a>
          <Link href={s || dental ? `/demo?fach=${fach}` : "/demo"} className="text-brand-700 underline" data-testid="register-demo">
            Demo ansehen
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Sie haben schon ein Konto?{" "}
          <Link href="/login" className="underline">
            Anmelden
          </Link>
        </p>
      </div>
      <PilotProgram fach={dental ? DENTAL_ID : s?.id ?? "andere"} kurz={dental ? "Zahnarztpraxis" : s?.kurz ?? "Ihre Praxis"} dental={dental} therapie={s ? isTherapie(s) : false} />
    </PublicShell>
  );
}
