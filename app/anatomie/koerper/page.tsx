import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { KoerperModell } from "@/components/modelle/KoerperModell";

export const metadata: Metadata = {
  title: "Körpermodell: Organe, Knochen, Muskeln und Nerven erklärt – Sorrida",
  description: "Interaktives Körpermodell von vorn und hinten: Organe, Knochen, Muskeln, Sehnen, Gelenke und Nerven antippen, heranzoomen und verständlich erklärt bekommen.",
};

export default function KoerperPage() {
  return (
    <PublicShell full>
      <p className="text-sm"><Link href="/anatomie" className="text-brand-700 hover:underline">← Alle Modelle</Link></p>
      <h1 className="mt-2 font-display text-3xl text-slate-900 sm:text-4xl">Der Körper</h1>
      <p className="mt-2 max-w-2xl text-slate-600">Organe, Knochen, Muskeln, Sehnen und Nerven von vorn und von hinten. Blenden Sie die Ebenen ein und aus und tippen Sie auf die Stelle, die Sie interessiert.</p>
      <div className="mt-6"><KoerperModell startEbenen={["knochen", "organe"]} /></div>
    </PublicShell>
  );
}
