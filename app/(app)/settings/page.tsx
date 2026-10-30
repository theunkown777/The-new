import Link from "next/link";

const CARDS = [
  {
    href: "/settings/security",
    title: "Sicherheit",
    description: "Zwei-Faktor-Authentifizierung (2FA) einrichten oder deaktivieren.",
  },
  {
    href: "/settings/billing",
    title: "Abrechnung",
    description: "GOZ-/BEMA-Punktwerte für geschätzte Rechnungsbeträge pflegen.",
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
    description: "Sorrida als Fenster aus DS-Win, CGM Z1, charly oder EVIDENT öffnen (VDDS-media).",
  },
  {
    href: "/settings/proposals",
    title: "Vorschlagspreise",
    description: "Preise je Behandlungsoption für Eigenanteil und Mehrumsatz in Vorschlägen.",
  },
  {
    href: "/settings/lexikon",
    title: "Leistungslexikon",
    description: "Nachschlagewerk zu gängigen Selbstzahlerleistungen – nicht patientenbezogen.",
  },
  {
    href: "/settings/team",
    title: "Team",
    description: "Weitere Praxismitglieder einladen, Rollen (Admin/Staff) verwalten.",
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Einstellungen</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link key={card.href} href={card.href} className="card hover:bg-slate-50">
            <h2 className="font-medium text-slate-900">{card.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
