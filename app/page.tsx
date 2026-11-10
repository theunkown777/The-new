import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SPECIALTIES } from "@/lib/specialties";
import { FachWahl, type FachKachel } from "@/components/FachWahl";
import { PricingPlans } from "@/components/PricingPlans";
import { Grundsaetze } from "@/components/Grundsaetze";
import { PLANS, eur } from "@/lib/pricing";
import { Entlastung } from "@/components/Entlastung";
import { ZeitRechner } from "@/components/ZeitRechner";
import { PraxisFaq } from "@/components/PraxisFaq";
import { ZweiAnsichten } from "@/components/ZweiAnsichten";

export const metadata: Metadata = {
  title: "Sorrida – Nach dem Patientengespräch ein Klick. Für jede Praxis.",
  description:
    "Behandlungsvorschlag mit Kassenleistung und Eigenanteil, Patienten-Link, digitale Anamnese und To-dos, zugeschnitten auf rund 30 Bereiche: Zahnmedizin, Hausarzt, Fachärzte von Augen bis Radiologie, Psychotherapie, Physio-, Ergotherapie, Logopädie, Podologie, Hebammen, Pflege, Apotheken, Hörakustik, Optik, Sanitätshäuser und Kliniken.",
  openGraph: {
    title: "Sorrida – für jede Praxis, passend zu Ihrem Fach",
    description: "Kassenleistung zuerst, Selbstzahlerleistungen ehrlich erklärt, Patient entscheidet zu Hause und meldet sich zurück.",
    images: [{ url: "/og/sorrida.png", width: 1200, height: 630 }],
  },
};

const kachel = (x: (typeof SPECIALTIES)[number]): FachKachel => ({ id: x.id, name: x.kurz, href: `/fachgebiete/${x.id}`, teaser: x.teaser ?? x.name });

const GRUPPEN: { titel: string; kacheln: FachKachel[] }[] = [
  {
    titel: "Ärztliche und zahnärztliche Praxen",
    kacheln: [
      { id: "zahn", name: "Zahnmedizin", href: "/fachgebiete/zahn", teaser: "Zahnschema, Festzuschuss 2027, Mehrkostenvereinbarung" },
      ...SPECIALTIES.filter((x) => x.beruf !== "therapie").map(kachel),
    ],
  },
  {
    titel: "Therapie und Gesundheitsberufe",
    kacheln: SPECIALTIES.filter((x) => x.beruf === "therapie" && !x.gruppe).map(kachel),
  },
  {
    titel: "Versorgung: Hilfsmittel, Apotheke, Pflege, Kliniken",
    kacheln: SPECIALTIES.filter((x) => x.gruppe === "versorgung").map(kachel),
  },
];

const SCHRITTE = [
  ["Aus der Praxissoftware öffnen", "Ein Klick in der Patientenakte. Zahnärzte über VDDS-media, Arztpraxen über GDT."],
  ["Befund oder Anlass wählen", "Sorrida zeigt die Kassenleistung zuerst und sinnvolle Alternativen mit Eigenanteil."],
  ["Patient entscheidet zu Hause", "Per QR-Code oder SMS, mit Rückmeldung an die Praxis und auf Wunsch Ratenzahlung."],
  ["Rezeption arbeitet ab", "Vereinbarungen, Anträge, Fristen und Termine stehen auf der To-do-Liste."],
];

export default async function Start() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-[#F5F2EE] text-slate-900">
      <header className="mx-auto flex max-w-[88rem] items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3" aria-label="Sorrida Startseite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sorrida-mark.svg" alt="" className="h-11 w-11" />
          <span className="font-brand hidden text-lg text-brand-700 min-[420px]:inline">SORRIDA</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm sm:gap-4">
          <Link href="/anatomie" className="hidden text-slate-600 hover:text-slate-900 sm:inline" data-testid="nav-modelle">
            Modelle
          </Link>
          <Link href="/ratgeber" className="hidden text-slate-600 hover:text-slate-900 sm:inline">
            Ratgeber
          </Link>
          {session ? (
            <Link href="/dashboard" className="font-medium text-brand-700 hover:underline" data-testid="zur-uebersicht">
              Zur Übersicht
            </Link>
          ) : (
            <Link href="/login" className="text-slate-600 hover:text-slate-900">
              Anmelden
            </Link>
          )}
          <Link href="/vorschau" className="rounded-full bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">
            Vorschau
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-[88rem] px-4 pb-20 sm:px-6 lg:px-10">
        <section className="mx-auto max-w-4xl pt-6 text-center sm:pt-12" id="fach">
          {session && (
            <p className="mx-auto mb-6 inline-flex flex-wrap items-center justify-center gap-x-2 rounded-full bg-white px-4 py-2 text-sm text-slate-600">
              Angemeldet: <b className="text-slate-800">{session.user.practiceName}</b>
              <Link href="/dashboard" className="font-medium text-brand-700 underline">
                zurück zur Übersicht
              </Link>
            </p>
          )}
          <p className="text-sm font-semibold text-brand-700">Willkommen bei Sorrida</p>
          <h1 className="font-display mt-2 text-4xl leading-tight sm:text-5xl">Welche Praxis haben Sie?</h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
            Wählen Sie Ihr Fach. Sie sehen dann Sorrida mit Ihren Leistungen, Ihren Regeln und dem Pilotprogramm für Ihr Fach.
          </p>
        </section>

        <div className="mt-10">
          <FachWahl gruppen={GRUPPEN} />
          <div className="mt-8 grid gap-3 sm:grid-cols-2" data-testid="zugaenge">
            <Link href="/demo" className="group rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-brand-600" data-testid="zugang-praxis">
              <span className="block text-xs font-semibold uppercase tracking-wide text-brand-700">Für Praxen</span>
              <span className="mt-1 block font-semibold text-slate-900">Demo-Praxis ansehen →</span>
              <span className="mt-0.5 block text-sm text-slate-600">Das ganze System mit Beispieldaten in der Größe einer typischen Praxis Ihres Fachs. Von dort öffnen Sie auch die Patientenansicht.</span>
            </Link>
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-left" data-testid="hinweis-patienten">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Für Patienten</span>
              <span className="mt-1 block font-semibold text-slate-900">Kein eigener Zugang nötig</span>
              <span className="mt-0.5 block text-sm text-slate-600">Patienten bekommen ihren persönlichen Link von ihrer Praxis, per SMS oder QR-Code. Ohne Konto, ohne Passwort.</span>
            </div>
          </div>
          <p className="mt-6 text-center">
            <Link
              href="/vorschau"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:border-brand-600 hover:text-brand-700"
              data-testid="vorschau-link"
            >
              Ohne Praxiswahl ansehen · Vorschau
              <span aria-hidden="true">→</span>
            </Link>
          </p>
        </div>

        <ZweiAnsichten />
        <Grundsaetze />

        <section className="mt-20 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <h2 className="font-display text-4xl leading-tight">Nach dem Patientengespräch ein Klick. Der Rest ist erledigt.</h2>
            <p className="text-lg leading-relaxed text-slate-600">
              Sorrida zeigt Patienten zuerst, was die Kasse zahlt, und dann die sinnvollen Alternativen mit dem Betrag, den sie selbst
              zahlen. Zu Hause vergleichen sie in Ruhe und melden sich mit einem Tipp zurück.
            </p>
          </div>
          <ul className="space-y-3 rounded-3xl bg-white p-6 text-slate-700">
            <li className="flex gap-3"><span className="text-emerald-700">✓</span> Kassenleistung immer zuerst, ehrliche Hinweise zum Nutzen</li>
            <li className="flex gap-3"><span className="text-emerald-700">✓</span> Patienten-Link mit QR-Code, Rückmeldung an die Praxis, Ratenzahlung</li>
            <li className="flex gap-3"><span className="text-emerald-700">✓</span> Digitale Anamnese, Warnhinweise beim Abschluss</li>
            <li className="flex gap-3"><span className="text-emerald-700">✓</span> To-dos für die Rezeption, gemessene Annahmequote</li>
            <li className="flex gap-3"><span className="text-emerald-700">✓</span> Daten in Frankfurt, Pauschalpreis ohne KI-Kontingent</li>
          </ul>
        </section>

        <div className="">
          <Entlastung />
        </div>

        <section className="mt-20">
          <ZeitRechner />
        </section>

        <section className="mt-20">
          <h2 className="font-display text-4xl">So läuft es in jeder Praxis</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SCHRITTE.map(([t, d], i) => (
              <li key={t} className="space-y-1">
                <span className="font-mono text-xs uppercase tracking-wider text-brand-700">Schritt {i + 1}</span>
                <h3 className="font-semibold">{t}</h3>
                <p className="text-sm text-slate-600">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20 grid gap-6 rounded-3xl bg-white p-6 sm:grid-cols-3 sm:p-10">
          <div>
            <h3 className="font-semibold">Ehrlich statt verkaufen</h3>
            <p className="mt-1 text-sm text-slate-600">
              Sorrida empfiehlt nie von sich aus eine Selbstzahlerleistung. Wo kein Nutzen belegt ist, steht es dabei.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Gemessen statt versprochen</h3>
            <p className="mt-1 text-sm text-slate-600">Ihre Annahmequote mit und ohne Patienten-Link, aus Ihren eigenen Fällen.</p>
          </div>
          <div>
            <h3 className="font-semibold">Sofort ausprobieren</h3>
            <p className="mt-1 text-sm text-slate-600">Eigene Demo-Praxis für Ihr Fach, ohne Anmeldung, nach 24 Stunden gelöscht.</p>
          </div>
        </section>

        <PricingPlans />

        <div className="">
          <PraxisFaq />
        </div>

        <section className="mt-20 flex flex-col items-start justify-between gap-6 rounded-3xl bg-brand-700 p-8 text-white sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="font-display text-4xl">Ab {eur(PLANS[0].preis)} im Monat. Alles enthalten.</h2>
            <p className="mt-1 text-white/80">30 Tage kostenlos, monatlich kündbar, keine Zähler. Endpreise ohne späteren Steueraufschlag.</p>
          </div>
          <a href="#fach" className="rounded-full bg-white px-5 py-3 font-medium text-brand-700 hover:bg-brand-50">
            Fach wählen und loslegen
          </a>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-[88rem] flex-wrap justify-between gap-3 px-4 py-6 text-xs text-slate-500 sm:px-6 lg:px-10">
          <span>
            Sorrida · <Link href="/ratgeber" className="hover:underline">Ratgeber</Link> ·{" "}
            <Link href="/avv" className="hover:underline">AVV-Muster</Link> · <Link href="/impressum" className="hover:underline">Impressum</Link> ·{" "}
            <Link href="/datenschutz" className="hover:underline">Datenschutz</Link>
          </span>
          <span>Keine Abrechnungs- oder Rechtsberatung. Genannte Produktnamen sind Marken ihrer Inhaber.</span>
        </div>
      </footer>
    </div>
  );
}
