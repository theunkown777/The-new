import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDental, isTherapie, specialty } from "@/lib/specialties";

// `nur`: Karte nur für Zahnarztpraxen (Punktwerte GOZ/BEMA, Preise der Zahn-Vorschläge).
const CARDS: { href: string; title: string; description: string; nur?: "zahn" }[] = [
  {
    href: "/settings/fachgebiet",
    title: "Fachgebiet und Leistungen",
    description: "Fachgebiet der Praxis wählen, Preise und eigene Selbstzahlerleistungen pflegen.",
  },
  {
    href: "/zahlungen#konto",
    title: "Bankverbindung",
    description: "IBAN für den GiroCode auf dem Behandlungsweg Ihrer Patienten. Zahlungen gehen direkt auf Ihr Praxiskonto.",
  },
  {
    href: "/settings/security",
    title: "Sicherheit",
    description: "Zwei-Faktor-Anmeldung einrichten und festlegen, wie das Diktat Sprache erkennt.",
  },
  {
    href: "/settings/billing",
    title: "Abrechnung",
    description: "GOZ-/BEMA-Punktwerte für geschätzte Rechnungsbeträge pflegen.",
    nur: "zahn",
  },
  {
    href: "/settings/catalog",
    title: "Katalog",
    description: "Leistungspositionen anlegen, bearbeiten, Punktzahlen/Festbeträge pflegen.",
  },
  {
    href: "/settings/templates",
    title: "Vorlagen",
    description: "Sitzungstyp-Vorlagen anlegen und Positionen inkl. Abhängigkeiten verwalten.",
  },
  {
    href: "/settings/connector",
    title: "Praxissoftware",
    description: "",
  },
  {
    href: "/settings/proposals",
    title: "Vorschlagspreise",
    description: "Preise je Behandlungsoption für Eigenanteil und Mehrumsatz in Vorschlägen.",
    nur: "zahn",
  },
  {
    href: "/settings/lexikon",
    title: "Leistungslexikon",
    description: "Nachschlagewerk zu gängigen Selbstzahlerleistungen – nicht patientenbezogen.",
  },
  {
    href: "/settings/termine",
    title: "Online-Termine und Kalender",
    description: "Patienten buchen selbst und sehen nur freie Zeiten. Kalender der Praxis übertragen (Google, Outlook, Praxisprogramm).",
  },
  {
    href: "/settings/standorte",
    title: "Standorte",
    description: "Hauptpraxis und Zweigpraxen mit Behandlungsplätzen und Sprechzeit, für Termine und Auslastung je Standort.",
  },
  {
    href: "/settings/protokoll",
    title: "Protokoll und Datenschutz",
    description: "Wer hat sich wann angemeldet, Berichte freigegeben, Daten exportiert oder gelöscht. Stand der Zwei-Faktor-Anmeldung im Team.",
  },
  {
    href: "/settings/team",
    title: "Team",
    description: "Mitarbeitende einladen, Rollen verwalten und die Analyse für einzelne Mitarbeitende freigeben.",
  },
];

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const practice = session ? await prisma.practice.findUnique({ where: { id: session.user.practiceId }, select: { specialty: true } }) : null;
  const zahn = isDental(practice?.specialty);
  const therapie = isTherapie(specialty(practice?.specialty));
  // Anbindung je Fach: Zahnarztpraxen über VDDS-media, Arztpraxen über GDT, sonst im Browser neben der eigenen Software.
  const anbindung = zahn
    ? "Sorrida als Fenster aus DS-Win, CGM Z1, charly oder EVIDENT öffnen (VDDS-media)."
    : therapie
      ? "Sorrida läuft im Browser neben Ihrer Praxissoftware. Hier richten Sie eine Anbindung ein, falls Ihre Software GDT unterstützt."
      : "Sorrida als Fenster aus Medistar, TURBOMED, CGM M1 PRO, x.isynet oder ALBIS öffnen (GDT). Freigegebene Berichte kommen zurück in die Karteikarte.";
  const karten = CARDS.filter((c) => !c.nur || zahn).map((c) => (c.href === "/settings/connector" ? { ...c, description: anbindung } : c));
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-3xl text-slate-900">Einstellungen</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {karten.map((card) => (
          <Link key={card.href} href={card.href} className="card hover:bg-slate-50">
            <h2 className="font-medium text-slate-900">{card.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
