import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { KoerperModell } from "@/components/modelle/KoerperModell";
import { FOKUS, type FokusId } from "@/lib/modelle/fokus";

export const metadata: Metadata = {
  title: "Körpermodell: Haut, Muskeln, Organe, Skelett und Nerven erklärt – Sorrida",
  description: "Interaktives Körpermodell aus echten anatomischen Daten: Punkt antippen, die Kamera fährt heran und die Erklärung öffnet sich. Haut abnehmen und Ebene für Ebene Muskeln, Organe, Skelett und Nerven ansehen.",
};

export default function KoerperPage({ searchParams }: { searchParams?: { fokus?: string } }) {
  const fokus = searchParams?.fokus && searchParams.fokus in FOKUS ? (searchParams.fokus as FokusId) : null;
  return (
    <PublicShell full>
      <p className="text-sm"><Link href="/anatomie" className="text-brand-700 hover:underline">← Alle Modelle</Link></p>
      <h1 className="mt-2 font-display text-3xl text-slate-900 sm:text-4xl">{fokus ? FOKUS[fokus].name : "Der Körper"}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        {fokus
          ? "Nur das Nötigste: Das Organ allein, aus echten anatomischen Daten. Über „Ganzer Mensch“ sehen Sie es im ganzen Körper."
          : "Ein Mensch aus echten anatomischen Daten. Tippen Sie auf einen Punkt: Die Kamera fährt heran und die Erklärung öffnet sich. Mit „Haut abnehmen“ sehen Sie das Skelett, danach Ebene für Ebene Muskeln, Organe und Nerven."}
      </p>
      <div className="mt-6"><KoerperModell fokus={fokus} /></div>
    </PublicShell>
  );
}
