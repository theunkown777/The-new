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
import { JournalFuss, JournalKopf } from "@/components/start/JournalKopf";
import { PatientenKarte } from "@/components/start/PatientenKarte";
import { Laechelbogen } from "@/components/Behandlungsweg";

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

const FUER_PATIENTEN: [string, string, string | null][] = [
  ["Am Modell zeigen", "Gebiss, Körper mit Organen, Auge, Ohr oder Haut, passend zu Ihrem Fach. Sie markieren die Stelle, der Patient sieht sie zu Hause mit Erklärung wieder.", "/anatomie"],
  ["Termine ohne Telefon", "Sie übertragen Ihren vorhandenen Kalender. Patienten sehen nur Zeiten, die wirklich frei sind, und buchen selbst.", null],
  ["Nachricht per WhatsApp", "Terminbestätigung, Erinnerung und der persönliche Link mit einem Klick, nur mit Einwilligung und ohne Befunde im Text.", null],
  ["Alles in einem Eingang", "Gemeldete Zahlungen, abgeschickte Anamnesebögen und gebuchte Termine stehen für die Praxis gesammelt auf einer Seite.", null],
];

const SCHRITTE = [
  ["Aus der Praxissoftware öffnen", "Ein Klick in der Patientenakte. Zahnärzte über VDDS-media, Arztpraxen über GDT."],
  ["Befund oder Anlass wählen", "Sorrida zeigt die Kassenleistung zuerst und sinnvolle Alternativen mit Eigenanteil."],
  ["Patient entscheidet zu Hause", "Per QR-Code oder SMS, mit Rückmeldung an die Praxis und auf Wunsch Ratenzahlung."],
  ["Rezeption arbeitet ab", "Vereinbarungen, Anträge, Fristen und Termine stehen auf der To-do-Liste."],
];

export default async function Start() {
  const session = await getServerSession(authOptions);
  const rahmen = "mx-auto max-w-[78rem] px-5 sm:px-8";

  return (
    <div className="journal min-h-screen">
      <JournalKopf angemeldet={!!session} />

      <main>
        {session && (
          <p className={`${rahmen} pt-6 text-[15px] text-tinte-2`}>
            Angemeldet: <b className="font-semibold text-tinte">{session.user.practiceName}</b> ·{" "}
            <Link href="/dashboard" className="j-link font-semibold text-brand-700">zurück zur Übersicht</Link>
          </p>
        )}

        {/* Auftakt: Aussage links, die echte Patientenansicht rechts */}
        <section className={`${rahmen} grid items-center gap-16 pb-24 pt-16 sm:pt-24 lg:grid-cols-12 lg:gap-8 lg:pb-32`} data-testid="auftakt">
          <div className="j-auftakt lg:col-span-7">
            <p className="flex items-center gap-3 text-[15px] text-tinte-2">
              <Laechelbogen className="h-2 w-10 text-brand-700" />
              Für Praxen jeder Fachrichtung
            </p>
            <h1 className="j-schau mt-7 text-[clamp(3.2rem,7.4vw,6.6rem)]">
              Nach dem Gespräch ein Klick. <em>Der Rest ist erledigt.</em>
            </h1>
            <p className="j-text mt-8 max-w-xl text-[19px] leading-relaxed">
              Sorrida zeigt Patienten zuerst, was die Kasse zahlt, und dann die sinnvollen Alternativen mit dem Betrag, den sie selbst zahlen.
              Zu Hause vergleichen sie in Ruhe und melden sich mit einem Tipp zurück.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link href="/demo" className="j-knopf j-knopf-voll">
                Demo-Praxis öffnen <span className="j-pfeil" aria-hidden="true">→</span>
              </Link>
              <a href="#fach" className="j-link text-[16px] font-semibold text-tinte">
                Ihr Fach wählen
              </a>
            </div>
            <p className="mt-8 text-[14px] text-tinte-2">30 Tage kostenlos · monatlich kündbar · keine Zähler</p>
          </div>
          <div className="relative lg:col-span-4 lg:col-start-9" data-testid="seite-patient">
            <p className="font-hand absolute -top-12 left-2 z-10 -rotate-3 text-[1.6rem] leading-none text-brand-700 sm:-left-8" aria-hidden="true">
              So sieht es Ihr Patient ↓
            </p>
            <div className="j-blatt-ein">
              <PatientenKarte />
            </div>
          </div>
        </section>

        {/* Fachauswahl als Register */}
        <section id="fach" className="scroll-mt-6 border-t border-linie bg-[#F8F5F1]">
          <div className={`${rahmen} py-24 sm:py-32`}>
            <div className="grid gap-6 lg:grid-cols-12">
              <h2 className="j-schau text-[clamp(2.6rem,5.5vw,4.6rem)] lg:col-span-7">
                Welche Praxis <em>haben Sie?</em>
              </h2>
              <p className="j-text self-end lg:col-span-4 lg:col-start-9">
                Wählen Sie Ihr Fach. Sie sehen dann Sorrida mit Ihren Leistungen, Ihren Regeln und dem Pilotprogramm für Ihr Fach.
              </p>
            </div>
            <div className="mt-14">
              <FachWahl gruppen={GRUPPEN} />
            </div>
            <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8" data-testid="zugaenge">
              <Link href="/demo" className="group block" data-testid="zugang-praxis">
                <span className="j-marke text-brand-700">Für Praxen</span>
                <span className="j-titel mt-3 flex items-center gap-2 text-[1.7rem] text-tinte group-hover:text-brand-700">
                  Demo-Praxis ansehen <span className="j-pfeil" aria-hidden="true">→</span>
                </span>
                <span className="j-text mt-2 block text-[15px]">Das ganze System mit Beispieldaten in der Größe einer typischen Praxis Ihres Fachs. Von dort öffnen Sie auch die Patientenansicht.</span>
              </Link>
              <div data-testid="hinweis-patienten">
                <span className="j-marke text-salbei-700">Für Patienten</span>
                <span className="j-titel mt-3 block text-[1.7rem] text-tinte">Kein eigener Zugang nötig</span>
                <span className="j-text mt-2 block text-[15px]">Patienten bekommen ihren persönlichen Link von ihrer Praxis, per SMS oder QR-Code. Ohne Konto, ohne Passwort.</span>
              </div>
              <Link href="/vorschau" className="group block" data-testid="vorschau-link">
                <span className="j-marke">Ohne Praxiswahl</span>
                <span className="j-titel mt-3 flex items-center gap-2 text-[1.7rem] text-tinte group-hover:text-brand-700">
                  Vorschau ansehen <span className="j-pfeil" aria-hidden="true">→</span>
                </span>
                <span className="j-text mt-2 block text-[15px]">Alle Bereiche von Sorrida auf einen Blick, ohne ein Fach festzulegen.</span>
              </Link>
            </div>
          </div>
        </section>

        <div className={`${rahmen} py-24 sm:py-36`}>
          <ZweiAnsichten />
        </div>

        <div className={`${rahmen} border-t border-linie py-24 sm:py-36`}>
          <Grundsaetze />
        </div>

        {/* Bedeutung des Namens als Zitat über die volle Breite */}
        <section className="j-ein bg-brand-700 text-[#F5F2EE]">
          <div className={`${rahmen} grid gap-10 py-24 sm:py-32 lg:grid-cols-12`}>
            <svg viewBox="0 0 240 60" className="h-14 w-56 text-brand-300 lg:col-span-3" aria-hidden="true">
              <path d="M6 10 Q120 70 234 10" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
            </svg>
            <div className="lg:col-span-8 lg:col-start-5">
              <p className="j-schau text-[clamp(2.8rem,6vw,5.2rem)] text-[#F5F2EE]">
                Sorrida heißt <em className="!text-brand-200">„lächeln“.</em>
              </p>
              <p className="mt-8 max-w-xl text-[18px] leading-relaxed text-[#F5F2EE]/80">
                Der Bogen aus dem Logo zieht sich durch das ganze Produkt: als Weg, als Markierung, als Unterschriftslinie. Weil gute Aufklärung am
                Ende beide Seiten zufrieden macht.
              </p>
            </div>
          </div>
        </section>

        <div className={`${rahmen} py-24 sm:py-36`}>
          <Entlastung journal />
        </div>

        <div className={`${rahmen} border-t border-linie py-24 sm:py-36`}>
          <ZeitRechner />
        </div>

        {/* Ablauf und Nutzen für Patienten */}
        <section className={`${rahmen} border-t border-linie py-24 sm:py-36`}>
          <h2 className="j-schau max-w-3xl text-[clamp(2.4rem,4.6vw,3.8rem)]">
            So läuft es <em>in jeder Praxis.</em>
          </h2>
          <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {SCHRITTE.map(([t, d], i) => (
              <li key={t} className="j-ein border-t border-tinte pt-6">
                <span className="j-ziffer text-[2.8rem]">{i + 1}</span>
                <h3 className="j-titel mt-4 text-[1.6rem] text-tinte">{t}</h3>
                <p className="j-text mt-2 text-[15px]">{d}</p>
              </li>
            ))}
          </ol>

          <div className="mt-24" data-testid="fuer-patienten">
            <h3 className="j-titel text-[2.2rem] text-tinte">
              Was Ihre Patienten <em className="text-salbei-700">davon haben</em>
            </h3>
            <ul className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {FUER_PATIENTEN.map(([t, d, href]) => (
                <li key={t} className="j-ein border-t border-linie-stark pt-6">
                  <h4 className="font-semibold text-tinte">{t}</h4>
                  <p className="j-text mt-2 text-[15px]">{d}</p>
                  {href && (
                    <Link href={href} className="j-link mt-3 inline-block text-[15px] font-semibold text-brand-700">
                      Modelle ansehen
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className={`${rahmen} border-t border-linie py-24 sm:py-36`}>
          <PricingPlans />
        </div>

        <div className={`${rahmen} border-t border-linie py-24 sm:py-36`}>
          <PraxisFaq journal />
        </div>

        {/* Schlussaufruf */}
        <section className="bg-tinte text-[#F5F2EE]">
          <div className={`${rahmen} grid items-end gap-10 py-24 sm:py-32 lg:grid-cols-12`}>
            <div className="lg:col-span-8">
              <h2 className="j-schau text-[clamp(2.8rem,6vw,5.4rem)] text-[#F5F2EE]">
                Ab <span className="j-zahl">{eur(PLANS[0].preis)}</span> im Monat. <em className="!text-brand-200">Alles enthalten.</em>
              </h2>
              <p className="mt-6 text-[18px] text-[#F5F2EE]/75">30 Tage kostenlos, monatlich kündbar, keine Zähler. Endpreise ohne späteren Steueraufschlag.</p>
            </div>
            <div className="flex flex-wrap gap-4 lg:col-span-4 lg:justify-end">
              <a href="#fach" className="j-knopf j-knopf-hell">
                Fach wählen und loslegen
              </a>
              <Link href="/demo" className="j-knopf border border-[#F5F2EE]/40 text-[#F5F2EE] hover:border-[#F5F2EE]">
                Demo öffnen
              </Link>
            </div>
          </div>
        </section>
      </main>

      <JournalFuss />
    </div>
  );
}
