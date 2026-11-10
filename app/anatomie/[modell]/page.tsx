import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { SchnittModellAnsicht } from "@/components/modelle/SchnittModellAnsicht";
import { SCHNITTMODELLE, type SchnittId } from "@/lib/modelle/schnitt";

// Auge, Ohr und Haut im Schnitt (Gebiss und Körper haben eigene Seiten).
export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(SCHNITTMODELLE).map((modell) => ({ modell }));

export function generateMetadata({ params }: { params: { modell: string } }): Metadata {
  const m = SCHNITTMODELLE[params.modell as SchnittId];
  if (!m) return {};
  return { title: `${m.titel} im Modell: Aufbau verständlich erklärt – Sorrida`, description: `Interaktives Modell: ${m.titel} im Schnitt mit ${m.teile.length} Teilen. Antippen, heranzoomen und lesen, was es ist und welche Beschwerden dort häufig sind.` };
}

export default function SchnittPage({ params }: { params: { modell: string } }) {
  const m = SCHNITTMODELLE[params.modell as SchnittId];
  if (!m) notFound();
  return (
    <PublicShell full>
      <p className="text-sm"><Link href="/anatomie" className="text-brand-700 hover:underline">← Alle Modelle</Link></p>
      <h1 className="mt-2 font-display text-3xl text-slate-900 sm:text-4xl">{m.titel}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">{m.teile.length} Teile im Schnitt. Tippen Sie an, was Sie interessiert.</p>
      <div className="mt-6"><SchnittModellAnsicht modell={m.id} /></div>
    </PublicShell>
  );
}
