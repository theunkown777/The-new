import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SPECIALTIES, specialty } from "@/lib/specialties";
import { PublicShell } from "@/components/PublicShell";

export function generateStaticParams() {
  return SPECIALTIES.map((s) => ({ id: s.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const s = specialty(params.id);
  if (!s) return {};
  return { title: `Sorrida für die ${s.kurz} – ${s.marketing.headline}`, description: `${s.marketing.problem} ${s.marketing.beispiel}` };
}

const euro = (n: number) => (n ? `${n.toLocaleString("de-DE")} €` : "–");

export default function SpecialtyPage({ params }: { params: { id: string } }) {
  const s = specialty(params.id);
  if (!s) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `Sorrida für ${s.name}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "de-DE",
    description: s.marketing.headline,
  };
  return (
    <PublicShell wide>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-sm font-medium text-brand-700">Sorrida für die {s.kurz}</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-900">{s.marketing.headline}</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600">{s.marketing.problem}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/demo?fach=${s.id}`} className="btn-primary">
          Gastzugang für die {s.kurz} öffnen
        </Link>
        <Link href="/#kontakt" className="btn-secondary">
          Pilotplatz anfragen
        </Link>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900">So sieht es Ihr Patient</h2>
        <p className="mt-1 text-slate-600">{s.marketing.beispiel} Beispielpreise, in den Einstellungen anpassbar.</p>
        <div className="mt-6 space-y-6">
          {s.anlaesse.map((a) => (
            <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-wide text-slate-500">{a.bereich}</p>
              <h3 className="font-semibold text-slate-900">
                {a.label}
                {a.nurAufWunsch && <span className="ml-2 text-xs font-normal text-slate-500">nur auf Wunsch des Patienten</span>}
              </h3>
              <ul className="mt-3 space-y-3">
                {a.options.map((o) => (
                  <li key={o.id} className={`rounded-xl border p-3 ${o.type === "kasse" ? "border-green-300 bg-green-50" : "border-slate-200"}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-slate-900">{o.name}</span>
                      <span className="text-sm tabular-nums text-slate-700">
                        {o.type === "kasse" ? (o.kasseAbAlter ? `Kasse ab ${o.kasseAbAlter} Jahren` : "Kassenleistung") : `Selbstzahler ca. ${euro(o.price)}`}
                      </span>
                    </div>
                    {o.benefits.length > 0 && <p className="mt-1 text-sm text-slate-600">{o.benefits.join(" · ")}</p>}
                    {o.kasseWenn && <p className="mt-1 text-sm text-green-800">Kasse zahlt: {o.kasseWenn}</p>}
                    {o.nutzen && <p className="mt-1 text-sm text-amber-800">Zum Nutzen: {o.nutzen}</p>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Was nach dem Gespräch automatisch entsteht</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-700">
            <li>Patienteninformation in Textform mit Kosten je Option (§ 630c Abs. 3 BGB)</li>
            <li>Patienten-Link mit QR-Code: Optionen auf dem Handy vergleichen, Rückmeldung an die Praxis</li>
            <li>To-do für die Rezeption: schriftliche IGeL-Vereinbarung vor der Leistung</li>
            <li>Digitaler Anamnesebogen vor dem Termin, Warnhinweise beim Gespräch</li>
            <li>Gemessene Annahmequote statt Bauchgefühl</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Regeln, an die Sorrida sich hält</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li><b>Schriftliche Vereinbarung</b> vor jeder Selbstzahlerleistung (§ 18 Abs. 8 BMV-Ä), Berechnung nach GOÄ.</li>
            <li><b>Kein Druck:</b> Sorrida empfiehlt keine IGeL von sich aus. Die Patienteninformation lädt ausdrücklich zur Bedenkzeit ein.</li>
            <li><b>Ehrlich zum Nutzen:</b> Wo kein Nutzen belegt ist, steht das beim Angebot.</li>
            <li><b>Kasse zuerst:</b> Wann die Kasse zahlt, steht bei jeder Leistung.</li>
          </ul>
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-brand-200 bg-brand-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Ein Preis, alles enthalten</h2>
        <p className="mt-1 text-slate-700">
          149 € im Monat für Einzelpraxen, 249 € für Praxen mit bis zu fünf Ärztinnen und Ärzten. Ohne Zähler, 30 Tage kostenlos, monatlich
          kündbar. Endpreise nach § 19 UStG.
        </p>
        <Link href={`/demo?fach=${s.id}`} className="btn-primary mt-4 inline-block">
          Jetzt ausprobieren
        </Link>
      </section>

      <section className="mt-10 text-sm">
        <h2 className="mb-2 font-semibold text-slate-900">Weitere Fachgebiete</h2>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          {SPECIALTIES.filter((x) => x.id !== s.id).map((x) => (
            <Link key={x.id} href={`/fachgebiete/${x.id}`} className="text-brand-600 hover:underline">
              {x.kurz}
            </Link>
          ))}
          <Link href="/" className="text-brand-600 hover:underline">Zahnarztpraxis</Link>
        </p>
      </section>
    </PublicShell>
  );
}
