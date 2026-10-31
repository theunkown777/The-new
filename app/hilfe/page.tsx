import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { SupportForm } from "@/components/SupportForm";

export const metadata: Metadata = {
  title: "Hilfe – Fachrichtung nicht gefunden | Sorrida",
  description: "Ihre Fachrichtung ist nicht dabei? Schreiben Sie uns. Wir richten Sorrida mit Ihnen ein, persönlich und kostenlos.",
};

const WEGE = [
  ["Sie schreiben uns", "Fachrichtung und kurz, was Sie anbieten. Zwei Minuten."],
  ["Wir melden uns", "Innerhalb eines Werktags, per Telefon oder E-Mail, wie Sie möchten."],
  ["Wir richten es ein", "Ihre Leistungen, Preise und Hinweise zur Kasse legen wir gemeinsam an."],
];

export default function HilfePage({ searchParams }: { searchParams: { fach?: string } }) {
  return (
    <PublicShell full>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <p className="text-sm font-semibold text-brand-700">Support</p>
          <h1 className="font-display mt-2 text-3xl leading-tight text-slate-900 sm:text-4xl">Sie finden Ihre Fachrichtung nicht? Hier ist Hilfe.</h1>
          <p className="mt-4 text-lg text-slate-600">
            Sorrida bringt für 30 Fachrichtungen fertige Anlässe mit. Für alle anderen richten wir es mit Ihnen ein: Kassenleistung zuerst,
            Patienten-Link, Patientenportal mit Zahlung und Analyse funktionieren in jedem Fach gleich.
          </p>
          <ol className="mt-8 space-y-4">
            {WEGE.map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 font-semibold text-white">{i + 1}</span>
                <span>
                  <span className="block font-semibold text-slate-900">{t}</span>
                  <span className="text-slate-600">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-8 rounded-2xl bg-white p-5 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Lieber selbst ausprobieren?</p>
            <p className="mt-1">
              Legen Sie Ihre Leistungen selbst an:{" "}
              <Link href="/fachgebiete/andere" className="font-medium text-brand-700 underline">So funktioniert Sorrida mit eigenen Leistungen</Link>.
            </p>
          </div>
        </div>
        <SupportForm defaultFach={searchParams.fach?.slice(0, 120)} />
      </div>
    </PublicShell>
  );
}
