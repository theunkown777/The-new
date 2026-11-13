// Preise an einer Stelle, damit Website, Fachseiten und FAQ nie
// auseinanderlaufen. Begründung und Quellen im Vault (Preise 2026).
// Endpreise; nach § 19 UStG (Kleinunternehmerregelung) keine Umsatzsteuer.

export const SETUP_EUR = 390;

export const PLANS = [
  {
    id: "einzel",
    name: "Einzelpraxis",
    preis: 249,
    ab: false,
    fuer: "1 Behandelnde/r",
    punkte: ["Vorschläge mit Kassenleistung zuerst", "Patienten-Link und Behandlungsweg für Patienten", "Rechnungen mit GiroCode, Zahlungsübersicht", "Digitale Anamnese, Befund-Diktat", "Analyse: Umsatz, Gründe, Risiken"],
  },
  {
    id: "praxis",
    name: "Praxis",
    preis: 449,
    ab: false,
    fuer: "2 bis 5 Behandelnde",
    punkte: ["Alles aus Einzelpraxis", "Zugänge für das ganze Team", "Anbindung an Ihre Praxissoftware", "Analyse je Leistung, eigener Bereich je Behandler/in", "Persönliche Einrichtung inklusive"],
  },
  {
    id: "mvz",
    name: "MVZ und Praxisgruppe",
    preis: 790,
    ab: true,
    fuer: "ab 6 Behandelnden, mehrere Standorte",
    punkte: ["Alles aus Praxis", "Mehrere Standorte mit Terminen und Auslastung je Standort", "Schulung vor Ort", "Fester Ansprechpartner"],
  },
] as const;

export const eur = (n: number) => `${n.toLocaleString("de-DE")} €`;

/** Kurzfassung für Fließtext und FAQ. */
export const PRICE_SHORT = `${eur(PLANS[0].preis)} im Monat für Einzelpraxen, ${eur(PLANS[1].preis)} für bis zu fünf Behandelnde, MVZ ab ${eur(PLANS[2].preis)}`;
export const PRICE_TERMS = `Alles enthalten, ohne Zähler. 30 Tage kostenlos, monatlich kündbar, bei jährlicher Zahlung zwei Monate geschenkt. Einrichtung einmalig ${eur(SETUP_EUR)}, für Pilotpraxen kostenlos.`;
// Preisgarantie: Die Beträge bleiben Endpreise, auch wenn Sorrida später
// umsatzsteuerpflichtig wird. Heilberufe können Vorsteuer meist nicht
// abziehen; ein späterer Aufschlag von 19 % wäre für sie eine echte
// Preiserhöhung. Die Kalkulation trägt die Steuer (siehe Vault-Notiz).
export const VAT_NOTE = "Endpreise. Derzeit nach § 19 UStG (Kleinunternehmerregelung) ohne Umsatzsteuer; die Preise bleiben auch danach Endpreise, ohne Aufschlag.";
