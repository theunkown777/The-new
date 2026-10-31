import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SPECIALTIES, isTherapie, specialty } from "@/lib/specialties";
import { PublicShell } from "@/components/PublicShell";
import { PilotProgram } from "@/components/PilotProgram";
import { Entlastung } from "@/components/Entlastung";
import { PraxisFaq } from "@/components/PraxisFaq";

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
  const therapie = isTherapie(s);
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
      <p className="text-sm font-medium text-brand-700">
        Sorrida für die {s.kurz} ·{" "}
        <Link href="/#fach" className="font-normal text-slate-500 underline">
          Fach wechseln
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-900">{s.marketing.headline}</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600">{s.marketing.problem}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href="#pilot" className="btn-primary">
          Pilotplatz anfragen
        </a>
        <Link href={`/demo?fach=${s.id}`} className="btn-secondary">
          Demo-Praxis ansehen
        </Link>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900">So sieht es Ihr Patient</h2>
        <p className="mt-1 text-slate-600">{s.marketing.beispiel} Beispielpreise, in den Einstellungen anpassbar.</p>
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Entwurf: Die Regeln für dieses Fach sind nach öffentlichen Quellen zusammengestellt und werden im Pilotprogramm mit Praxen des
          Fachs gegengelesen. Bitte prüfen Sie die Angaben für Ihre Praxis.
        </p>
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
            <li>To-do für die Rezeption: {therapie ? "Privatvereinbarung vor der Behandlung, gesetzliche Zuzahlung kassieren" : "schriftliche IGeL-Vereinbarung vor der Leistung"}</li>
            <li>Digitaler Anamnesebogen vor dem Termin, Warnhinweise beim Gespräch</li>
            <li>Gemessene Annahmequote statt Bauchgefühl</li>
            <li>
              {therapie
                ? "Läuft im Browser neben Ihrer Praxissoftware, ohne Installation"
                : "Öffnet sich aus Ihrer Praxissoftware über GDT (z. B. Medistar, TURBOMED, CGM M1 PRO, x.isynet, ALBIS) mit dem aktuellen Patienten"}
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Regeln, an die Sorrida sich hält</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {therapie ? (
              <>
                <li><b>Zuzahlung richtig:</b> Bei Leistungen auf Verordnung rechnet Sorrida die gesetzliche Zuzahlung für Erwachsene (10 % plus 10 € je Verordnung), Kinder sind befreit.</li>
                <li><b>Schriftlich vereinbart:</b> Selbstzahlerleistungen nach Ihrer Preisliste, vor der Behandlung vereinbart.</li>
                <li><b>Kein Druck:</b> Sorrida empfiehlt keine Selbstzahlerleistung von sich aus und lädt zur Bedenkzeit ein.</li>
              </>
            ) : (
              <>
                <li><b>Schriftliche Vereinbarung</b> vor jeder Selbstzahlerleistung (§ 18 Abs. 8 BMV-Ä), Berechnung nach GOÄ.</li>
                <li><b>Kein Druck:</b> Sorrida empfiehlt keine IGeL von sich aus. Die Patienteninformation lädt ausdrücklich zur Bedenkzeit ein.</li>
              </>
            )}
            <li><b>Ehrlich zum Nutzen:</b> Wo kein Nutzen belegt ist, steht das beim Angebot.</li>
            <li><b>Kasse zuerst:</b> Wann die Kasse zahlt, steht bei jeder Leistung.</li>
          </ul>
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-brand-200 bg-brand-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Ein Preis, alles enthalten</h2>
        <p className="mt-1 text-slate-700">
          149 € im Monat für Einzelpraxen, 249 € für Praxen mit bis zu fünf {therapie ? "Therapeutinnen und Therapeuten" : "Ärztinnen und Ärzten"}. Ohne Zähler, 30 Tage kostenlos, monatlich
          kündbar. Endpreise nach § 19 UStG.
        </p>
        <Link href={`/demo?fach=${s.id}`} className="btn-primary mt-4 inline-block">
          Jetzt ausprobieren
        </Link>
      </section>

      <Entlastung therapie={therapie} />

      <PilotProgram fach={s.id} kurz={s.kurz} therapie={therapie} />

      <PraxisFaq therapie={therapie} />

      <section className="mt-10 text-sm">
        <h2 className="mb-2 font-semibold text-slate-900">Weitere Fachgebiete</h2>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          {SPECIALTIES.filter((x) => x.id !== s.id).map((x) => (
            <Link key={x.id} href={`/fachgebiete/${x.id}`} className="text-brand-600 hover:underline">
              {x.kurz}
            </Link>
          ))}
          <Link href="/zahnmedizin" className="text-brand-600 hover:underline">Zahnarztpraxis</Link>
        </p>
      </section>
    </PublicShell>
  );
}
