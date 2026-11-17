// „Neu in Sorrida“ (/neu): was zuletzt dazugekommen ist, kurz und sachlich. Jeder Eintrag beschreibt etwas, das es
// in der Anwendung wirklich gibt: Datum, Titel, zwei Sätze, für wen. Keine Ankündigungen, keine Wertungen.
// Neue Einträge oben anfügen; die Seite sortiert nach Datum (neueste zuerst).

export type Neuigkeit = {
  /** Kalendertag im Format JJJJ-MM-TT. */
  datum: string;
  titel: string;
  /** Genau zwei Sätze. */
  text: string;
  fuerWen: string;
  /** Öffentliche Seite, auf der man es ansehen kann (nur wenn es eine gibt). */
  link?: { href: string; name: string };
};

export const NEUIGKEITEN: Neuigkeit[] = [
  {
    datum: "2026-11-15",
    titel: "Kostenübersicht als PDF für Patienten",
    text: "Patienten können ihren Vorschlag als PDF speichern, mit allen Möglichkeiten, Kassenanteil und Eigenanteil. Das Blatt nennt den Hinweis zur unverbindlichen Schätzung und lässt sich bei Zusatzversicherung oder Beihilfe einreichen.",
    fuerWen: "Patienten, Empfang",
  },
  {
    datum: "2026-11-15",
    titel: "Empfangsmodus am Tablet",
    text: "Das Praxis-Tablet lässt sich für ein paar Minuten an einen Patienten übergeben, für Kontaktdaten, Anamnese oder Unterschrift. Zurück in die Praxis-Ansicht führt nur die Empfangs-PIN.",
    fuerWen: "Empfang",
  },
  {
    datum: "2026-11-15",
    titel: "Warteliste für frei gewordene Termine",
    text: "Wird ein Termin frei, schlägt Sorrida passende Personen von der Warteliste vor. Angeboten wird die Zeit erst, wenn jemand in der Praxis es auslöst.",
    fuerWen: "Empfang, Terminplanung",
  },
  {
    datum: "2026-11-15",
    titel: "Terminangebot aus „Vorsorge fällig“",
    text: "Aus der Liste „Vorsorge fällig“ kann die Praxis eine Erinnerung mit Terminangebot verschicken. Der Patient sieht über den Link nur freie Zeiten und bucht selbst.",
    fuerWen: "Empfang, Vorsorge",
  },
  {
    datum: "2026-11-15",
    titel: "Schnellvorschlag ohne Akte",
    text: "Ein Vorschlag lässt sich mit einem Kürzel anlegen, ohne Namen und ohne Geburtsdatum. Das hilft, wenn im Gespräch schnell die Kosten gezeigt werden sollen.",
    fuerWen: "Behandelnde, Empfang",
  },
  {
    datum: "2026-11-14",
    titel: "Suche mit Strg+K",
    text: "Mit Strg+K (am Mac ⌘K) öffnet sich eine Suche nach Namen, Geburtsdatum, Rechnungsnummern und Seiten der Anwendung. Befunde, Notizen und Berichte werden dabei nicht durchsucht.",
    fuerWen: "Alle im Praxisteam",
  },
  {
    datum: "2026-11-14",
    titel: "Drei öffentliche Rechner",
    text: "Auf der Website stehen drei Rechner: Zuzahlung 2027, Eigenanteil bei Zahnersatz und GOÄ-Rechnung. Sie rechnen im Browser mit denselben Regeln wie die Vorschläge in der Anwendung.",
    fuerWen: "Patienten, Praxisteams",
    link: { href: "/rechner", name: "Zu den Rechnern" },
  },
  {
    datum: "2026-11-13",
    titel: "Zuzahlungen 2027 im Regelwerk",
    text: "Die gesetzlichen Zuzahlungen für Heilmittel und Hilfsmittel ab 1.1.2027 sind hinterlegt. Vorschläge rechnen je nach Tagesdatum mit den bisherigen oder den neuen Sätzen.",
    fuerWen: "Therapiepraxen, Sanitätshäuser, Arztpraxen",
    link: { href: "/ratgeber/zuzahlungen-2027", name: "Ratgeber: Zuzahlungen 2027" },
  },
  {
    datum: "2026-11-13",
    titel: "Vorschlag in sieben Sprachen",
    text: "Patienten lesen ihren Behandlungsvorschlag auf Deutsch, Englisch, Türkisch, Ukrainisch, Russisch, Polnisch oder Arabisch. Maßgeblich bleiben die deutsche Fassung und das Gespräch in der Praxis.",
    fuerWen: "Patienten, Empfang",
  },
];

/** Einträge nach Datum, neueste zuerst; innerhalb eines Tages in der Reihenfolge der Liste. */
export const neuigkeitenSortiert = (liste: Neuigkeit[] = NEUIGKEITEN): Neuigkeit[] =>
  liste.map((n, i) => ({ n, i })).sort((a, b) => (a.n.datum < b.n.datum ? 1 : a.n.datum > b.n.datum ? -1 : a.i - b.i)).map((x) => x.n);

/** Nach Tagen gruppiert, neueste zuerst. */
export function neuigkeitenNachTagen(liste: Neuigkeit[] = NEUIGKEITEN): { datum: string; eintraege: Neuigkeit[] }[] {
  const out: { datum: string; eintraege: Neuigkeit[] }[] = [];
  for (const n of neuigkeitenSortiert(liste)) {
    const letzter = out[out.length - 1];
    if (letzter?.datum === n.datum) letzter.eintraege.push(n);
    else out.push({ datum: n.datum, eintraege: [n] });
  }
  return out;
}

/** „15. November 2026“ */
export const neuigkeitDatum = (datum: string) => new Date(`${datum}T12:00:00Z`).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
