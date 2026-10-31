import type { Metadata } from "next";
import Link from "next/link";
import { RATGEBER } from "@/lib/ratgeber";

export const metadata: Metadata = {
  title: "Ratgeber für Zahnarztpraxen – Sorrida",
  description: "Festzuschuss 2027, Heil- und Kostenplan, Mehrkostenvereinbarung: kurz erklärt für Praxisteams.",
};

export default function RatgeberIndex() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/sorrida-mark.svg" alt="" className="h-10 w-auto" />
        <span className="tracking-[0.2em]">SORRIDA</span>
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Ratgeber für Praxisteams</h1>
      <p className="mt-3 text-slate-600">
        Kurze, sachliche Erklärungen zu Themen, über die Patienten am Empfang am häufigsten stolpern.
      </p>
      <ul className="mt-8 space-y-4">
        {RATGEBER.map((a) => (
          <li key={a.slug} className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-300">
            <Link href={`/ratgeber/${a.slug}`} className="block">
              <h2 className="font-semibold text-slate-900">{a.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{a.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
