import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { GebissModell } from "@/components/modelle/GebissModell";

export const metadata: Metadata = {
  title: "Gebiss-Modell: Zähne, Zahnaufbau und Instrumente erklärt – Sorrida",
  description: "Interaktives Gebiss: alle 32 Zähne mit Nummer und Aufgabe, der Aufbau eines Zahns im Querschnitt und die Instrumente der Zahnarztpraxis, verständlich erklärt.",
};

export default function GebissPage() {
  return (
    <PublicShell full>
      <p className="text-sm"><Link href="/anatomie" className="text-brand-700 hover:underline">← Alle Modelle</Link></p>
      <h1 className="mt-2 font-display text-3xl text-slate-900 sm:text-4xl">Das Gebiss</h1>
      <p className="mt-2 max-w-2xl text-slate-600">Bleibende Zähne und Milchzähne, der Aufbau eines Zahns und die Instrumente, mit denen in der Zahnarztpraxis gearbeitet wird. Tippen Sie an, was Sie interessiert.</p>
      <div className="mt-6"><GebissModell /></div>
    </PublicShell>
  );
}
