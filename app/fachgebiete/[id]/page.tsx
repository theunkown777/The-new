import type { Metadata } from "next";
import Link from "next/link";
import { PRICE_SHORT } from "@/lib/pricing";
import { notFound } from "next/navigation";
import { SPECIALTIES, isTherapie, specialty } from "@/lib/specialties";
import { PublicShell } from "@/components/PublicShell";
import { SpecialtyIcon } from "@/components/SpecialtyIcon";
import { PilotProgram } from "@/components/PilotProgram";
import { Entlastung } from "@/components/Entlastung";
import { PraxisFaq } from "@/components/PraxisFaq";
import { DENTAL_SHOWCASE } from "@/lib/dentalShowcase";

// Zahnmedizin hat dieselbe Seite wie alle anderen Fächer (/fachgebiete/zahn).
const fach = (id: string) => (id === "zahn" ? DENTAL_SHOWCASE : specialty(id));

export function generateStaticParams() {
  return [{ id: "zahn" }, ...SPECIALTIES.map((s) => ({ id: s.id }))];
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const s = fach(params.id);
  if (!s) return {};
  return { title: `Sorrida für die ${s.kurz} – ${s.marketing.headline}`, description: `${s.marketing.problem} ${s.marketing.beispiel}` };
}

const euro = (n: number) => (n ? `${n.toLocaleString("de-DE")} €` : "–");

export default function SpecialtyPage({ params }: { params: { id: string } }) {
  const s = fach(params.id);
  if (!s) notFound();
  const therapie = isTherapie(s);
  const dental = s.id === "zahn";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `Sorrida für ${s.name}`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "de-DE",
    description: s.marketing.headline,
  };
  const zz = new Set(s.anlaesse.flatMap((a) => a.options.map((o) => o.zuzahlung)).filter(Boolean));
  const zuzahlungText = zz.has("hilfsmittel")
    ? "10 % des Preises, mindestens 5 €, höchstens 10 €"
    : zz.size
      ? "10 % plus 10 € je Verordnung"
      : null;
  const anzahl = s.anlaesse.reduce((n, a) => n + a.options.length, 0);
  const nav: [string, string][] = [
    ["#beispiel", "So sieht es Ihr Patient"],
    ["#automatisch", "Was automatisch entsteht"],
    ["#entlastung", "Was Sorrida abnimmt"],
    ["#pilot", "Pilotprogramm"],
    ["#faq", "Häufige Fragen"],
  ];

  return (
    <PublicShell full>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-12">
        {/* Seitenleiste: auf dem Desktop fest, auf dem Handy oben */}
        <aside className="mb-8 lg:sticky lg:top-6 lg:mb-0 lg:self-start" data-testid="fach-aside">
          <div className="rounded-3xl bg-white p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-white">
                <SpecialtyIcon id={s.id} />
              </span>
              <div>
                <p className="font-semibold leading-tight text-slate-900">{s.kurz}</p>
                <p className="text-xs text-slate-500">{s.name}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-[#F5F2EE] p-2">
                <dt className="text-[11px] text-slate-500">{dental ? "Beispiele" : "Anlässe"}</dt>
                <dd className="text-lg font-semibold tabular-nums text-slate-900">{s.anlaesse.length}</dd>
              </div>
              <div className="rounded-xl bg-[#F5F2EE] p-2">
                <dt className="text-[11px] text-slate-500">Leistungen</dt>
                <dd className="text-lg font-semibold tabular-nums text-slate-900">{anzahl}</dd>
              </div>
            </dl>
            <div className="mt-4 grid gap-2">
              <a href="#pilot" className="btn-primary text-center">
                Pilotplatz anfragen
              </a>
              <Link href={`/demo?fach=${s.id}`} className="btn-secondary text-center">
                Demo-Praxis ansehen
              </Link>
            </div>
            <nav className="mt-5 hidden border-t border-slate-100 pt-4 text-sm lg:block" aria-label="Inhalt">
              <ul className="space-y-1.5">
                {nav.map(([href, label]) => (
                  <li key={href}>
                    <a href={href} className="text-slate-600 hover:text-brand-700">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <Link href="/#fach" className="mt-4 block text-xs text-slate-500 underline">
              Fach wechseln
            </Link>
          </div>
        </aside>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-700">Sorrida für die {s.kurz}</p>
          <h1 className="font-display mt-2 max-w-4xl text-3xl leading-tight text-slate-900 sm:text-4xl">{s.marketing.headline}</h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600">{s.marketing.problem}</p>

          <section id="beispiel" className="mt-12 scroll-mt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-4xl text-slate-900">So sieht es Ihr Patient</h2>
                <p className="mt-1 max-w-3xl text-slate-600">{s.marketing.beispiel} Beispielpreise, in den Einstellungen anpassbar.</p>
              </div>
              <Link href="/vorschau" className="text-sm text-brand-700 underline">
                Interaktive Vorschau öffnen
              </Link>
            </div>
            {dental ? (
              <p className="mt-3 rounded-lg bg-[#F5F2EE] px-3 py-2 text-sm text-slate-700">
                Auszug: Im Programm wählen Sie den Befund je Zahn am Zahnschema. Das Regelwerk deckt Füllung, Endo, Zahnersatz, Prophylaxe und PAR ab,
                mit Festzuschuss-Sätzen 2026 und 2027.
              </p>
            ) : (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Entwurf: Die Regeln für dieses Fach sind nach öffentlichen Quellen zusammengestellt und werden im Pilotprogramm mit Praxen des
                Fachs gegengelesen. Bitte prüfen Sie die Angaben für Ihre Praxis.
              </p>
            )}
            <div className="mt-6 grid gap-5 xl:grid-cols-2">
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
                            {o.type === "kasse" && dental && o.kasseAnteil == null && /Regelversorgung/.test(o.name)
                              ? `ca. ${euro(o.price)}, Kasse zahlt Festzuschuss`
                              : o.type === "kasse"
                              ? o.kasseAbAlter
                                ? `Kasse ab ${o.kasseAbAlter} Jahren`
                                : o.zuzahlung
                                  ? "Kasse, mit Zuzahlung"
                                  : "Kassenleistung"
                              : o.kasseAnteil != null
                                ? `Aufzahlung ca. ${euro(o.price - o.kasseAnteil)}`
                                : `${dental ? "Privat" : "Selbstzahler"} ca. ${euro(o.price)}`}
                          </span>
                        </div>
                        {o.benefits.length > 0 && <p className="mt-1 text-sm text-slate-600">{o.benefits.join(" · ")}</p>}
                        {o.kasseWenn && <p className="mt-1 text-sm text-green-800">Kasse zahlt: {o.kasseWenn}</p>}
                        {o.nutzen && <p className="mt-1 text-sm text-amber-800">Zum Nutzen: {o.nutzen}</p>}
                      </li>
                    ))}
                  </ul>
                  {a.notes?.map((n) => (
                    <p key={n} className="mt-3 text-sm text-slate-600">
                      {n}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section id="automatisch" className="mt-14 grid scroll-mt-6 gap-5 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-5">
              <h2 className="font-display text-2xl text-slate-900">Was nach dem Gespräch automatisch entsteht</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                {dental && <li>Befund- und Behandlungsbericht mit erfassten Leistungen (BEMA/GOZ)</li>}
                <li>Patienteninformation in Textform mit Kosten je Option (§ 630c Abs. 3 BGB)</li>
                <li>Patienten-Link mit QR-Code, Rückmeldung an die Praxis</li>
                <li>
                  To-do:{" "}
                  {dental ? "Mehrkostenvereinbarung bzw. Heil- und Kostenplan vor der Behandlung" : therapie ? "Privatvereinbarung vor der Behandlung" : "schriftliche IGeL-Vereinbarung vor der Leistung"}
                </li>
                <li>Rechnung für den Eigenanteil im Patientenportal, Zahlung per GiroCode</li>
                {zuzahlungText && <li>To-do: gesetzliche Zuzahlung kassieren oder Befreiung prüfen</li>}
                <li>Digitaler Anamnesebogen, Warnhinweise beim Gespräch</li>
                <li>Gemessene Annahmequote statt Bauchgefühl</li>
                <li>
                  {dental
                    ? "Öffnet sich aus DS-Win, CGM Z1, charly oder EVIDENT über VDDS-media"
                    : therapie
                      ? "Läuft im Browser neben Ihrer Software, ohne Installation"
                      : "Öffnet sich aus Ihrer Praxissoftware über GDT mit dem aktuellen Patienten"}
                </li>
              </ul>
            </div>
            <div className="rounded-2xl bg-white p-5">
              <h2 className="font-display text-2xl text-slate-900">Regeln, an die Sorrida sich hält</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {zuzahlungText && (
                  <li>
                    <b>Zuzahlung richtig:</b> gesetzliche Zuzahlung für Erwachsene ({zuzahlungText}), Kinder sind befreit.
                  </li>
                )}
                {dental ? (
                  <>
                    <li>
                      <b>Mehrkosten richtig:</b> Bei Füllungen zahlt die Kasse den Anteil der Kassenfüllung, der Rest ist Mehrkostenvereinbarung (§ 28 Abs. 2 SGB V).
                    </li>
                    <li>
                      <b>Festzuschuss mit Bonus:</b> 60, 70 oder 75 % je nach Bonusheft, Härtefall berücksichtigt; maßgeblich ist das Genehmigungsdatum des HKP.
                    </li>
                  </>
                ) : therapie ? (
                  <li>
                    <b>Schriftlich vereinbart:</b> Selbstzahlerleistungen nach Ihrer Preisliste, vor der Leistung vereinbart.
                  </li>
                ) : (
                  <li>
                    <b>Schriftliche Vereinbarung</b> vor jeder Selbstzahlerleistung (§ 18 Abs. 8 BMV-Ä), Kosten nach GOÄ.
                  </li>
                )}
                <li>
                  <b>Kein Druck:</b> Sorrida empfiehlt keine Selbstzahlerleistung von sich aus und lädt zur Bedenkzeit ein.
                </li>
                <li>
                  <b>Ehrlich zum Nutzen:</b> Wo kein Nutzen belegt ist, steht das beim Angebot.
                </li>
                <li>
                  <b>Kasse zuerst:</b> Wann die Kasse zahlt, steht bei jeder Leistung.
                </li>
              </ul>
            </div>
            <div className="flex flex-col rounded-2xl bg-brand-700 p-5 text-white">
              <h2 className="font-display text-2xl">Ein Preis, alles enthalten</h2>
              <p className="mt-2 text-sm text-white/85">
                {PRICE_SHORT}. Mit Patientenportal, Zahlungen und Analyse. Ohne Zähler, 30 Tage kostenlos, monatlich kündbar. Endpreise ohne späteren Steueraufschlag.
              </p>
              <Link href={`/demo?fach=${s.id}`} className="mt-auto inline-block rounded-full bg-white px-4 py-2 text-center text-sm font-medium text-brand-700 hover:bg-brand-50">
                Jetzt ausprobieren
              </Link>
            </div>
          </section>

          <div id="entlastung" className="scroll-mt-6">
            <Entlastung therapie={therapie} />
          </div>

          <PilotProgram fach={s.id} kurz={s.kurz} therapie={therapie} dental={dental} />

          <div id="faq" className="scroll-mt-6">
            <PraxisFaq therapie={therapie} dental={dental} />
          </div>

          <section className="mt-14">
            <h2 className="font-display mb-3 text-lg text-slate-900">Weitere Fachgebiete</h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[DENTAL_SHOWCASE, ...SPECIALTIES].filter((x) => x.id !== s.id).map((x) => ({ id: x.id, kurz: x.kurz, href: `/fachgebiete/${x.id}` })).map((x) => (
                <li key={x.id}>
                  <Link href={x.href} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-brand-600 hover:text-brand-700">
                    <SpecialtyIcon id={x.id} className="h-4 w-4" />
                    {x.kurz}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </PublicShell>
  );
}
