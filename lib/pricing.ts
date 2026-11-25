// Preise an einer Stelle, damit Website, Fachseiten und FAQ nie
// auseinanderlaufen. Begründung und Quellen im Vault (Preise 2026).
// Nach § 19 UStG (Kleinunternehmerregelung) wird derzeit keine Umsatzsteuer berechnet.
// Texte nach der rechtlichen Vorprüfung (A20, A21, T9): keine Testphase, keine Jahreszahlung und keine
// Preisgarantie versprechen, solange es dafür weder Vertrag noch Abrechnung gibt.

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
    // Die Standorte stehen in der Liste darunter: So bleibt die Zeile einzeilig und die drei Preise stehen auf einer Höhe.
    fuer: "ab 6 Behandelnden",
    punkte: ["Alles aus Praxis", "Mehrere Standorte mit Terminen und Auslastung je Standort", "Schulung vor Ort", "Fester Ansprechpartner"],
  },
] as const;

export const eur = (n: number) => `${n.toLocaleString("de-DE")} €`;

/** Kurzfassung für Fließtext und FAQ. */
export const PRICE_SHORT = `${eur(PLANS[0].preis)} im Monat für Einzelpraxen, ${eur(PLANS[1].preis)} für bis zu fünf Behandelnde, MVZ ab ${eur(PLANS[2].preis)}`;
export const PRICE_TERMS = `Alles enthalten, ohne Zähler. Geplante Preise ab dem allgemeinen Start; bis dahin nehmen wir nur Pilotpraxen auf. Einrichtung einmalig ${eur(SETUP_EUR)}, für Pilotpraxen kostenlos.`;
/** Wie lange Sorrida für Pilotpraxen kostenlos ist. */
const PILOT_DAUER = "drei Monate";
/** Kurzform für Stellen, an denen bisher „30 Tage kostenlos“ stand. */
export const PILOT_KURZ = `Für Pilotpraxen ${PILOT_DAUER} kostenlos`;
/** Dasselbe als ganzer Satz, für Antworten in ganzen Sätzen (Frag Sorrida). */
export const PILOT_SATZ = `Für Pilotpraxen ist Sorrida ${PILOT_DAUER} kostenlos.`;
/** Aus Sicht der einzelnen Praxis, für die Überschrift am Schluss der Startseite. */
export const PILOT_ALS_PRAXIS = `Als Pilotpraxis ${PILOT_DAUER} kostenlos`;
/** Zeile über der Preistabelle: Der Pilot kostet nichts, die Preise gelten erst später. */
export const PILOT_PREISZEILE = `${PILOT_KURZ}. Die Preise gelten ab dem allgemeinen Start.`;
/** Der Einstiegspreis in einem Satz, für den Schluss der Startseite. */
export const PREIS_AB_START = `Geplante Preise ab dem allgemeinen Start: ab ${eur(PLANS[0].preis)} im Monat.`;
/** Wohin „Pilotplatz anfragen“ führt, wenn die Seite selbst kein Anfrageformular hat. */
export const PILOT_ZIEL = "/hilfe#pilot";
// Die frühere Zusage „die Preise bleiben auch danach Endpreise, ohne Aufschlag“ steht hier bewusst nicht mehr:
// Sie wäre eine bindende Preisgarantie. Sie kommt erst wieder hinein, wenn sie mit der Steuerberatung
// durchgerechnet und im Nutzungsvertrag geregelt ist.
export const VAT_NOTE = "Angebot nur für Praxen und andere Unternehmer (§ 14 BGB), nicht für Verbraucher. Die genannten Beträge sind die Preise, die Sie zahlen: Nach § 19 UStG berechnen wir derzeit keine Umsatzsteuer.";
