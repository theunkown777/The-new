import { z } from "zod";

// DATEV-Export (Buchungsstapel im Format EXTF, Version 700, Kategorie 21,
// Formatversion 13) für die Steuerberatung: Rechnungen als Forderung und
// Zahlungseingänge als Ausgleich. Aufbau nach der DATEV-Beispieldatei
// EXTF_Buchungsstapel.csv: Kopfzeile mit 31 Feldern, Spaltenzeile mit 125
// Spalten, Semikolon, Text in Anführungszeichen, Dezimalkomma, Windows-1252,
// Zeilenende CR LF. Kontenrahmen und Konten stimmt die Praxis mit ihrer
// Steuerberatung ab; die Vorgaben unten sind übliche SKR03-Konten.
// Buchungstexte enthalten keine Diagnosen und keine Behandlungen.

export const DATEV_SPALTEN = [
  "Umsatz (ohne Soll/Haben-Kz)",
  "Soll/Haben-Kennzeichen",
  "WKZ Umsatz",
  "Kurs",
  "Basisumsatz",
  "WKZ Basisumsatz",
  "Konto",
  "Gegenkonto (ohne BU-Schlüssel)",
  "BU-Schlüssel",
  "Belegdatum",
  "Belegfeld 1",
  "Belegfeld 2",
  "Skonto",
  "Buchungstext",
  "Postensperre",
  "Diverse Adressnummer",
  "Geschäftspartnerbank",
  "Sachverhalt",
  "Zinssperre",
  "Beleglink",
  "Beleginfo – Art 1",
  "Beleginfo – Inhalt 1",
  "Beleginfo – Art 2",
  "Beleginfo – Inhalt 2",
  "Beleginfo – Art 3",
  "Beleginfo – Inhalt 3",
  "Beleginfo – Art 4",
  "Beleginfo – Inhalt 4",
  "Beleginfo – Art 5",
  "Beleginfo – Inhalt 5",
  "Beleginfo – Art 6",
  "Beleginfo – Inhalt 6",
  "Beleginfo – Art 7",
  "Beleginfo – Inhalt 7",
  "Beleginfo – Art 8",
  "Beleginfo – Inhalt 8",
  "KOST1 – Kostenstelle",
  "KOST2 – Kostenstelle",
  "Kost Menge",
  "EU-Land u. USt-IdNr.",
  "EU-Steuersatz",
  "Abw. Versteuerungsart",
  "Sachverhalt L+L",
  "Funktionsergänzung L+L",
  "BU 49 Hauptfunktionstyp",
  "BU 49 Hauptfunktionsnummer",
  "BU 49 Funktionsergänzung",
  "Zusatzinformation – Art 1",
  "Zusatzinformation – Inhalt 1",
  "Zusatzinformation – Art 2",
  "Zusatzinformation – Inhalt 2",
  "Zusatzinformation – Art 3",
  "Zusatzinformation – Inhalt 3",
  "Zusatzinformation – Art 4",
  "Zusatzinformation – Inhalt 4",
  "Zusatzinformation – Art 5",
  "Zusatzinformation – Inhalt 5",
  "Zusatzinformation – Art 6",
  "Zusatzinformation – Inhalt 6",
  "Zusatzinformation – Art 7",
  "Zusatzinformation – Inhalt 7",
  "Zusatzinformation – Art 8",
  "Zusatzinformation – Inhalt 8",
  "Zusatzinformation – Art 9",
  "Zusatzinformation – Inhalt 9",
  "Zusatzinformation – Art 10",
  "Zusatzinformation – Inhalt 10",
  "Zusatzinformation – Art 11",
  "Zusatzinformation – Inhalt 11",
  "Zusatzinformation – Art 12",
  "Zusatzinformation – Inhalt 12",
  "Zusatzinformation – Art 13",
  "Zusatzinformation – Inhalt 13",
  "Zusatzinformation – Art 14",
  "Zusatzinformation – Inhalt 14",
  "Zusatzinformation – Art 15",
  "Zusatzinformation – Inhalt 15",
  "Zusatzinformation – Art 16",
  "Zusatzinformation – Inhalt 16",
  "Zusatzinformation – Art 17",
  "Zusatzinformation – Inhalt 17",
  "Zusatzinformation – Art 18",
  "Zusatzinformation – Inhalt 18",
  "Zusatzinformation – Art 19",
  "Zusatzinformation – Inhalt 19",
  "Zusatzinformation – Art 20",
  "Zusatzinformation – Inhalt 20",
  "Stück",
  "Gewicht",
  "Zahlweise",
  "Forderungsart",
  "Veranlagungsjahr",
  "Zugeordnete Fälligkeit",
  "Skontotyp",
  "Auftragsnummer",
  "Buchungstyp",
  "USt-Schlüssel (Anzahlungen)",
  "EU-Mitgliedstaat (Anzahlungen)",
  "Sachverhalt L+L (Anzahlungen)",
  "EU-Steuersatz (Anzahlungen)",
  "Erlöskonto (Anzahlungen)",
  "Herkunft-Kz",
  "Leerfeld",
  "KOST-Datum",
  "SEPA-Mandatsreferenz",
  "Skontosperre",
  "Gesellschaftername",
  "Beteiligtennummer",
  "Identifikationsnummer",
  "Zeichnernummer",
  "Postensperre bis",
  "Bezeichnung",
  "Kennzeichen",
  "Festschreibung",
  "Leistungsdatum",
  "Datum Zuord.",
  "Fälligkeit",
  "Generalumkehr",
  "Steuersatz",
  "Land",
  "Abrechnungsreferent",
  "BVV-Position",
  "EU-Mitgliedstaat u. UStID (Ursprung)",
  "EU-Steuersatz (Ursprung)",
  "Abw. Skontokonto",
] as const;

export const datevSchema = z.object({
  beraternummer: z.coerce.number().int().min(1001, "Beraternummer: 1001 bis 9999999").max(9999999),
  mandantennummer: z.coerce.number().int().min(1, "Mandantennummer: 1 bis 99999").max(99999),
  sachkontenlaenge: z.coerce.number().int().min(4).max(8).default(4),
  /** Erlöse steuerfreie Heilbehandlung (SKR03 z. B. 8100) */
  erloeskonto: z.coerce.number().int().min(1).max(99999999).default(8100),
  /** Bank (SKR03 1200) */
  bankkonto: z.coerce.number().int().min(1).max(99999999).default(1200),
  /** Sammeldebitor für Patientinnen und Patienten (Personenkonto, z. B. 10000) */
  debitor: z.coerce.number().int().min(1).max(999999999).default(10000),
  /** Kürzel, das im Kopf als "Exportiert von" steht */
  kuerzel: z.string().trim().max(25).default("Sorrida"),
});
export type DatevEinstellungen = z.infer<typeof datevSchema>;

export type DatevRechnung = { number: string; amountCent: number; status: string; createdAt: Date; paidAt: Date | null };

const text = (s: string) => `"${s.replace(/"/g, '""')}"`;
const betrag = (cent: number) => (cent / 100).toFixed(2).replace(".", ",");
const ddmm = (d: Date) => `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}`;
const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
/** Belegfeld 1: höchstens 36 Zeichen aus A–Z, 0–9 und $ & % * + - / */
export const belegfeld = (s: string) => s.toUpperCase().replace(/[^A-Z0-9$&%*+\-/]/g, "").slice(0, 36);

export type Buchung = { cent: number; sh: "S" | "H"; konto: number; gegenkonto: number; datum: Date; beleg: string; text: string };

/**
 * Buchungen eines Zeitraums: je Rechnung (außer storniert) eine Forderung
 * Debitor an Erlöse; je bezahlter Rechnung ein Zahlungseingang Bank an Debitor.
 * Es zählt das Datum im Zeitraum (Rechnungsdatum bzw. Zahlungsdatum).
 */
export function datevBuchungen(rechnungen: DatevRechnung[], e: DatevEinstellungen, von: Date, bis: Date): Buchung[] {
  const imZeitraum = (d: Date) => d >= von && d <= bis;
  const out: Buchung[] = [];
  for (const r of rechnungen) {
    if (r.status !== "STORNIERT" && imZeitraum(r.createdAt))
      out.push({ cent: r.amountCent, sh: "S", konto: e.debitor, gegenkonto: e.erloeskonto, datum: r.createdAt, beleg: belegfeld(r.number), text: `Honorar Rg. ${r.number}` });
    if (r.status === "BEZAHLT" && r.paidAt && imZeitraum(r.paidAt))
      out.push({ cent: r.amountCent, sh: "S", konto: e.bankkonto, gegenkonto: e.debitor, datum: r.paidAt, beleg: belegfeld(r.number), text: `Zahlungseingang Rg. ${r.number}` });
  }
  return out.sort((a, b) => a.datum.getTime() - b.datum.getTime());
}

/** Komplette Datei als Text (vor der Umwandlung in Windows-1252). */
export function datevStapel(buchungen: Buchung[], e: DatevEinstellungen, von: Date, bis: Date, now = new Date()): string {
  const erzeugt = `${ymd(now)}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}${String(now.getMilliseconds()).padStart(3, "0")}`;
  const kopf = [
    text("EXTF"), "700", "21", text("Buchungsstapel"), "13", erzeugt, "", text("SO"), text(e.kuerzel), "",
    String(e.beraternummer), String(e.mandantennummer), `${von.getFullYear()}0101`, String(e.sachkontenlaenge), ymd(von), ymd(bis),
    text(`Sorrida ${ymd(von)}-${ymd(bis)}`.slice(0, 30)), "", "1", "", "0", text("EUR"), "", "", "", "", "", "", "", "", "",
  ];
  const leer = Array(DATEV_SPALTEN.length - 14).fill("");
  const zeilen = buchungen.map((b) =>
    [betrag(b.cent), text(b.sh), "", "", "", "", String(b.konto), String(b.gegenkonto), "", ddmm(b.datum), text(b.beleg), "", "", text(b.text.slice(0, 60)), ...leer].join(";"),
  );
  return [kopf.join(";"), DATEV_SPALTEN.join(";"), ...zeilen].join("\r\n") + "\r\n";
}

/** Windows-1252: Latin-1 direkt, dazu € und Gedankenstriche; alles andere wird "?". */
const CP1252: Record<string, number> = { "€": 0x80, "‚": 0x82, "„": 0x84, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "–": 0x96, "—": 0x97 };
export function alsWindows1252(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  let i = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    out[i++] = c < 0x80 || (c >= 0xa0 && c <= 0xff) ? c : CP1252[ch] ?? 0x3f;
  }
  return out.slice(0, i);
}

export const datevDateiname = (von: Date, bis: Date) => `EXTF_Buchungsstapel_${ymd(von)}_${ymd(bis)}.csv`;
